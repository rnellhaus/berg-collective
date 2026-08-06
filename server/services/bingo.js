import crypto from 'crypto';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { JWT_SECRET } from '../middleware/auth.js';

export const BINGO_SESSION_COOKIE = 'bingo_session';
export const BINGO_SESSION_DAYS = 7;
export const MAGIC_LINK_MINUTES = 10;

const CONNECTION_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeJoinCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);
}

export function hashToken(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function createRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function createConnectionCode(length = 8) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let index = 0; index < length; index += 1) {
    code += CONNECTION_ALPHABET[bytes[index] % CONNECTION_ALPHABET.length];
  }
  return code;
}

export function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function qrSigningSecret() {
  return process.env.BINGO_QR_SECRET || JWT_SECRET;
}

export function createPersonalQrToken(playerId, gameId) {
  const payload = Buffer.from(`${gameId}:${playerId}`).toString('base64url');
  const signature = crypto
    .createHmac('sha256', qrSigningSecret())
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyPersonalQrToken(token) {
  try {
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) return null;
    const expected = crypto
      .createHmac('sha256', qrSigningSecret())
      .update(payload)
      .digest('base64url');
    const suppliedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      suppliedBuffer.length !== expectedBuffer.length
      || !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)
    ) {
      return null;
    }
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator === -1) return null;
    const gameId = Number(decoded.slice(0, separator));
    const playerId = decoded.slice(separator + 1);
    if (!Number.isInteger(gameId) || !/^[0-9a-f-]{36}$/i.test(playerId)) {
      return null;
    }
    return { gameId, playerId };
  } catch {
    return null;
  }
}

export function getPublicSiteUrl() {
  const value = process.env.PUBLIC_SITE_URL
    || process.env.FRONTEND_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || 'http://localhost:5173';
  return value.replace(/\/+$/, '');
}

export function getRequestIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export function hashRequestIp(req) {
  return crypto
    .createHmac('sha256', process.env.BINGO_QR_SECRET || JWT_SECRET)
    .update(getRequestIp(req))
    .digest('hex');
}

export function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function formatPlace(place) {
  if (!place) return null;
  const mod100 = place % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${place}th`;
  const suffix = place % 10 === 1 ? 'st' : place % 10 === 2 ? 'nd' : place % 10 === 3 ? 'rd' : 'th';
  return `${place}${suffix}`;
}

export async function getGameByCode(queryable, code, { includeArchived = false } = {}) {
  const normalized = normalizeJoinCode(code);
  if (!normalized) return null;
  const { rows } = await queryable.query(
    `SELECT bg.*, e.title AS event_title, e.date AS event_date,
       e.time AS event_time, e.location AS event_location
     FROM bingo_games bg
     JOIN events e ON e.id = bg.event_id
     WHERE bg.join_code = $1
       ${includeArchived ? '' : "AND bg.status <> 'archived'"}`,
    [normalized]
  );
  return rows[0] || null;
}

export async function getPlayerState(queryable, participantId, gameCode) {
  const game = await getGameByCode(queryable, gameCode);
  if (!game) return null;

  const { rows: playerRows } = await queryable.query(
    `SELECT bp.*, bpa.email
     FROM bingo_players bp
     JOIN bingo_participants bpa ON bpa.id = bp.participant_id
     WHERE bp.game_id = $1 AND bp.participant_id = $2`,
    [game.id, participantId]
  );
  const player = playerRows[0];

  if (!player) {
    return {
      game: serializePublicGame(game),
      player: null,
      prompts: [],
      connections: [],
    };
  }

  const { rows: prompts } = await queryable.query(
    `SELECT bpp.id, bpp.position, bpp.completed_at,
       bpp.completed_with_player_id,
       p.id AS prompt_id, p.prompt_text, p.helper_text, p.category,
       target.display_name AS completed_with_name
     FROM bingo_player_prompts bpp
     JOIN bingo_prompts p ON p.id = bpp.prompt_id
     LEFT JOIN bingo_players target ON target.id = bpp.completed_with_player_id
     WHERE bpp.player_id = $1
     ORDER BY bpp.position`,
    [player.id]
  );

  // Connections are stored directionally so that A scanning B advances A and
  // B scanning A advances B. Both rows are kept for progress and analytics,
  // but the participant-facing list collapses to one card per human via
  // DISTINCT ON, otherwise a reciprocal scan shows the same person twice.
  const { rows: connections } = await queryable.query(
    `SELECT * FROM (
       SELECT DISTINCT ON (other.id)
         c.id, c.created_at, p.prompt_text,
         other.id AS player_id,
         other.display_name,
         other.company,
         other.job_title,
         CASE WHEN bg.contact_sharing_enabled AND other.share_linkedin
           THEN other.linkedin_url ELSE '' END AS linkedin_url,
         CASE WHEN bg.contact_sharing_enabled AND other.share_email
           THEN other_account.email ELSE '' END AS email
       FROM bingo_connections c
       JOIN bingo_games bg ON bg.id = c.game_id
       JOIN bingo_prompts p ON p.id = c.prompt_id
       JOIN bingo_players other
         ON other.id = CASE
           WHEN c.scanner_player_id = $1 THEN c.target_player_id
           ELSE c.scanner_player_id
         END
       JOIN bingo_participants other_account ON other_account.id = other.participant_id
       WHERE (c.scanner_player_id = $1 OR c.target_player_id = $1)
         AND other.status = 'active'
       ORDER BY other.id, c.created_at DESC
     ) unique_pairings
     ORDER BY created_at DESC`,
    [player.id]
  );

  const currentPrompt = prompts.find((prompt) => !prompt.completed_at) || null;

  return {
    game: serializePublicGame(game),
    player: {
      id: player.id,
      display_name: player.display_name,
      company: player.company,
      job_title: player.job_title,
      linkedin_url: player.linkedin_url,
      share_email: player.share_email,
      share_linkedin: player.share_linkedin,
      connection_code: player.connection_code,
      status: player.status,
      completed_count: player.completed_count,
      finish_place: player.finish_place,
      finish_label: formatPlace(player.finish_place),
      completed_at: player.completed_at,
      email: player.email,
      qr_token: createPersonalQrToken(player.id, game.id),
    },
    prompts,
    current_prompt: currentPrompt,
    connections,
  };
}

export function serializePublicGame(game) {
  return {
    id: game.id,
    title: game.title,
    join_code: game.join_code,
    instructions: game.instructions,
    status: game.status,
    prompt_count: game.prompt_count,
    leaderboard_public: game.leaderboard_public,
    contact_sharing_enabled: game.contact_sharing_enabled,
    starts_at: game.starts_at,
    ends_at: game.ends_at,
    event: {
      id: game.event_id,
      title: game.event_title,
      date: game.event_date,
      time: game.event_time,
      location: game.event_location,
    },
  };
}
