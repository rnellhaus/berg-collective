import bcrypt from 'bcryptjs';
import { getPool } from './connection.js';

export async function initDatabase() {
  const pool = getPool();

  // Verify connection
  await pool.query('SELECT 1');

  // Create default admin if none exists
  const { rows } = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    ['rich@bergcollective.org']
  );
  if (rows.length === 0) {
    const seedPassword = process.env.ADMIN_SEED_PASSWORD || 'admin123';
    if (process.env.VERCEL && !process.env.ADMIN_SEED_PASSWORD) {
      console.warn('WARNING: Seeding admin with default password. Set ADMIN_SEED_PASSWORD env var.');
    }
    const hash = await bcrypt.hash(seedPassword, 12);
    await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
      ['rich@bergcollective.org', hash, 'Rich Nellhaus', 'admin']
    );
    console.log('Created default admin user: rich@bergcollective.org');
  }

  // Migration: password reset tokens table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Migration: ensure reviewed columns exist on form_submissions
  const { rows: cols } = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'form_submissions' AND column_name = 'reviewed'`
  );
  if (cols.length === 0) {
    await pool.query(`ALTER TABLE form_submissions ADD COLUMN reviewed INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE form_submissions ADD COLUMN reviewed_at TEXT`);
    console.log('form_submissions migration complete.');
  }

  console.log('Database initialized (Neon)');
}
