import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDb } from '../db/connection.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docDir = path.join(__dirname, '..', 'uploads', 'documents');
fs.mkdirSync(docDir, { recursive: true });

const router = Router();

// Multer config for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, docDir),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  },
});

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed. Accepted: PDF, Word, Excel, PowerPoint, TXT, CSV'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// Helper: generate a URL-friendly slug from title or filename
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/\.[^.]+$/, '') // strip file extension
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// GET / — List all documents (authenticated)
router.get('/', verifyToken, (req, res) => {
  const db = getDb();
  const { search, category } = req.query;

  let query = 'SELECT * FROM documents WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (title LIKE ? OR original_name LIKE ? OR slug LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (category && category !== 'all') {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY uploaded_at DESC';
  const docs = db.prepare(query).all(...params);
  res.json(docs);
});

// POST /upload — Upload a document (admin only)
router.post('/upload', verifyToken, requireRole('admin'), (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const db = getDb();
    const { title, category, slug: customSlug } = req.body;
    const displayTitle = title || req.file.originalname.replace(/\.[^.]+$/, '');
    const baseSlug = customSlug || slugify(displayTitle);

    // Ensure unique slug
    let slug = baseSlug;
    let counter = 1;
    while (db.prepare('SELECT id FROM documents WHERE slug = ?').get(slug)) {
      slug = `${baseSlug}-${counter++}`;
    }

    const result = db.prepare(
      `INSERT INTO documents (filename, original_name, file_path, mime_type, size_bytes, slug, title, category, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      req.file.filename,
      req.file.originalname,
      req.file.path,
      req.file.mimetype,
      req.file.size,
      slug,
      displayTitle,
      category || 'general',
      req.user.id
    );

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(doc);
  });
});

// PUT /:id — Update document metadata (admin only)
router.put('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const db = getDb();
  const { title, slug, category } = req.body;
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);

  if (!doc) return res.status(404).json({ error: 'Document not found' });

  // If slug is changing, check uniqueness
  if (slug && slug !== doc.slug) {
    const existing = db.prepare('SELECT id FROM documents WHERE slug = ? AND id != ?').get(slug, doc.id);
    if (existing) return res.status(409).json({ error: 'Slug already in use' });
  }

  db.prepare(
    'UPDATE documents SET title = ?, slug = ?, category = ? WHERE id = ?'
  ).run(
    title ?? doc.title,
    slug ?? doc.slug,
    category ?? doc.category,
    doc.id
  );

  const updated = db.prepare('SELECT * FROM documents WHERE id = ?').get(doc.id);
  res.json(updated);
});

// DELETE /:id — Delete document (admin only)
router.delete('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  // Delete file from disk
  try {
    if (fs.existsSync(doc.file_path)) {
      fs.unlinkSync(doc.file_path);
    }
  } catch (e) {
    console.error('Failed to delete document file:', e.message);
  }

  db.prepare('DELETE FROM documents WHERE id = ?').run(doc.id);
  res.json({ success: true });
});

// GET /file/:slug — Public download endpoint (no auth required)
router.get('/file/:slug', (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT * FROM documents WHERE slug = ?').get(req.params.slug);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const filePath = doc.file_path;
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found on disk' });
  }

  res.set('Content-Type', doc.mime_type);
  res.set('Content-Disposition', `inline; filename="${doc.original_name}"`);
  res.set('Cache-Control', 'public, max-age=86400');
  res.sendFile(filePath);
});

export default router;
