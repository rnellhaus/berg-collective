import crypto from 'crypto';
import process from 'node:process';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Resend } from 'resend';
import { getPool } from '../db/connection.js';
import {
  clearBingoSessionCookie,
  createBingoSession,
  optionalBingoParticipant,
  requireBingoParticipant,
  setBingoSessionCookie,
} from '../middleware/bingoAuth.js';
import {
  MAGIC_LINK_MINUTES,
  createConnectionCode,
  createRandomToken,
  escapeHtml,
  getGameByCode,
  getPlayerState,
  getPublicSiteUrl,
  hashRequestIp,
  hashToken,
  isValidEmail,
  normalizeEmail,
  normalizeJoinCode,
  serializePublicGame,
  shuffle,
  verifyPersonalQrToken,
} from '../services/bingo.js';

const router = Router();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const magicLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-in requests. Please wait a few minutes and try again.' },
});

function requestError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function cleanLinkedInUrl(value) {
  const cleaned = cleanText(value, 300);
  if (!cleaned) return '';
  try {
    const url = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function publicRegistrationStatus(game) {
  return ['registration', 'live', 'paused'].includes(game.status);
}

async function loadLeaderboard(pool, gameId) {
  const { rows: finishers } = await pool.query(
    `SELECT id, display_name, company, finish_place, completed_at, completed_count
     FROM bingo_players
     WHERE game_id = $1 AND status = 'active' AND finish_place IS NOT NULL
     ORDER BY finish_place ASC
     LIMIT 10`,
    [gameId]
  );

  const { rows: connectors } = await pool.query(
    `SELECT id, display_name, company, completed_count, finish_place
     FROM bingo_players
     WHERE game_id = $1 AND status = 'active' AND completed_count > 0
     ORDER BY completed_count DESC, joined_at ASC
     LIMIT 10`,
    [gameId]
  );

  return { finishers, connectors };
}

// GET /api/bingo/games/:code — public game shell and current sign-in state.
router.get('/games/:code', optionalBingoParticipant, async (req, res) => {
  try {
    const pool = getPool();
    const game = await getGameByCode(pool, req.params.code);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    let joined = false;
    if (req.bingoParticipant) {
      const { rows } = await pool.query(
        `SELECT id FROM bingo_players
         WHERE game_id = $1 AND participant_id = $2`,
        [game.id, req.bingoParticipant.id]
      );
      joined = !!rows[0];
    }

    res.set('Cache-Control', 'no-store');
    return res.json({
      game: serializePublicGame(game),
      authenticated: !!req.bingoParticipant,
      joined,
      profile: req.bingoParticipant
        ? {
            display_name: req.bingoParticipant.display_name,
            company: req.bingoParticipant.company,
            job_title: req.bingoParticipant.job_title,
            linkedin_url: req.bingoParticipant.linkedin_url,
          }
        : null,
    });
  } catch (error) {
    console.error('Load bingo game error:', error);
    return res.status(500).json({ error: 'Failed to load this game' });
  }
});

// POST /api/bingo/games/:code/magic-link — request participant sign-in.
router.post('/games/:code/magic-link', magicLinkLimiter, async (req, res) => {
  const generic = {
    message: 'If that email can join this game, a sign-in link is on its way.',
  };

  try {
    const email = normalizeEmail(req.body.email);
    if (!isValidEmail(email) || email.length > 254) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }

    const pool = getPool();
    const game = await getGameByCode(pool, req.params.code);
    if (!game) return res.json(generic);
    if (!publicRegistrationStatus(game)) {
      return res.status(409).json({ error: 'Registration is not open for this game' });
    }

    const { rows: recentRows } = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM bingo_magic_links
       WHERE game_id = $1 AND email = $2
         AND created_at > NOW() - INTERVAL '15 minutes'`,
      [game.id, email]
    );
    if (recentRows[0].count >= 3) {
      return res.status(429).json({
        error: 'A link was already sent recently. Please check your inbox or wait a few minutes.',
      });
    }

    await pool.query(
      `UPDATE bingo_magic_links
       SET consumed_at = NOW()
       WHERE game_id = $1 AND email = $2
         AND consumed_at IS NULL`,
      [game.id, email]
    );

    const token = createRandomToken(32);
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + MAGIC_LINK_MINUTES * 60 * 1000);
    await pool.query(
      `INSERT INTO bingo_magic_links (
         id, game_id, email, token_hash, request_ip_hash, expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        id,
        game.id,
        email,
        hashToken(token),
        hashRequestIp(req),
        expiresAt.toISOString(),
      ]
    );

    const pendingPersonToken = cleanText(req.body.person_token, 300);
    const pendingPerson = verifyPersonalQrToken(pendingPersonToken);
    const safePersonToken = pendingPerson?.gameId === game.id ? pendingPersonToken : '';
    const siteUrl = getPublicSiteUrl();
    const linkParams = new URLSearchParams({
      token,
      game: game.join_code,
      ...(safePersonToken ? { person: safePersonToken } : {}),
    });
    const link = `${siteUrl}/bingo/auth?${linkParams.toString()}`;
    let emailSent = false;

    if (resend) {
      try {
        await resend.emails.send({
          from: process.env.BINGO_FROM_EMAIL || 'BERG Collective <info@bergcollective.org>',
          to: email,
          subject: `Join ${game.title}`,
          html: `
            <div style="background:#f4efe4;padding:32px 16px;font-family:Arial,sans-serif;color:#17261f">
              <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #d7cfbd">
                <div style="background:#10271e;padding:24px 30px">
                  <img src="${siteUrl}/images/logo.png" alt="BERG Collective" width="150" style="display:block;filter:brightness(0) invert(1)">
                </div>
                <div style="padding:34px 30px">
                  <p style="margin:0 0 10px;color:#98752e;font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase">Networking Bingo</p>
                  <h1 style="margin:0 0 16px;font-size:28px;line-height:1.15;color:#17261f">${escapeHtml(game.title)}</h1>
                  <p style="font-size:16px;line-height:1.65;color:#48554e">
                    Tap below to verify your email and join the game. The link expires in ${MAGIC_LINK_MINUTES} minutes.
                  </p>
                  <div style="margin:30px 0">
                    <a href="${link}" style="display:inline-block;background:#d8aa3c;color:#17261f;text-decoration:none;padding:14px 24px;font-weight:700;border-radius:2px">
                      Continue to Bingo
                    </a>
                  </div>
                  <p style="font-size:12px;line-height:1.5;color:#7d857f">
                    This link signs you into the BERG Networking Bingo experience. If you did not request it, you can ignore this message.
                  </p>
                </div>
              </div>
            </div>
          `,
          text: `Join ${game.title}\n\nOpen this secure link to continue: ${link}\n\nThe link expires in ${MAGIC_LINK_MINUTES} minutes.`,
          tags: [
            { name: 'category', value: 'bingo_magic_link' },
            { name: 'game_id', value: String(game.id) },
          ],
        });
        emailSent = true;
      } catch (emailError) {
        console.error('[Bingo] Failed to send magic link:', emailError);
      }
    }

    const response = { ...generic, emailSent };
    if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
      response.dev_magic_link = link;
    }
    return res.json(response);
  } catch (error) {
    console.error('Bingo magic-link request error:', error);
    return res.status(500).json({ error: 'Could not send a sign-in link right now' });
  }
});

