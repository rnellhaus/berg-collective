import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { getDb } from './connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function initDatabase() {
  const db = getDb();
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);

  // Create upload directories
  const serverDir = path.join(__dirname, '..');
  const dirs = [
    path.join(serverDir, 'uploads'),
    path.join(serverDir, 'optimized', 'thumb'),
    path.join(serverDir, 'optimized', 'medium'),
    path.join(serverDir, 'optimized', 'full'),
    path.join(serverDir, 'optimized', 'fallback'),
    path.join(serverDir, 'uploads', 'documents'),
  ];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create default admin user if none exists
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('rich@bergcollective.org');
  if (!existingAdmin) {
    const hash = bcrypt.hashSync('admin123', 12);
    db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)').run(
      'rich@bergcollective.org', hash, 'Rich Nellhaus', 'admin'
    );
    console.log('Created default admin user: rich@bergcollective.org');
  }

  // Migration: add 'draft' to events status CHECK constraint
  // SQLite can't ALTER CHECK constraints, so we recreate the table if needed
  try {
    db.prepare("INSERT INTO events (title, date, status) VALUES ('__test__', '2000-01-01', 'draft')").run();
    db.prepare("DELETE FROM events WHERE title = '__test__'").run();
  } catch {
    // CHECK constraint failed — need to migrate
    console.log('Migrating events table to support draft status...');
    db.exec(`
      CREATE TABLE events_new (
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
      INSERT INTO events_new SELECT * FROM events;
      DROP TABLE events;
      ALTER TABLE events_new RENAME TO events;
    `);
    console.log('Events table migrated.');
  }

  // Migration: add reviewed/reviewed_at columns to form_submissions
  const formCols = db.prepare("PRAGMA table_info(form_submissions)").all();
  const hasReviewed = formCols.some(c => c.name === 'reviewed');
  if (!hasReviewed) {
    console.log('Migrating form_submissions: adding reviewed + reviewed_at columns...');
    db.exec(`
      ALTER TABLE form_submissions ADD COLUMN reviewed INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE form_submissions ADD COLUMN reviewed_at TEXT;
    `);
    console.log('form_submissions migration complete.');
  }

  console.log('Database initialized');
}
