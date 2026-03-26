import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/connection.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = Router();

// All routes require auth + admin role
router.use(verifyToken, requireRole('admin'));

// GET / — List users
router.get('/', (req, res) => {
  const db = getDb();
  const users = db
    .prepare('SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC')
    .all();
  res.json({ users });
});

// POST / — Create user
router.post('/', async (req, res) => {
  const db = getDb();
  const { email, name, role, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already in use' });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const result = db
    .prepare('INSERT INTO users (email, name, role, password_hash) VALUES (?, ?, ?, ?)')
    .run(email, name || null, role || 'editor', hashedPassword);

  const user = db
    .prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?')
    .get(result.lastInsertRowid);

  res.status(201).json({ user });
});

// PUT /:id — Update name, role, password
router.put('/:id', async (req, res) => {
  const db = getDb();
  const { name, role, password } = req.body;
  const targetId = parseInt(req.params.id, 10);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Prevent changing own role
  if (role !== undefined && targetId === req.user.id && role !== user.role) {
    return res.status(403).json({ error: 'You cannot change your own role' });
  }

  let passwordHash = user.password_hash;
  if (password) {
    passwordHash = await bcrypt.hash(password, 12);
  }

  db.prepare(
    'UPDATE users SET name = ?, role = ?, password_hash = ? WHERE id = ?'
  ).run(
    name !== undefined ? name : user.name,
    role !== undefined ? role : user.role,
    passwordHash,
    targetId
  );

  const updated = db
    .prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?')
    .get(targetId);

  res.json({ user: updated });
});

// DELETE /:id — Delete user
router.delete('/:id', (req, res) => {
  const db = getDb();
  const targetId = parseInt(req.params.id, 10);

  // Prevent deleting self
  if (targetId === req.user.id) {
    return res.status(403).json({ error: 'You cannot delete your own account' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
  res.json({ success: true });
});

export default router;
