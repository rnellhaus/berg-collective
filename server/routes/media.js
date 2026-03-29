import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import dns from 'dns/promises';
import { fileURLToPath } from 'url';
import { getDb } from '../db/connection.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { upload } from '../middleware/upload.js';
import { processImage } from '../services/imageProcessor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const optimizedDir = path.join(__dirname, '..', 'optimized');
const uploadDir = path.join(__dirname, '..', 'uploads');

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

const router = Router();

// GET / — List all media
router.get('/', verifyToken, (req, res) => {
  const db = getDb();
  const { search, category } = req.query;

  let query = 'SELECT * FROM media WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND filename LIKE ?';
    params.push(`%${search}%`);
  }
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY uploaded_at DESC';

  const media = db.prepare(query).all(...params);

  const savingsRow = db
    .prepare('SELECT SUM(size_bytes - webp_size_bytes) as totalSavings FROM media WHERE size_bytes IS NOT NULL AND webp_size_bytes IS NOT NULL')
    .get();

  res.json({ media, totalSavings: savingsRow.totalSavings || 0 });
});

// POST /upload — Upload and process image
router.post('/upload', verifyToken, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  const db = getDb();

  // Insert placeholder row to get ID
  const insert = db
    .prepare('INSERT INTO media (filename, original_path, uploaded_by) VALUES (?, ?, ?)')
    .run(req.file.originalname, req.file.path, req.user.id);

  const mediaId = insert.lastInsertRowid;

  try {
    const processed = await processImage(req.file.path, mediaId, req.file.originalname);

    db.prepare(`
      UPDATE media SET
        webp_thumb = ?,
        webp_medium = ?,
        webp_full = ?,
        jpg_fallback = ?,
        width = ?,
        height = ?,
        size_bytes = ?,
        webp_size_bytes = ?,
        alt_text = ?,
        category = ?
      WHERE id = ?
    `).run(
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
      mediaId
    );

    const media = db.prepare('SELECT * FROM media WHERE id = ?').get(mediaId);
    res.status(201).json({ media });
  } catch (err) {
    // Clean up placeholder on failure
    db.prepare('DELETE FROM media WHERE id = ?').run(mediaId);
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

  const db = getDb();
  let tempPath = null;
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
    let baseName = path.basename(urlPath).replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!baseName || baseName === '_' || !path.extname(baseName)) {
      baseName = `imported-${Date.now()}${ext}`;
    }

    // Stream to temp file, enforcing size limit
    const timestamp = Date.now();
    const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
    tempPath = path.join(uploadDir, `${timestamp}-${safeName}`);

    const fileStream = fs.createWriteStream(tempPath);
    let bytesWritten = 0;

    const body = response.body;
    const reader = body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytesWritten += value.length;
        if (bytesWritten > MAX_IMPORT_SIZE) {
          fileStream.destroy();
          throw new Error('Image exceeds 10 MB size limit');
        }
        fileStream.write(value);
      }
    } finally {
      reader.releaseLock();
    }

    await new Promise((resolve, reject) => {
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
      fileStream.end();
    });

    // Insert placeholder row
    const insert = db
      .prepare('INSERT INTO media (filename, original_path, uploaded_by) VALUES (?, ?, ?)')
      .run(baseName, tempPath, req.user.id);
    mediaId = insert.lastInsertRowid;

    // Process through Sharp pipeline
    const processed = await processImage(tempPath, mediaId, baseName);

    db.prepare(`
      UPDATE media SET
        webp_thumb = ?,
        webp_medium = ?,
        webp_full = ?,
        jpg_fallback = ?,
        width = ?,
        height = ?,
        size_bytes = ?,
        webp_size_bytes = ?,
        alt_text = ?,
        category = ?
      WHERE id = ?
    `).run(
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
      mediaId
    );

    const media = db.prepare('SELECT * FROM media WHERE id = ?').get(mediaId);
    res.status(201).json({ media });
  } catch (err) {
    // Clean up on failure
    if (mediaId) db.prepare('DELETE FROM media WHERE id = ?').run(mediaId);
    if (tempPath) {
      try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
    }
    console.error('URL import error:', err);

    if (err.name === 'AbortError') {
      return res.status(422).json({ error: 'Download timed out (30s limit)' });
    }
    res.status(500).json({ error: 'Image import failed' });
  }
});

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

// PUT /:id — Update alt_text and category
router.put('/:id', verifyToken, (req, res) => {
  const db = getDb();
  const { alt_text, category } = req.body;

  const media = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
  if (!media) return res.status(404).json({ error: 'Media not found' });

  db.prepare('UPDATE media SET alt_text = ?, category = ? WHERE id = ?').run(
    alt_text !== undefined ? alt_text : media.alt_text,
    category !== undefined ? category : media.category,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
  res.json({ media: updated });
});

// DELETE /:id — Delete image and all file variants (admin only)
router.delete('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const db = getDb();
  const media = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
  if (!media) return res.status(404).json({ error: 'Media not found' });

  // Delete file variants
  const variants = [media.webp_thumb, media.webp_medium, media.webp_full, media.jpg_fallback];
  for (const variant of variants) {
    if (variant) {
      const filePath = path.join(optimizedDir, variant);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {
        // ignore individual file deletion errors
      }
    }
  }

  // Delete original upload
  if (media.original_path) {
    try {
      if (fs.existsSync(media.original_path)) fs.unlinkSync(media.original_path);
    } catch (e) {
      // ignore
    }
  }

  db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// GET /file/:size/:filename — Serve optimized image (public)
router.get('/file/:size/:filename', (req, res) => {
  const { size, filename } = req.params;
  const validSizes = ['thumb', 'medium', 'full', 'fallback'];

  if (!validSizes.includes(size)) {
    return res.status(400).json({ error: 'Invalid size. Must be: thumb, medium, full, fallback' });
  }

  const filePath = path.join(optimizedDir, size, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType = ext === '.webp' ? 'image/webp' : 'image/jpeg';

  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('Content-Type', contentType);
  res.sendFile(filePath);
});

export default router;
