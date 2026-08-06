import crypto from 'crypto';
import process from 'node:process';
import { getPool } from '../db/connection.js';
import {
  BINGO_SESSION_COOKIE,
  BINGO_SESSION_DAYS,
  hashToken,
} from '../services/bingo.js';

export function bingoCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' || !!process.env.VERCEL,
    path: '/',
  };
}

export function setBingoSessionCookie(res, token) {
  res.cookie(BINGO_SESSION_COOKIE, token, {
    ...bingoCookieOptions(),
    maxAge: BINGO_SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearBingoSessionCookie(res) {
  res.clearCookie(BINGO_SESSION_COOKIE, bingoCookieOptions());
}

export async function createBingoSession(queryable, participantId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + BINGO_SESSION_DAYS * 24 * 60 * 60 * 1000);
  await queryable.query(
    `INSERT INTO bingo_sessions (id, participant_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, participantId, hashToken(token), expiresAt.toISOString()]
  );
  return { token, expiresAt };
}

export async function optionalBingoParticipant(req, res, next) {
  const token = req.cookies[BINGO_SESSION_COOKIE];
  if (!token) {
    req.bingoParticipant = null;
    return next();
  }

  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT bp.id, bp.email, bp.display_name, bp.company, bp.job_title,
         bp.linkedin_url, bs.id AS session_id
       FROM bingo_sessions bs
       JOIN bingo_participants bp ON bp.id = bs.participant_id
       WHERE bs.token_hash = $1
         AND bs.revoked_at IS NULL
         AND bs.expires_at > NOW()`,
      [hashToken(token)]
    );
    req.bingoParticipant = rows[0] || null;
    return next();
  } catch (error) {
    return next(error);
  }
}

export async function requireBingoParticipant(req, res, next) {
  return optionalBingoParticipant(req, res, (error) => {
    if (error) return next(error);
    if (!req.bingoParticipant) {
      return res.status(401).json({ error: 'Participant sign-in required' });
    }
    return next();
  });
}
