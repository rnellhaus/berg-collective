// Read-only: list admin users so a locked-out admin can recover their username.
import { readFileSync } from 'node:fs';
import { Pool } from '@neondatabase/serverless';

// .env.local isn't auto-loaded; parse it manually.
if (!process.env.DATABASE_URL) {
  for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query(
  'SELECT id, email, name, role, created_at FROM users ORDER BY created_at ASC'
);
console.table(rows);
await pool.end();
