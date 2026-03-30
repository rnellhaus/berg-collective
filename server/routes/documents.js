import { Router } from 'express';
import multer from 'multer';
import { getPool } from '../db/connection.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { put, del } from '@vercel/blob';

const router = Router();

// Multer config for document uploads — memory storage for Vercel Blob
const storage = multer.memoryStorage();

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
router.get('/', verifyToken, async (req, res) => {
  const pool = getPool();
  const { search, category } = req.query;

  let query = 'SELECT * FROM documents WHERE 1=1';
  const params = [];
  let paramIdx = 1;

  if (search) {
    query += ` AND (title ILIKE $${paramIdx} OR original_name ILIKE $${paramIdx + 1} OR slug ILIKE $${paramIdx + 2})`;
    const term = `%${search}%`;
    params.push(term, term, term);
    paramIdx += 3;
  }
  if (category && category !== 'all') {
    query += ` AND category = $${paramIdx}`;
    params.push(category);
    paramIdx += 1;
  }

  query += ' ORDER BY uploaded_at DESC';

  try {
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error listing documents:', err.message);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

// POST /upload — Upload a document (admin only)
router.post('/upload', verifyToken, requireRole('admin'), (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const pool = getPool();
    const { title, category, slug: customSlug } = req.body;
    const displayTitle = title || req.file.originalname.replace(/\.[^.]+$/, '');
    const baseSlug = customSlug || slugify(displayTitle);

    // Ensure unique slug (async loop)
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const { rows } = await pool.query('SELECT id FROM documents WHERE slug = $1', [slug]);
      if (rows.length === 0) break;
      slug = `${baseSlug}-${counter++}`;
    }

    try {
      // Upload file buffer to Vercel Blob
      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const blob = await put(`documents/${Date.now()}-${safeName}`, req.file.buffer, {
        access: 'public',
        contentType: req.file.mimetype,
      });

      const { rows } = await pool.query(
        `INSERT INTO documents (filename, original_name, file_path, mime_type, size_bytes, slug, title, category, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          req.file.originalname,
          req.file.originalname,
          blob.url,
          req.file.mimetype,
          req.file.size,
          slug,
          displayTitle,
          category || 'general',
          req.user.id,
        ]
      );

      res.status(201).json(rows[0]);
    } catch (uploadErr) {
      console.error('Error uploading document:', uploadErr.message);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  });
});

// PUT /:id — Update document metadata (admin only)
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const pool = getPool();
  const { title, slug, category } = req.body;

  try {
    const { rows: docRows } = await pool.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    const doc = docRows[0];
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // If slug is changing, check uniqueness
    if (slug && slug !== doc.slug) {
      const { rows: existing } = await pool.query(
        'SELECT id FROM documents WHERE slug = $1 AND id != $2',
        [slug, doc.id]
      );
      if (existing.length > 0) return res.status(409).json({ error: 'Slug already in use' });
    }

    const { rows: updated } = await pool.query(
      'UPDATE documents SET title = $1, slug = $2, category = $3 WHERE id = $4 RETURNING *',
      [title ?? doc.title, slug ?? doc.slug, category ?? doc.category, doc.id]
    );

    res.json(updated[0]);
  } catch (err) {
    console.error('Error updating document:', err.message);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// DELETE /:id — Delete document (admin only)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const pool = getPool();

  try {
    const { rows } = await pool.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    const doc = rows[0];
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Delete blob from Vercel Blob storage
    try {
      await del(doc.file_path);
    } catch (blobErr) {
      console.error('Failed to delete document blob:', blobErr.message);
    }

    await pool.query('DELETE FROM documents WHERE id = $1', [doc.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting document:', err.message);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// GET /file/:slug — Public download endpoint (no auth required)
router.get('/file/:slug', async (req, res) => {
  const pool = getPool();

  try {
    const { rows } = await pool.query('SELECT * FROM documents WHERE slug = $1', [req.params.slug]);
    const doc = rows[0];
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    res.redirect(doc.file_path);
  } catch (err) {
    console.error('Error fetching document:', err.message);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

export default router;
