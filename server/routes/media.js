import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDb } from '../db/connection.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { upload } from '../middleware/upload.js';
import { processImage } from '../services/imageProcessor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const optimizedDir = path.join(__dirname, '..', 'optimized');

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
    res.status(500).json({ error: 'Image processing failed', details: err.message });
  }
});

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
