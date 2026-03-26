CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'editor')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  meta_description TEXT DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS page_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  fields TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(page_id, section_key)
);

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  original_path TEXT NOT NULL,
  webp_thumb TEXT,
  webp_medium TEXT,
  webp_full TEXT,
  jpg_fallback TEXT,
  width INTEGER,
  height INTEGER,
  size_bytes INTEGER,
  webp_size_bytes INTEGER,
  alt_text TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  uploaded_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  date TEXT NOT NULL,
  time TEXT DEFAULT '',
  location TEXT DEFAULT '',
  category TEXT DEFAULT '',
  chapter TEXT DEFAULT '',
  cover_image_id INTEGER REFERENCES media(id),
  rsvp_platform TEXT DEFAULT 'custom',
  rsvp_url TEXT DEFAULT '',
  rsvp_event_id TEXT DEFAULT '',
  is_featured INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'upcoming', 'past')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS event_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  media_id INTEGER NOT NULL REFERENCES media(id),
  caption TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);
