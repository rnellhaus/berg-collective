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

  console.log('Database initialized');
}