// GET /api/bingo/auth/inspect — safe, non-consuming magic-link inspection.
router.get('/auth/inspect', async (req, res) => {
  try {
    const token = String(req.query.token || '');
    if (!token) return res.status(400).json({ error: 'Missing sign-in token' });
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT bg.title, bg.join_code, e.title AS event_title, bml.expires_at
       FROM bingo_magic_links bml
       JOIN bingo_games bg ON bg.id = bml.game_id
       JOIN events e ON e.id = bg.event_id
       WHERE bml.token_hash = $1
         AND bml.consumed_at IS NULL
         AND bml.expires_at > NOW()
         AND bg.status IN ('registration', 'live', 'paused')`,
      [hashToken(token)]
    );
    if (!rows[0]) return res.status(400).json({ error: 'This sign-in link is invalid or expired' });
    res.set('Cache-Control', 'no-store');
    return res.json({ link: rows[0] });
  } catch (error) {
    console.error('Inspect bingo magic link error:', error);
    return res.status(500).json({ error: 'Could not verify this link' });
  }
});

// POST /api/bingo/auth/redeem — consume magic link after explicit user action.
router.post('/auth/redeem', async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();
  let session;

  try {
    const token = String(req.body.token || '');
    if (!token) throw requestError(400, 'Missing sign-in token');

    await client.query('BEGIN');
    const { rows: linkRows } = await client.query(
      `SELECT bml.*, bg.join_code
       FROM bingo_magic_links bml
       JOIN bingo_games bg ON bg.id = bml.game_id
       WHERE bml.token_hash = $1
       FOR UPDATE`,
      [hashToken(token)]
    );
    const link = linkRows[0];
    if (
      !link
      || link.consumed_at
      || new Date(link.expires_at).getTime() <= Date.now()
    ) {
      throw requestError(400, 'This sign-in link is invalid or expired');
    }

    const participantId = crypto.randomUUID();
    const { rows: participantRows } = await client.query(
      `INSERT INTO bingo_participants (id, email, last_sign_in_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (email) DO UPDATE SET
         last_sign_in_at = NOW(),
         updated_at = NOW()
       RETURNING id, email, display_name, company, job_title, linkedin_url`,
      [participantId, link.email]
    );
    const participant = participantRows[0];

    await client.query(
      'UPDATE bingo_magic_links SET consumed_at = NOW() WHERE id = $1',
      [link.id]
    );
    session = await createBingoSession(client, participant.id);
    await client.query('COMMIT');

    setBingoSessionCookie(res, session.token);
    res.set('Cache-Control', 'no-store');
    return res.json({
      gameCode: link.join_code,
      participant: {
        display_name: participant.display_name,
        company: participant.company,
        job_title: participant.job_title,
        linkedin_url: participant.linkedin_url,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(error.status || 500).json({
      error: error.status ? error.message : 'Could not complete sign-in',
    });
  } finally {
    client.release();
  }
});

router.post('/auth/logout', async (req, res) => {
  try {
    const token = req.cookies.bingo_session;
    if (token) {
      const pool = getPool();
      await pool.query(
        'UPDATE bingo_sessions SET revoked_at = NOW() WHERE token_hash = $1',
        [hashToken(token)]
      );
    }
  } catch (error) {
    console.error('Bingo logout error:', error);
  }
  clearBingoSessionCookie(res);
  return res.json({ success: true });
});

router.get('/me', requireBingoParticipant, (req, res) => {
  res.set('Cache-Control', 'no-store');
  return res.json({ participant: req.bingoParticipant });
});

// POST /api/bingo/games/:code/join — create or update an event-scoped player.
router.post('/games/:code/join', requireBingoParticipant, async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const displayName = cleanText(req.body.display_name, 80);
    const company = cleanText(req.body.company, 120);
    const jobTitle = cleanText(req.body.job_title, 120);
    const linkedinUrl = cleanLinkedInUrl(req.body.linkedin_url);
    if (displayName.length < 2) {
      throw requestError(400, 'Enter the name you want other players to see');
    }

    await client.query('BEGIN');
    const game = await getGameByCode(client, req.params.code);
    if (!game) throw requestError(404, 'Game not found');
    if (!publicRegistrationStatus(game)) {
      throw requestError(409, 'Registration is not open for this game');
    }

    const shareEmail = game.contact_sharing_enabled && req.body.share_email === true;
    const shareLinkedin = game.contact_sharing_enabled
      && req.body.share_linkedin === true
      && !!linkedinUrl;

    await client.query(
      `UPDATE bingo_participants SET
         display_name = $1,
         company = $2,
         job_title = $3,
         linkedin_url = $4,
         updated_at = NOW()
       WHERE id = $5`,
      [displayName, company, jobTitle, linkedinUrl, req.bingoParticipant.id]
    );

    const { rows: existingRows } = await client.query(
      `SELECT * FROM bingo_players
       WHERE game_id = $1 AND participant_id = $2
       FOR UPDATE`,
      [game.id, req.bingoParticipant.id]
    );

    if (existingRows[0]) {
      await client.query(
        `UPDATE bingo_players SET
           display_name = $1,
           company = $2,
           job_title = $3,
           linkedin_url = $4,
           share_email = $5,
           share_linkedin = $6,
           last_seen_at = NOW()
         WHERE id = $7`,
        [
          displayName,
          company,
          jobTitle,
          linkedinUrl,
          shareEmail,
          shareLinkedin,
          existingRows[0].id,
        ]
      );
    } else {
      const { rows: promptRows } = await client.query(
        `SELECT id FROM bingo_prompts
         WHERE game_id = $1 AND is_active = TRUE
         ORDER BY sort_order, id`,
        [game.id]
      );
      if (promptRows.length < game.prompt_count) {
        throw requestError(409, 'This game is not ready yet. The host needs to add more prompts.');
      }

      const playerId = crypto.randomUUID();
      const connectionCode = createConnectionCode();
      await client.query(
        `INSERT INTO bingo_players (
           id, game_id, participant_id, display_name, company, job_title,
           linkedin_url, share_email, share_linkedin, connection_code
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          playerId,
          game.id,
          req.bingoParticipant.id,
          displayName,
          company,
          jobTitle,
          linkedinUrl,
          shareEmail,
          shareLinkedin,
          connectionCode,
        ]
      );

      const assigned = shuffle(promptRows).slice(0, game.prompt_count);
      for (let index = 0; index < assigned.length; index += 1) {
        await client.query(
          `INSERT INTO bingo_player_prompts (id, player_id, prompt_id, position)
           VALUES ($1, $2, $3, $4)`,
          [crypto.randomUUID(), playerId, assigned[index].id, index + 1]
        );
      }

      await client.query(
        `INSERT INTO bingo_activity_log (
           game_id, player_id, activity_type, metadata
         ) VALUES ($1, $2, 'player_joined', $3)`,
        [game.id, playerId, { source: 'magic_link' }]
      );
    }

    await client.query('COMMIT');
    const state = await getPlayerState(pool, req.bingoParticipant.id, game.join_code);
    res.set('Cache-Control', 'no-store');
    return res.status(existingRows[0] ? 200 : 201).json(state);
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Please try joining again' });
    }
    if (!error.status) {
      console.error('Join bingo game error:', error);
    }
    return res.status(error.status || 500).json({
      error: error.status ? error.message : 'Could not join this game',
    });
  } finally {
    client.release();
  }
});

