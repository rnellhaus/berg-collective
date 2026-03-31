import { Router } from 'express';
import { getPool } from '../db/connection.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = Router();

// Domains known to block iframe embedding via X-Frame-Options / CSP
const IFRAME_BLOCKED_DOMAINS = [
  'eventbrite.com',
  'ticketapp.org',
  'ticketmaster.com',
  'axs.com',
  'dice.fm',
  'seetickets.com',
  'stubhub.com',
  'universe.com',
  'splash.events',
  'partiful.com',
];

function getRsvpStrategy(platform, rsvpUrl) {
  if (!platform) return 'external';
  const p = platform.toLowerCase();
  if (p === 'luma') return 'overlay';
  if (p === 'eventbrite') return 'external';

  // Check if the URL domain is known to block iframes
  if (rsvpUrl) {
    try {
      const hostname = new URL(rsvpUrl).hostname.toLowerCase();
      if (IFRAME_BLOCKED_DOMAINS.some(d => hostname.includes(d))) {
        return 'external';
      }
    } catch {}
  }

  return 'iframe';
}

// GET / — List events (public)
router.get('/', async (req, res) => {
  try {
    const pool = getPool();

    // Auto-move past-due upcoming events to 'past'
    try {
      await pool.query(
        `UPDATE events SET status = 'past' WHERE status = 'upcoming' AND date::date < CURRENT_DATE`
      );
    } catch { /* ignore if date format is unexpected */ }

    const { status, chapter } = req.query;

    let query = `
      SELECT e.*, m.webp_medium as cover_image_url,
        (SELECT COUNT(*) FROM event_photos ep WHERE ep.event_id = e.id) as photo_count
      FROM events e
      LEFT JOIN media m ON e.cover_image_id = m.id
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (status) {
      query += ` AND e.status = $${paramIdx++}`;
      params.push(status);
    } else {
      query += " AND e.status != 'draft'";
    }
    if (chapter) {
      query += ` AND e.chapter = $${paramIdx++}`;
      params.push(chapter);
    }

    if (status === 'upcoming' || status === 'draft') {
      query += ' ORDER BY e.date ASC';
    } else {
      query += ' ORDER BY e.date DESC';
    }

    const { rows: events } = await pool.query(query, params);

    const enriched = events.map((event) => ({
      ...event,
      rsvp_strategy: getRsvpStrategy(event.rsvp_platform, event.rsvp_url),
    }));

    res.json({ events: enriched });
  } catch (err) {
    console.error('List events error:', err);
    res.status(500).json({ error: 'Failed to load events' });
  }
});

// GET /:id — Get single event with photos (public)
router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();

    const { rows: eventRows } = await pool.query(`
      SELECT e.*, m.webp_medium as cover_image_url
      FROM events e
      LEFT JOIN media m ON e.cover_image_id = m.id
      WHERE e.id = $1
    `, [req.params.id]);

    const event = eventRows[0];
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const { rows: photos } = await pool.query(`
      SELECT ep.id, ep.sort_order, ep.caption, m.id as media_id,
        m.filename, m.webp_thumb, m.webp_medium, m.webp_full,
        m.jpg_fallback, m.alt_text, m.width, m.height
      FROM event_photos ep
      JOIN media m ON ep.media_id = m.id
      WHERE ep.event_id = $1
      ORDER BY ep.sort_order
    `, [req.params.id]);

    res.json({ event: { ...event, rsvp_strategy: getRsvpStrategy(event.rsvp_platform, event.rsvp_url), photos } });
  } catch (err) {
    console.error('Get event error:', err);
    res.status(500).json({ error: 'Failed to load event' });
  }
});

// POST / — Create event (auth)
router.post('/', verifyToken, async (req, res) => {
  const pool = getPool();
  const {
    title, date, time, location, description, category, chapter,
    rsvp_url, rsvp_platform, rsvp_event_id, cover_image_id, is_featured, status
  } = req.body;

  if (!title) return res.status(400).json({ error: 'title is required' });
  if (!date) return res.status(400).json({ error: 'date is required' });

  const { rows: insertRows } = await pool.query(`
    INSERT INTO events (
      title, date, time, location, description, category, chapter,
      rsvp_url, rsvp_platform, rsvp_event_id, cover_image_id, is_featured, status, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING id
  `, [
    title,
    date,
    time || '',
    location || '',
    description || '',
    category || '',
    chapter || '',
    rsvp_url || '',
    rsvp_platform || 'custom',
    rsvp_event_id || '',
    cover_image_id || null,
    is_featured ? 1 : 0,
    status || 'upcoming',
    req.user.id,
  ]);

  const newId = insertRows[0].id;
  const { rows: eventRows } = await pool.query('SELECT * FROM events WHERE id = $1', [newId]);
  const event = eventRows[0];
  res.status(201).json({ event: { ...event, rsvp_strategy: getRsvpStrategy(event.rsvp_platform) } });
});

// PUT /:id — Update event (auth)
router.put('/:id', verifyToken, async (req, res) => {
  const pool = getPool();
  const { rows: existingRows } = await pool.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
  const event = existingRows[0];
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const {
    title, date, time, location, description, category, chapter,
    rsvp_url, rsvp_platform, rsvp_event_id, cover_image_id, is_featured, status
  } = req.body;

  await pool.query(`
    UPDATE events SET
      title = $1,
      date = $2,
      time = $3,
      location = $4,
      description = $5,
      category = $6,
      chapter = $7,
      rsvp_url = $8,
      rsvp_platform = $9,
      rsvp_event_id = $10,
      cover_image_id = $11,
      is_featured = $12,
      status = $13,
      updated_by = $14
    WHERE id = $15
  `, [
    title !== undefined ? title : event.title,
    date !== undefined ? date : event.date,
    time !== undefined ? time : event.time,
    location !== undefined ? location : event.location,
    description !== undefined ? description : event.description,
    category !== undefined ? category : event.category,
    chapter !== undefined ? chapter : event.chapter,
    rsvp_url !== undefined ? rsvp_url : event.rsvp_url,
    rsvp_platform !== undefined ? rsvp_platform : event.rsvp_platform,
    rsvp_event_id !== undefined ? rsvp_event_id : event.rsvp_event_id,
    cover_image_id !== undefined ? cover_image_id : event.cover_image_id,
    is_featured !== undefined ? (is_featured ? 1 : 0) : event.is_featured,
    status !== undefined ? status : event.status,
    req.user.id,
    req.params.id,
  ]);

  const { rows: updatedRows } = await pool.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
  const updated = updatedRows[0];
  res.json({ event: { ...updated, rsvp_strategy: getRsvpStrategy(updated.rsvp_platform, updated.rsvp_url) } });
});

// POST /:id/duplicate — Duplicate event (auth)
router.post('/:id/duplicate', verifyToken, async (req, res) => {
  const pool = getPool();
  const { rows: existingRows } = await pool.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
  const event = existingRows[0];
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const { rows: insertRows } = await pool.query(`
    INSERT INTO events (
      title, date, time, location, description, category, chapter,
      rsvp_url, rsvp_platform, rsvp_event_id, cover_image_id, is_featured, status, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING id
  `, [
    `${event.title} (Copy)`,
    event.date,
    event.time,
    event.location,
    event.description,
    event.category,
    event.chapter,
    event.rsvp_url,
    event.rsvp_platform,
    event.rsvp_event_id,
    event.cover_image_id,
    0, // not featured
    event.status,
    req.user.id,
  ]);

  const newId = insertRows[0].id;

  // Copy photo associations
  const { rows: photos } = await pool.query(
    'SELECT media_id, caption, sort_order FROM event_photos WHERE event_id = $1',
    [req.params.id]
  );
  for (const photo of photos) {
    await pool.query(
      'INSERT INTO event_photos (event_id, media_id, caption, sort_order) VALUES ($1, $2, $3, $4)',
      [newId, photo.media_id, photo.caption, photo.sort_order]
    );
  }

  const { rows: newEventRows } = await pool.query('SELECT * FROM events WHERE id = $1', [newId]);
  const newEvent = newEventRows[0];
  res.status(201).json({ event: { ...newEvent, rsvp_strategy: getRsvpStrategy(newEvent.rsvp_platform, newEvent.rsvp_url) } });
});

// DELETE /:id — Delete event (admin only)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  const pool = getPool();
  const { rows: existingRows } = await pool.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
  const event = existingRows[0];
  if (!event) return res.status(404).json({ error: 'Event not found' });

  await pool.query('DELETE FROM event_photos WHERE event_id = $1', [req.params.id]);
  await pool.query('DELETE FROM events WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// POST /:id/photos — Add photos to gallery (auth)
router.post('/:id/photos', verifyToken, async (req, res) => {
  const pool = getPool();
  const { media_ids } = req.body;

  if (!Array.isArray(media_ids) || media_ids.length === 0) {
    return res.status(400).json({ error: 'media_ids array is required' });
  }

  const { rows: existingRows } = await pool.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
  if (!existingRows[0]) return res.status(404).json({ error: 'Event not found' });

  const { rows: maxRows } = await pool.query(
    'SELECT MAX(sort_order) as maxOrder FROM event_photos WHERE event_id = $1',
    [req.params.id]
  );
  let sortOrder = (maxRows[0].maxorder || 0) + 1;

  for (const mediaId of media_ids) {
    await pool.query(
      'INSERT INTO event_photos (event_id, media_id, sort_order) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [req.params.id, mediaId, sortOrder++]
    );
  }

  const { rows: photos } = await pool.query(`
    SELECT ep.id, ep.sort_order, ep.caption, m.id as media_id,
      m.filename, m.webp_thumb, m.webp_medium, m.webp_full,
      m.jpg_fallback, m.alt_text
    FROM event_photos ep
    JOIN media m ON ep.media_id = m.id
    WHERE ep.event_id = $1
    ORDER BY ep.sort_order
  `, [req.params.id]);

  res.status(201).json({ photos });
});

// PUT /:id/photos/reorder — Reorder gallery (auth)
router.put('/:id/photos/reorder', verifyToken, async (req, res) => {
  const pool = getPool();
  const { photo_ids } = req.body;

  if (!Array.isArray(photo_ids) || photo_ids.length === 0) {
    return res.status(400).json({ error: 'photo_ids array is required' });
  }

  const { rows: existingRows } = await pool.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
  if (!existingRows[0]) return res.status(404).json({ error: 'Event not found' });

  for (let index = 0; index < photo_ids.length; index++) {
    await pool.query(
      'UPDATE event_photos SET sort_order = $1 WHERE id = $2 AND event_id = $3',
      [index + 1, photo_ids[index], req.params.id]
    );
  }

  const { rows: photos } = await pool.query(`
    SELECT ep.id, ep.sort_order, ep.caption, m.id as media_id,
      m.filename, m.webp_thumb, m.webp_medium, m.webp_full,
      m.jpg_fallback, m.alt_text
    FROM event_photos ep
    JOIN media m ON ep.media_id = m.id
    WHERE ep.event_id = $1
    ORDER BY ep.sort_order
  `, [req.params.id]);

  res.json({ photos });
});

// DELETE /:id/photos/:photoId — Remove photo from gallery (auth)
router.delete('/:id/photos/:photoId', verifyToken, async (req, res) => {
  const pool = getPool();

  const { rows: photoRows } = await pool.query(
    'SELECT * FROM event_photos WHERE id = $1 AND event_id = $2',
    [req.params.photoId, req.params.id]
  );

  if (!photoRows[0]) return res.status(404).json({ error: 'Photo not found in this event' });

  await pool.query('DELETE FROM event_photos WHERE id = $1', [req.params.photoId]);
  res.json({ success: true });
});

export default router;
