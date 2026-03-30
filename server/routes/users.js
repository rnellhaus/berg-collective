import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getPool } from '../db/connection.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = Router();

// All routes require auth + admin role
router.use(verifyToken, requireRole('admin'));

// GET / — List users
router.get('/', async (req, res) => {
  const pool = getPool();
  const { rows: users } = await pool.query(
    'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
  );
  res.json({ users });
});

// POST / — Create user
router.post('/', async (req, res) => {
  const pool = getPool();
  const { email, name, role, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing[0]) {
    return res.status(409).json({ error: 'Email already in use' });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const { rows } = await pool.query(
    'INSERT INTO users (email, name, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at',
    [email, name || null, role || 'editor', hashedPassword]
  );

  res.status(201).json({ user: rows[0] });
});

// PUT /:id — Update name, role, password
router.put('/:id', async (req, res) => {
  const pool = getPool();
  const { name, role, password } = req.body;
  const targetId = parseInt(req.params.id, 10);

  const { rows: existing } = await pool.query('SELECT * FROM users WHERE id = $1', [targetId]);
  const user = existing[0];
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Prevent changing own role
  if (role !== undefined && targetId === req.user.id && role !== user.role) {
    return res.status(403).json({ error: 'You cannot change your own role' });
  }

  let passwordHash = user.password_hash;
  if (password) {
    passwordHash = await bcrypt.hash(password, 12);
  }

  const { rows: updated } = await pool.query(
    'UPDATE users SET name = $1, role = $2, password_hash = $3 WHERE id = $4 RETURNING id, email, name, role, created_at',
    [
      name !== undefined ? name : user.name,
      role !== undefined ? role : user.role,
      passwordHash,
      targetId,
    ]
  );

  res.json({ user: updated[0] });
});

// DELETE /:id — Delete user
router.delete('/:id', async (req, res) => {
  const pool = getPool();
  const targetId = parseInt(req.params.id, 10);

  // Prevent deleting self
  if (targetId === req.user.id) {
    return res.status(403).json({ error: 'You cannot delete your own account' });
  }

  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [targetId]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });

  await pool.query('DELETE FROM users WHERE id = $1', [targetId]);
  res.json({ success: true });
});

export default router;