router.get('/games/:code/player', requireBingoParticipant, async (req, res) => {
  try {
    const pool = getPool();
    const state = await getPlayerState(pool, req.bingoParticipant.id, req.params.code);
    if (!state) return res.status(404).json({ error: 'Game not found' });
    res.set('Cache-Control', 'no-store');
    return res.json(state);
  } catch (error) {
    console.error('Load bingo player state error:', error);
    return res.status(500).json({ error: 'Could not load your game' });
  }
});

// POST /api/bingo/games/:code/connect — complete the next prompt.
router.post('/games/:code/connect', requireBingoParticipant, async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();
  let gameCode;

  try {
    await client.query('BEGIN');
    const game = await getGameByCode(client, req.params.code);
    if (!game) throw requestError(404, 'Game not found');
    gameCode = game.join_code;
    if (game.status !== 'live') {
      throw requestError(409, game.status === 'paused' ? 'The host has paused the game' : 'This game is not live');
    }

    const { rows: scannerRows } = await client.query(
      `SELECT * FROM bingo_players
       WHERE game_id = $1 AND participant_id = $2
       FOR UPDATE`,
      [game.id, req.bingoParticipant.id]
    );
    const scanner = scannerRows[0];
    if (!scanner) throw requestError(403, 'Join the game before making a connection');
    if (scanner.status !== 'active') throw requestError(403, 'Your player access is not active');
    if (scanner.completed_at) throw requestError(409, 'You already completed this game');

    let target;
    const personToken = cleanText(req.body.person_token, 300);
    const connectionCode = normalizeJoinCode(req.body.connection_code);
    if (personToken) {
      const verified = verifyPersonalQrToken(personToken);
      if (!verified || verified.gameId !== game.id) {
        throw requestError(400, 'That player QR code is not valid for this game');
      }
      const { rows } = await client.query(
        'SELECT * FROM bingo_players WHERE id = $1 AND game_id = $2',
        [verified.playerId, game.id]
      );
      target = rows[0];
    } else if (connectionCode) {
      const { rows } = await client.query(
        `SELECT * FROM bingo_players
         WHERE game_id = $1 AND connection_code = $2`,
        [game.id, connectionCode]
      );
      target = rows[0];
    } else {
      throw requestError(400, 'Scan a player QR code or enter their connection code');
    }

    if (!target) throw requestError(404, 'Player not found in this game');
    if (target.id === scanner.id) throw requestError(409, 'You cannot scan your own code');
    if (target.status !== 'active') throw requestError(409, 'That player is not active');

    const { rows: duplicateRows } = await client.query(
      `SELECT id FROM bingo_connections
       WHERE scanner_player_id = $1 AND target_player_id = $2`,
      [scanner.id, target.id]
    );
    if (duplicateRows[0]) {
      throw requestError(409, 'You already completed a prompt with this person. Meet someone new!');
    }

    const { rows: promptRows } = await client.query(
      `SELECT bpp.*, p.prompt_text
       FROM bingo_player_prompts bpp
       JOIN bingo_prompts p ON p.id = bpp.prompt_id
       WHERE bpp.player_id = $1 AND bpp.completed_at IS NULL
       ORDER BY bpp.position
       LIMIT 1
       FOR UPDATE OF bpp`,
      [scanner.id]
    );
    const playerPrompt = promptRows[0];
    if (!playerPrompt) throw requestError(409, 'Every prompt is already complete');

    const connectionId = crypto.randomUUID();
    await client.query(
      `INSERT INTO bingo_connections (
         id, game_id, scanner_player_id, target_player_id,
         player_prompt_id, prompt_id
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        connectionId,
        game.id,
        scanner.id,
        target.id,
        playerPrompt.id,
        playerPrompt.prompt_id,
      ]
    );

    await client.query(
      `UPDATE bingo_player_prompts SET
         completed_with_player_id = $1,
         completed_at = NOW()
       WHERE id = $2`,
      [target.id, playerPrompt.id]
    );
    const { rows: progressRows } = await client.query(
      `UPDATE bingo_players SET
         completed_count = completed_count + 1,
         last_seen_at = NOW()
       WHERE id = $1
       RETURNING completed_count, completed_at`,
      [scanner.id]
    );

    let finishPlace = null;
    if (
      progressRows[0].completed_count >= game.prompt_count
      && !progressRows[0].completed_at
    ) {
      const { rows: placeRows } = await client.query(
        `UPDATE bingo_games SET
           next_finish_place = next_finish_place + 1,
           updated_at = NOW()
         WHERE id = $1
         RETURNING next_finish_place - 1 AS assigned_place`,
        [game.id]
      );
      finishPlace = placeRows[0].assigned_place;
      await client.query(
        `UPDATE bingo_players SET
           finish_place = $1,
           completed_at = NOW()
         WHERE id = $2`,
        [finishPlace, scanner.id]
      );
    }

    await client.query(
      `INSERT INTO bingo_activity_log (
         game_id, player_id, activity_type, metadata
       ) VALUES ($1, $2, $3, $4)`,
      [
        game.id,
        scanner.id,
        finishPlace ? 'game_completed' : 'connection_completed',
        {
          target_player_id: target.id,
          prompt_id: playerPrompt.prompt_id,
          connection_id: connectionId,
          finish_place: finishPlace,
        },
      ]
    );

    await client.query('COMMIT');
    const state = await getPlayerState(pool, req.bingoParticipant.id, gameCode);
    res.set('Cache-Control', 'no-store');
    return res.status(201).json({
      ...state,
      completed_connection: {
        id: connectionId,
        person: target.display_name,
        prompt: playerPrompt.prompt_text,
        finish_place: finishPlace,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ error: 'That connection was already recorded' });
    }
    if (!error.status) {
      console.error('Complete bingo connection error:', error);
    }
    return res.status(error.status || 500).json({
      error: error.status ? error.message : 'Could not record this connection',
    });
  } finally {
    client.release();
  }
});

router.get('/games/:code/leaderboard', requireBingoParticipant, async (req, res) => {
  try {
    const pool = getPool();
    const game = await getGameByCode(pool, req.params.code);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (!game.leaderboard_public) {
      return res.status(403).json({ error: 'The leaderboard is not enabled for this game' });
    }
    const { rows: playerRows } = await pool.query(
      `SELECT id FROM bingo_players
       WHERE game_id = $1 AND participant_id = $2`,
      [game.id, req.bingoParticipant.id]
    );
    if (!playerRows[0]) {
      return res.status(403).json({ error: 'Join the game to view its leaderboard' });
    }
    const leaderboard = await loadLeaderboard(pool, game.id);
    res.set('Cache-Control', 'no-store');
    return res.json({ game: serializePublicGame(game), ...leaderboard });
  } catch (error) {
    console.error('Load bingo leaderboard error:', error);
    return res.status(500).json({ error: 'Could not load the leaderboard' });
  }
});

export default router;
