import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';
import { getPool } from '../db/connection.js';
import { verifyToken, generateTokens } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = Router();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const adminAuth = [verifyToken, requireRole('admin')];

// GET / — List users
router.get('/', adminAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { rows: users } = await pool.query(
      'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// POST / — Create user
router.post('/', adminAuth, async (req, res) => {
  try {
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
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// POST /invite — Create invite and send email (admin only)
router.post('/invite', adminAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user already exists
    const { rows: existingUser } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser[0]) {
      return res.status(409).json({ error: 'A user with that email already exists' });
    }

    // Check for existing unused invite
    const { rows: existingInvite } = await pool.query(
      'SELECT id FROM invites WHERE email = $1 AND used = FALSE AND expires_at > NOW()',
      [email]
    );
    if (existingInvite[0]) {
      // Delete old invite so we can create a fresh one
      await pool.query('DELETE FROM invites WHERE id = $1', [existingInvite[0].id]);
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { rows } = await pool.query(
      `INSERT INTO invites (email, role, token, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, role, token, expires_at`,
      [email, role || 'editor', token, expiresAt.toISOString(), req.user.id]
    );

    const invite = rows[0];
    const frontendUrl = process.env.FRONTEND_URL || 'https://berg-collective-web.vercel.app';
    const link = `${frontendUrl}/admin/accept-invite?token=${token}`;

    // Send invite email
    let emailSent = false;
    if (resend) {
      try {
        await resend.emails.send({
          from: 'BERG Collective <info@bergcollective.org>',
          to: email,
          subject: "You're invited to BERG Collective",
          html: `
            <div style="font-family:'Nunito',Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#000;padding:24px 32px;">
                <h1 style="color:#D4AF37;font-size:18px;margin:0;">BERG Collective</h1>
              </div>
              <div style="padding:32px;">
                <h2 style="color:#000;font-size:22px;margin:0 0 16px;">You're Invited!</h2>
                <p style="color:#555;font-size:16px;line-height:1.6;">
                  You've been invited to join the BERG Collective admin panel as ${(role || 'editor') === 'admin' ? 'an <strong>Admin</strong>' : 'an <strong>Editor</strong>'}.
                </p>
                <p style="color:#555;font-size:16px;line-height:1.6;">
                  Click the button below to set up your account. This link expires in 7 days.
                </p>
                <div style="text-align:center;margin:32px 0;">
                  <a href="${link}" style="background:#D4AF37;color:#000;padding:14px 32px;text-decoration:none;font-weight:700;font-size:16px;border-radius:4px;display:inline-block;">
                    Accept Invitation
                  </a>
                </div>
                <p style="color:#999;font-size:13px;">
                  If the button doesn't work, copy and paste this link:<br>
                  <a href="${link}" style="color:#D4AF37;">${link}</a>
                </p>
              </div>
              <div style="padding:16px 32px;background:#f5f5f5;font-size:12px;color:#999;">
                BERG Collective — bergcollective.org
              </div>
            </div>
          `,
        });
        emailSent = true;
      } catch (err) {
        console.error('[Resend] Failed to send invite email:', err);
      }
    }

    res.status(201).json({ invite, link, emailSent });
  } catch (err) {
    console.error('Invite error:', err);
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

// POST /accept-invite — Accept invite and create account (PUBLIC — no auth)
router.post('/accept-invite', async (req, res) => {
  try {
    const pool = getPool();
    const { token, name, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    // Find valid invite
    const { rows: invites } = await pool.query(
      'SELECT * FROM invites WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
      [token]
    );

    if (!invites[0]) {
      return res.status(400).json({ error: 'Invalid or expired invite link' });
    }

    const invite = invites[0];

    // Check if user already exists
    const { rows: existingUser } = await pool.query('SELECT id FROM users WHERE email = $1', [invite.email]);
    if (existingUser[0]) {
      // Mark invite as used
      await pool.query('UPDATE invites SET used = TRUE WHERE id = $1', [invite.id]);
      return res.status(409).json({ error: 'An account with this email already exists. Please log in instead.' });
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 12);
    const { rows: newUser } = await pool.query(
      'INSERT INTO users (email, name, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [invite.email, name || null, invite.role, hashedPassword]
    );

    // Mark invite as used
    await pool.query('UPDATE invites SET used = TRUE WHERE id = $1', [invite.id]);

    // Log them in
    const user = newUser[0];
    const { accessToken, refreshToken } = generateTokens(user);
    res.cookie('access_token', accessToken, { httpOnly: true, sameSite: 'strict', maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { httpOnly: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.status(201).json({ user });
  } catch (err) {
    console.error('Accept invite error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// GET /invites — List pending invites (admin only)
router.get('/invites', adminAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id, email, role, expires_at, used, created_at FROM invites ORDER BY created_at DESC'
    );
    res.json({ invites: rows });
  } catch (err) {
    console.error('List invites error:', err);
    res.status(500).json({ error: 'Failed to load invites' });
  }
});

// PUT /:id — Update name, role, password
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const pool = getPool();
    const { name, role, password } = req.body;
    const targetId = parseInt(req.params.id, 10);

    const { rows: existing } = await pool.query('SELECT * FROM users WHERE id = $1', [targetId]);
    const user = existing[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

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
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /:id — Delete user
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const pool = getPool();
    const targetId = parseInt(req.params.id, 10);

    if (targetId === req.user.id) {
      return res.status(403).json({ error: 'You cannot delete your own account' });
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [targetId]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });

    await pool.query('DELETE FROM users WHERE id = $1', [targetId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
