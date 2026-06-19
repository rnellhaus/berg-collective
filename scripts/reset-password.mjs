// One-off admin recovery: set a strong temp password on a user by email.
// Usage: node scripts/reset-password.mjs <email>
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Pool } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const email = process.argv[2];
if (!email) { console.error('Usage: node scripts/reset-password.mjs <email>'); process.exit(1); }

// Strong, readable temp password: 24 url-safe chars.
const tempPassword = crypto.randomBytes(18).toString('base64url');
const hash = await bcrypt.hash(tempPassword, 12);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query(
  'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email, name, role',
  [hash, email]
);
await pool.end();

if (!rows[0]) { console.error(`No user found with email ${email}`); process.exit(1); }
console.log('Password reset for:', rows[0]);
console.log('\n  TEMP PASSWORD:', tempPassword, '\n');
console.log('Log in, then change it immediately via Admin → Users.');
