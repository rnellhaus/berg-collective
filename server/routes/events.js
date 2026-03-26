import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = Router();

function getRsvpStrategy(platform) {
  if (!platform) return 'external';
  const p = platform.toLowerCase();
  if (p === 'luma') return 'overlay';
  if (p === 'eventbrite') return 'external';
  return 'iframe';
}

// GET / — List events (public)
router.get('/', (req, res) => {
  const db = getDb();
  const { status, chapter } = req.query;

  let query = `
    SELECT e.*, m.webp_medium as cover_image_url,
      (SELECT COUNT(*) FROM event_photos ep WHERE ep.event_id = e.id) as photo_count
    FROM events e
    LEFT JOIN media m ON e.cover_image_id = m.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND e.status = ?';
    params.push(status);
  }
  if (chapter) {
    query += ' AND e.chapter = ?';
    params.push(chapter);
  }

  query += ' ORDER BY e.date DESC';

  const events = db.prepare(query).all(...params);

  const enriched = events.map((event) => ({
    ...event,
    rsvp_strategy: getRsvpStrategy(event.rsvp_platform),
  }));

  res.json({ events: enriched });
});

// GET /:id — Get single event with photos (public)
router.get('/:id', (req, res) => {
  const db = getDb();

  const event = db.prepare(`
    SELECT e.*, m.webp_medium as cover_image_url
    FROM events e
    LEFT JOIN media m ON e.cover_image_id = m.id
    WHERE e.id = ?
  `).get(req.params.id);

  if (!event) return res.status(404).json({ error: 'Event not found' });

  const photos = db.prepare(`
    SELECT ep.id, ep.sort_order, ep.caption, m.id as media_id,
      m.filename, m.webp_thumb, m.webp_medium, m.webp_full,
      m.jpg_fallback, m.alt_text, m.width, m.height
    FROM event_photos ep
    JOIN media m ON ep.media_id = m.id
    WHERE ep.event_id = ?
    ORDER BY ep.sort_order
  `).all(req.params.id);

  res.json({ event: { ...event, rsvp_strategy: getRsvpStrategy(event.rsvp_platform), photos } });
});

// POST / — Create event (auth)
router.post('/', verifyToken, (req, res) => {
  const db = getDb();
  const {
    title, date, time, location, description, category, chapter,
    rsvp_url, rsvp_platform, rsvp_event_id, cover_image_id, is_featured, status
  } = req.body;

  if (!title) return res.status(400).json({ error: 'title is required' });
  if (!date) return res.status(400).json({ error: 'date is required' });

  const result = db.prepare(`
    INSERT INTO events (
      title, date, time, location, description, category, chapter,
      rsvp_url, rsvp_platform, rsvp_event_id, cover_image_id, is_featured, status, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
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
    req.user.id
  );

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ event: { ...event, rsvp_strategy: getRsvpStrategy(event.rsvp_platform) } });
});

// PUT /:id — Update event (auth)
router.put('/:id', verifyToken, (req, res) => {
  const db = getDb();
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const {
    title, date, time, location, description, category, chapter,
    rsvp_url, rsvp_platform, rsvp_event_id, cover_image_id, is_featured, status
  } = req.body;

  db.prepare(`
    UPDATE events SET
      title = ?,
      date = ?,
      time = ?,
      location = ?,
      description = ?,
      category = ?,
      chapter = ?,
      rsvp_url = ?,
      rsvp_platform = ?,
      rsvp_event_id = ?,
      cover_image_id = ?,
      is_featured = ?,
      status = ?,
      updated_by = ?
    WHERE id = ?
  `).run(
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
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  res.json({ event: { ...updated, rsvp_strategy: getRsvpStrategy(updated.rsvp_platform) } });
});

// DELETE /:id — Delete event (admin only)
router.delete('/:id', verifyToken, requireRole('admin'), (req, res) => {
  const db = getDb();
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  db.prepare('DELETE FROM event_photos WHERE event_id = ?').run(req.params.id);
  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /:id/photos — Add photos to gallery (auth)
router.post('/:id/photos', verifyToken, (req, res) => {
  const db = getDb();
  const { media_ids } = req.body;

  if (!Array.isArray(media_ids) || media_ids.length === 0) {
    return res.status(400).json({ error: 'media_ids array is required' });
  }

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const maxOrder = db
    .prepare('SELECT MAX(sort_order) as maxOrder FROM event_photos WHERE event_id = ?')
    .get(req.params.id);
  let sortOrder = (maxOrder.maxOrder || 0) + 1;

  const insertStmt = db.prepare(
    'INSERT OR IGNORE INTO event_photos (event_id, media_id, sort_order) VALUES (?, ?, ?)'
  );

  const insertMany = db.transaction((ids) => {
    for (const mediaId of ids) {
      insertStmt.run(req.params.id, mediaId, sortOrder++);
    }
  });

  insertMany(media_ids);

  const photos = db.prepare(`
    SELECT ep.id, ep.sort_order, ep.caption, m.id as media_id,
      m.filename, m.webp_thumb, m.webp_medium, m.webp_full,
      m.jpg_fallback, m.alt_text
    FROM event_photos ep
    JOIN media m ON ep.media_id = m.id
    WHERE ep.event_id = ?
    ORDER BY ep.sort_order
  `).all(req.params.id);

  res.status(201).json({ photos });
});

// PUT /:id/photos/reorder — Reorder gallery (auth)
router.put('/:id/photos/reorder', verifyToken, (req, res) => {
  const db = getDb();
  const { photo_ids } = req.body;

  if (!Array.isArray(photo_ids) || photo_ids.length === 0) {
    return res.status(400).json({ error: 'photo_ids array is required' });
  }

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const updateStmt = db.prepare(
    'UPDATE event_photos SET sort_order = ? WHERE id = ? AND event_id = ?'
  );

  const reorder = db.transaction((ids) => {
    ids.forEach((photoId, index) => {
      updateStmt.run(index + 1, photoId, req.params.id);
    });
  });

  reorder(photo_ids);

  const photos = db.prepare(`
    SELECT ep.id, ep.sort_order, ep.caption, m.id as media_id,
      m.filename, m.webp_thumb, m.webp_medium, m.webp_full,
      m.jpg_fallback, m.alt_text
    FROM event_photos ep
    JOIN media m ON ep.media_id = m.id
    WHERE ep.event_id = ?
    ORDER BY ep.sort_order
  `).all(req.params.id);

  res.json({ photos });
});

// DELETE /:id/photos/:photoId — Remove photo from gallery (auth)
router.delete('/:id/photos/:photoId', verifyToken, (req, res) => {
  const db = getDb();

  const photo = db
    .prepare('SELECT * FROM event_photos WHERE id = ? AND event_id = ?')
    .get(req.params.photoId, req.params.id);

  if (!photo) return res.status(404).json({ error: 'Photo not found in this event' });

  db.prepare('DELETE FROM event_photos WHERE id = ?').run(req.params.photoId);
  res.json({ success: true });
});

export default router;
