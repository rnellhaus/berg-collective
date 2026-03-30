import { Router } from 'express';
import { getPool } from '../db/connection.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// GET / — List all pages (public)
router.get('/', async (req, res) => {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      'SELECT id, slug, title, meta_description, updated_at FROM pages ORDER BY title'
    );
    res.json({ pages: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /:slug — Get page with all sections (public)
router.get('/:slug', async (req, res) => {
  const pool = getPool();
  try {
    const { rows: pageRows } = await pool.query(
      'SELECT * FROM pages WHERE slug = $1',
      [req.params.slug]
    );
    const page = pageRows[0];
    if (!page) return res.status(404).json({ error: 'Page not found' });

    const { rows: sections } = await pool.query(
      'SELECT * FROM page_sections WHERE page_id = $1 ORDER BY sort_order',
      [page.id]
    );

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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /:slug/sections/:key — Update section fields (auth required)
router.put('/:slug/sections/:key', verifyToken, async (req, res) => {
  const pool = getPool();
  const { fields } = req.body;

  if (!fields || typeof fields !== 'object') {
    return res.status(400).json({ error: 'fields object is required' });
  }

  try {
    const { rows: pageRows } = await pool.query(
      'SELECT * FROM pages WHERE slug = $1',
      [req.params.slug]
    );
    const page = pageRows[0];
    if (!page) return res.status(404).json({ error: 'Page not found' });

    const fieldsJson = JSON.stringify(fields);

    // Upsert page_sections row using PostgreSQL ON CONFLICT
    await pool.query(
      `INSERT INTO page_sections (page_id, section_key, fields, sort_order)
       VALUES (
         $1, $2, $3,
         COALESCE((SELECT MAX(sort_order) FROM page_sections WHERE page_id = $1), 0) + 1
       )
       ON CONFLICT (page_id, section_key) DO UPDATE SET fields = $3`,
      [page.id, req.params.key, fieldsJson]
    );

    // Update page updated_at
    await pool.query(
      'UPDATE pages SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [page.id]
    );

    const { rows: sectionRows } = await pool.query(
      'SELECT * FROM page_sections WHERE page_id = $1 AND section_key = $2',
      [page.id, req.params.key]
    );
    const section = sectionRows[0];

    let parsedFields = section.fields;
    if (typeof parsedFields === 'string') {
      try {
        parsedFields = JSON.parse(parsedFields);
      } catch (e) {
        parsedFields = {};
      }
    }

    res.json({ section: { ...section, fields: parsedFields } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /:slug/meta — Update page title/meta_description (auth required)
router.put('/:slug/meta', verifyToken, async (req, res) => {
  const pool = getPool();
  const { title, meta_description } = req.body;

  try {
    const { rows: pageRows } = await pool.query(
      'SELECT * FROM pages WHERE slug = $1',
      [req.params.slug]
    );
    const page = pageRows[0];
    if (!page) return res.status(404).json({ error: 'Page not found' });

    const { rows: updatedRows } = await pool.query(
      `UPDATE pages
       SET title = $1, meta_description = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, slug, title, meta_description, updated_at`,
      [
        title !== undefined ? title : page.title,
        meta_description !== undefined ? meta_description : page.meta_description,
        page.id,
      ]
    );

    res.json({ page: updatedRows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
