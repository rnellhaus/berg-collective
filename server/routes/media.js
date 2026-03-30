import { Router } from 'express';
import dns from 'dns/promises';
import { getPool } from '../db/connection.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { upload } from '../middleware/upload.js';
import { processImage } from '../services/imageProcessor.js';
import { del } from '@vercel/blob';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_IMPORT_SIZE = 10 * 1024 * 1024; // 10 MB
const IMPORT_TIMEOUT_MS = 30_000; // 30 seconds

function isPrivateIP(ip) {
  // IPv4-mapped IPv6
  const v4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  const parts = v4.split('.').map(Number);
  if (parts.length === 4) {
    if (parts[0] === 10) return true;                              // 10.0.0.0/8
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true;        // 192.168.0.0/16
    if (parts[0] === 127) return true;                             // 127.0.0.0/8
    if (parts[0] === 169 && parts[1] === 254) return true;        // 169.254.0.0/16
    if (parts[0] === 0) return true;                               // 0.0.0.0/8
  }
  // IPv6 loopback and link-local
  if (ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) return true;
  return false;
}

function resolveShareUrl(url) {
  // Google Drive share links → direct download
  // Format: https://drive.google.com/file/d/FILE_ID/view?...
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
  }
  // Google Drive open links
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (driveOpenMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveOpenMatch[1]}`;
  }
  // Dropbox share links: change dl=0 to dl=1
  if (url.includes('dropbox.com')) {
    const u = new URL(url);
    u.searchParams.set('dl', '1');
    return u.toString();
  }
  return url;
}

function extFromMime(mime) {
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/heif': '.heif',
  };
  return map[mime] || '.jpg';
}

const router = Router();

// GET / — List all media
router.get('/', verifyToken, async (req, res) => {
  const pool = getPool();
  const { search, category } = req.query;

  let query = 'SELECT * FROM media WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (search) {
    query += ` AND filename ILIKE $${paramIndex++}`;
    params.push(`%${search}%`);
  }
  if (category) {
    query += ` AND category = $${paramIndex++}`;
    params.push(category);
  }

  query += ' ORDER BY uploaded_at DESC';

  const { rows: media } = await pool.query(query, params);

  const { rows: savingsRows } = await pool.query(
    'SELECT SUM(size_bytes - webp_size_bytes) as totalSavings FROM media WHERE size_bytes IS NOT NULL AND webp_size_bytes IS NOT NULL'
  );

  res.json({ media, totalSavings: savingsRows[0].totalsavings || 0 });
});

// POST /upload — Upload and process image
router.post('/upload', verifyToken, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  const pool = getPool();

  // Insert placeholder row to get ID
  const { rows: insertRows } = await pool.query(
    'INSERT INTO media (filename, original_path, uploaded_by) VALUES ($1, $2, $3) RETURNING id',
    [req.file.originalname, 'blob', req.user.id]
  );
  const mediaId = insertRows[0].id;

  try {
    const processed = await processImage(req.file.buffer, mediaId, req.file.originalname);

    await pool.query(
      `UPDATE media SET
        webp_thumb = $1,
        webp_medium = $2,
        webp_full = $3,
        jpg_fallback = $4,
        width = $5,
        height = $6,
        size_bytes = $7,
        webp_size_bytes = $8,
        alt_text = $9,
        category = $10
      WHERE id = $11`,
      [
        processed.webp_thumb,
        processed.webp_medium,
        processed.webp_full,
        processed.jpg_fallback,
        processed.width,
        processed.height,
        processed.size_bytes,
        processed.webp_size_bytes,
        req.body.alt_text || '',
        req.body.category || null,
        mediaId,
      ]
    );

    const { rows } = await pool.query('SELECT * FROM media WHERE id = $1', [mediaId]);
    res.status(201).json({ media: rows[0] });
  } catch (err) {
    // Clean up placeholder on failure
    await pool.query('DELETE FROM media WHERE id = $1', [mediaId]);
    console.error('Image processing error:', err);
    res.status(500).json({ error: 'Image processing failed' });
  }
});

// POST /import-url — Download image from URL and process it
router.post('/import-url', verifyToken, requireRole('admin'), async (req, res) => {
  const { url, alt_text, category } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'A valid URL is required' });
  }

  // Resolve cloud storage share links to direct download URLs
  let downloadUrl = url.trim();
  try {
    downloadUrl = resolveShareUrl(downloadUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(downloadUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: 'Only HTTP and HTTPS URLs are supported' });
  }

  // SSRF protection: resolve hostname and reject private/reserved IPs
  try {
    const { address } = await dns.lookup(parsedUrl.hostname);
    if (isPrivateIP(address)) {
      return res.status(400).json({ error: 'URLs pointing to private/internal addresses are not allowed' });
    }
  } catch {
    return res.status(400).json({ error: 'Could not resolve hostname' });
  }

  const pool = getPool();
  let mediaId = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMPORT_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(downloadUrl, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'BERG-MediaImporter/1.0' },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      response.body?.cancel().catch(() => {});
      return res.status(422).json({ error: `Failed to download image (HTTP ${response.status})` });
    }

    // Validate content type
    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      response.body?.cancel().catch(() => {});
      return res.status(422).json({
        error: `Unsupported content type: ${contentType || 'unknown'}. Allowed: JPG, PNG, WebP, HEIC`,
      });
    }

    // Check content length if provided
    const contentLength = parseInt(response.headers.get('content-length'), 10);
    if (contentLength && contentLength > MAX_IMPORT_SIZE) {
      response.body?.cancel().catch(() => {});
      return res.status(422).json({ error: `Image too large (${Math.round(contentLength / 1024 / 1024)}MB). Maximum is 10 MB` });
    }

    // Derive a filename from the URL
    const urlPath = parsedUrl.pathname;
    const ext = extFromMime(contentType);
    let baseName = urlPath.split('/').pop().replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!baseName || baseName === '_' || !/\.[^.]+$/.test(baseName)) {
      baseName = `imported-${Date.now()}${ext}`;
    }

    // Collect response into a Buffer, enforcing size limit
    const chunks = [];
    let bytesWritten = 0;
    const body = response.body;
    const reader = body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytesWritten += value.length;
        if (bytesWritten > MAX_IMPORT_SIZE) throw new Error('Image exceeds 10 MB size limit');
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const buffer = Buffer.concat(chunks);

    // Insert placeholder row
    const { rows: insertRows } = await pool.query(
      'INSERT INTO media (filename, original_path, uploaded_by) VALUES ($1, $2, $3) RETURNING id',
      [baseName, 'blob', req.user.id]
    );
    mediaId = insertRows[0].id;

    // Process through Sharp pipeline
    const processed = await processImage(buffer, mediaId, baseName);

    await pool.query(
      `UPDATE media SET
        webp_thumb = $1,
        webp_medium = $2,
        webp_full = $3,
        jpg_fallback = $4,
        width = $5,
        height = $6,
        size_bytes = $7,
        webp_size_bytes = $8,
        alt_text = $9,
        category = $10
      WHERE id = $11`,
      [
        processed.webp_thumb,
        processed.webp_medium,
        processed.webp_full,
        processed.jpg_fallback,
        processed.width,
        processed.height,
        processed.size_bytes,
        processed.webp_size_bytes,
        alt_text || '',
        category || null,
        mediaId,
      ]
    );

    const { rows } = await pool.query('SELECT * FROM media WHERE id = $1', [mediaId]);
    res.status(201).json({ media: rows[0] });
  } catch (err) {
    // Clean up on failure
    if (mediaId) await pool.query('DELETE FROM media WHERE id = $1', [mediaId]);
    console.error('URL import error:', err);

    if (err.name === 'AbortError') {
      return res.status(422).json({ error: 'Download timed out (30s limit)' });
    }
    res.status(500).json({ error: 'Image import failed' });
  }
});

// PUT /:id — Update alt_text and category
router.put('/:id', verifyToken, async (req, res) => {
  const pool = getPool();
  const { alt_text, category } = req.body;

  const { rows } = await pool.query('SELECT * FROM media WHERE id = $1', [req.params.id]);
  const media = rows[0];
  if (!media) return res.status(404).json({ error: 'Media not found' });

  await pool.query('UPDATE media SET alt_text = $1, category = $2 WHERE id = $3', [
    alt_text !== undefined ? alt_text : media.alt_text,
    category !== undefined ? category : media.category,
    req.params.id,
  ]);

  const { rows: updatedRows } = await pool.query('SELECT * FROM media WHERE id = $1', [req.params.id]);
  res.json({ media: updatedRows[0] });
});

// DELETE /:id — Delete image and all Blob variants (admin only)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM media WHERE id = $1', [req.params.id]);
  const media = rows[0];
  if (!media) return res.status(404).json({ error: 'Media not found' });

  // Delete Blob variants
  const urls = [media.webp_thumb, media.webp_medium, media.webp_full, media.jpg_fallback].filter(Boolean);
  if (urls.length > 0) await del(urls);

  await pool.query('DELETE FROM media WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// GET /file/:size/:filename — Serve optimized image (compatibility endpoint, redirects to Blob URL)
router.get('/file/:size/:filename', async (req, res) => {
  const { size, filename } = req.params;

  const COLUMN_MAP = { thumb: 'webp_thumb', medium: 'webp_medium', full: 'webp_full', fallback: 'jpg_fallback' };
  const column = COLUMN_MAP[size];
  if (!column) return res.status(400).json({ error: 'Invalid size' });

  const pool = getPool();

  // Search for media whose blob URL ends with this filename
  const { rows } = await pool.query(
    `SELECT ${column} as url FROM media WHERE ${column} ILIKE $1 LIMIT 1`,
    [`%${filename}`]
  );

  if (!rows[0]?.url) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.redirect(rows[0].url);
});

export default router;
