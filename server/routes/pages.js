import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// GET / — List all pages (public)
router.get('/', (req, res) => {
  const db = getDb();
  const pages = db
    .prepare('SELECT id, slug, title, meta_description, updated_at FROM pages ORDER BY title')
    .all();
  res.json({ pages });
});

// GET /:slug — Get page with all sections (public)
router.get('/:slug', (req, res) => {
  const db = getDb();
  const page = db.prepare('SELECT * FROM pages WHERE slug = ?').get(req.params.slug);
  if (!page) return res.status(404).json({ error: 'Page not found' });

  const sections = db
    .prepare('SELECT * FROM page_sections WHERE page_id = ? ORDER BY sort_order')
    .all(page.id);

  const parsedSections = sections.map((section) => {
    let fields = section.fields;
    if (typeof fields === 'string') {
      try {
        fields = JSON.parse(fields);
      } catch (e) {
        fields = {};
      }
    }
    return { ...section, fields };
  });

  res.json({ page: { ...page, sections: parsedSections } });
});

// PUT /:slug/sections/:key — Update section fields (auth required)
router.put('/:slug/sections/:key', verifyToken, (req, res) => {
  const db = getDb();
  const { fields } = req.body;

  if (!fields || typeof fields !== 'object') {
    return res.status(400).json({ error: 'fields object is required' });
  }

  const page = db.prepare('SELECT * FROM pages WHERE slug = ?').get(req.params.slug);
  if (!page) return res.status(404).json({ error: 'Page not found' });

  const fieldsJson = JSON.stringify(fields);

  // Upsert page_sections row
  const existing = db
    .prepare('SELECT * FROM page_sections WHERE page_id = ? AND section_key = ?')
    .get(page.id, req.params.key);

  if (existing) {
    db.prepare('UPDATE page_sections SET fields = ? WHERE page_id = ? AND section_key = ?').run(
      fieldsJson,
      page.id,
      req.params.key
    );
  } else {
    const maxOrder = db
      .prepare('SELECT MAX(sort_order) as maxOrder FROM page_sections WHERE page_id = ?')
      .get(page.id);
    const sortOrder = (maxOrder.maxOrder || 0) + 1;

    db.prepare(
      'INSERT INTO page_sections (page_id, section_key, fields, sort_order) VALUES (?, ?, ?, ?)'
    ).run(page.id, req.params.key, fieldsJson, sortOrder);
  }

  // Update page updated_at
  db.prepare('UPDATE pages SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(page.id);

  const section = db
    .prepare('SELECT * FROM page_sections WHERE page_id = ? AND section_key = ?')
    .get(page.id, req.params.key);

  let parsedFields = section.fields;
  if (typeof parsedFields === 'string') {
    try {
      parsedFields = JSON.parse(parsedFields);
    } catch (e) {
      parsedFields = {};
    }
  }

  res.json({ section: { ...section, fields: parsedFields } });
});

// PUT /:slug/meta — Update page title/meta_description (auth required)
router.put('/:slug/meta', verifyToken, (req, res) => {
  const db = getDb();
  const { title, meta_description } = req.body;

  const page = db.prepare('SELECT * FROM pages WHERE slug = ?').get(req.params.slug);
  if (!page) return res.status(404).json({ error: 'Page not found' });

  db.prepare(
    'UPDATE pages SET title = ?, meta_description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(
    title !== undefined ? title : page.title,
    meta_description !== undefined ? meta_description : page.meta_description,
    page.id
  );

  const updated = db.prepare('SELECT id, slug, title, meta_description, updated_at FROM pages WHERE id = ?').get(page.id);
  res.json({ page: updated });
});

export default router;
