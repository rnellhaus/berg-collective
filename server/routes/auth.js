import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { Resend } from 'resend';
import { getPool } from '../db/connection.js';
import { generateTokens, verifyRefreshToken, JWT_SECRET } from '../middleware/auth.js';

const router = Router();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Try again in a minute.' },
});

// Stricter limiter for reset requests to slow enumeration / email spam.
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many reset requests. Please try again later.' },
});

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production' || !!process.env.VERCEL,
};

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    res.cookie('access_token', accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies.refresh_token;
    if (!token) return res.status(401).json({ error: 'No refresh token' });

    const decoded = verifyRefreshToken(token);
    const pool = getPool();
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'User not found' });

    const { accessToken, refreshToken } = generateTokens(user);
    res.cookie('access_token', accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const pool = getPool();
    const { rows } = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [decoded.id]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json({ user });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /api/auth/forgot-password — request a reset link (PUBLIC)
// Always returns a generic success to avoid revealing which emails exist.
router.post('/forgot-password', forgotLimiter, async (req, res) => {
  const generic = { message: 'If an account exists for that email, a reset link has been sent.' };
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const pool = getPool();
    const { rows } = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
    const user = rows[0];

    // No such user — respond identically, do nothing.
    if (!user) return res.json(generic);

    // Invalidate any prior unused tokens for this user.
    await pool.query('UPDATE password_resets SET used = TRUE WHERE user_id = $1 AND used = FALSE', [user.id]);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await pool.query(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt.toISOString()]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'https://berg-collective-web.vercel.app';
    const link = `${frontendUrl}/admin/reset-password?token=${token}`;

    if (resend) {
      try {
        await resend.emails.send({
          from: 'BERG Collective <info@bergcollective.org>',
          to: user.email,
          subject: 'Reset your BERG Collective password',
          html: `
            <div style="font-family:'Nunito',Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#000;padding:24px 32px;">
                <h1 style="color:#D4AF37;font-size:18px;margin:0;">BERG Collective</h1>
              </div>
              <div style="padding:32px;">
                <h2 style="color:#000;font-size:22px;margin:0 0 16px;">Reset Your Password</h2>
                <p style="color:#555;font-size:16px;line-height:1.6;">
                  We received a request to reset the password for your admin account
                  (<strong>${user.email}</strong>). Click the button below to choose a new password.
                  This link expires in 1 hour.
                </p>
                <div style="text-align:center;margin:32px 0;">
                  <a href="${link}" style="background:#D4AF37;color:#000;padding:14px 32px;text-decoration:none;font-weight:700;font-size:16px;border-radius:4px;display:inline-block;">
                    Reset Password
                  </a>
                </div>
                <p style="color:#999;font-size:13px;">
                  If the button doesn't work, copy and paste this link:<br>
                  <a href="${link}" style="color:#D4AF37;">${link}</a>
                </p>
                <p style="color:#999;font-size:13px;">
                  If you didn't request this, you can safely ignore this email — your password won't change.
                </p>
              </div>
              <div style="padding:16px 32px;background:#f5f5f5;font-size:12px;color:#999;">
                BERG Collective — bergcollective.org
              </div>
            </div>
          `,
        });
      } catch (err) {
        console.error('[Resend] Failed to send reset email:', err);
      }
    }

    res.json(generic);
  } catch (err) {
    console.error('Forgot password error:', err);
    // Still return generic to avoid leaking internal state.
    res.json(generic);
  }
});

// POST /api/auth/reset-password — set a new password using a token (PUBLIC)
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT * FROM password_resets WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
      [token]
    );
    const reset = rows[0];
    if (!reset) return res.status(400).json({ error: 'Invalid or expired reset link' });

    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, reset.user_id]);
    await pool.query('UPDATE password_resets SET used = TRUE WHERE id = $1', [reset.id]);

    res.json({ message: 'Password updated. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
