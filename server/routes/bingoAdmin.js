import crypto from 'crypto';
import { Router } from 'express';
import { getPool } from '../db/connection.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  getPublicSiteUrl,
  normalizeJoinCode,
} from '../services/bingo.js';

const router = Router();
router.use(verifyToken);

const STARTER_PROMPTS = [
  'Ask someone what brought them to this event.',
  'Find someone in a different industry and ask what excites them about their work.',
  'Ask someone about a project they are proud of.',
  'Find someone from a different city and exchange a local recommendation.',
  'Ask someone which skill they are learning right now.',
  'Meet someone new and discover three things you have in common.',
  'Ask someone about a mentor or lesson that shaped their career.',
  'Find someone at a different career stage and exchange one piece of advice.',
  'Ask someone what problem they would love to solve.',
  'Find someone who changed roles or industries and ask what helped them make the move.',
  'Ask someone about a community they care about.',
  'Find one way you and someone new could help each other after this event.',
];

const STATUS_TRANSITIONS = {
  draft: new Set(['registration']),
  registration: new Set(['draft', 'live', 'ended']),
  live: new Set(['paused', 'ended']),
  paused: new Set(['live', 'ended']),
  ended: new Set(['archived']),
  archived: new Set(),
};

function requestError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function nullableDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw requestError(400, 'Enter a valid date and time');
  return date.toISOString();
}

async function loadGame(queryable, id) {
  const { rows } = await queryable.query(
    `SELECT bg.*, e.title AS event_title, e.date AS event_date,
       e.time AS event_time, e.location AS event_location,
       creator.name AS created_by_name,
       (SELECT COUNT(*)::int FROM bingo_players bp WHERE bp.game_id = bg.id) AS player_count,
       (SELECT COUNT(*)::int FROM bingo_prompts pr WHERE pr.game_id = bg.id AND pr.is_active) AS active_prompt_count
     FROM bingo_games bg
     JOIN events e ON e.id = bg.event_id
     LEFT JOIN users creator ON creator.id = bg.created_by
     WHERE bg.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function loadPrompts(queryable, gameId) {
  const { rows } = await queryable.query(
    `SELECT id, prompt_text, helper_text, category, sort_order, is_active,
       created_at, updated_at
     FROM bingo_prompts
     WHERE game_id = $1
     ORDER BY sort_order, id`,
    [gameId]
  );
  return rows;
}

async function assertPromptEditable(queryable, gameId) {
  const game = await loadGame(queryable, gameId);
  if (!game) throw requestError(404, 'Game not found');
  if (game.status !== 'draft') {
    throw requestError(409, 'Prompts are locked after registration opens');
  }
  if (game.player_count > 0) {
    throw requestError(409, 'Prompts are locked because players have already joined');
  }
  return game;
}

function makeDefaultJoinCode(title) {
  const base = normalizeJoinCode(title)
    .split('-')
    .filter(Boolean)
    .slice(0, 2)
    .join('-')
    .slice(0, 14);
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${base || 'BERG'}-${suffix}`;
}

function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

router.get('/games', async (req, res) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT bg.id, bg.event_id, bg.title, bg.join_code, bg.status,
         bg.prompt_count, bg.starts_at, bg.ends_at, bg.created_at, bg.updated_at,
         e.title AS event_title, e.date AS event_date, e.location AS event_location,
         (SELECT COUNT(*)::int FROM bingo_players bp WHERE bp.game_id = bg.id) AS player_count,
         (SELECT COUNT(*)::int FROM bingo_connections bc WHERE bc.game_id = bg.id) AS connection_count,
         (SELECT COUNT(*)::int FROM bingo_players bp
           WHERE bp.game_id = bg.id AND bp.finish_place IS NOT NULL) AS finisher_count
       FROM bingo_games bg
       JOIN events e ON e.id = bg.event_id
       WHERE ($1::text IS NULL OR bg.status = $1)
       ORDER BY
         CASE bg.status
           WHEN 'live' THEN 1
           WHEN 'paused' THEN 2
           WHEN 'registration' THEN 3
           WHEN 'draft' THEN 4
           WHEN 'ended' THEN 5
           ELSE 6
         END,
         COALESCE(bg.starts_at, e.date::timestamptz, bg.created_at) DESC`,
      [req.query.status || null]
    );
    return res.json({ games: rows });
  } catch (error) {
    console.error('List bingo games error:', error);
    return res.status(500).json({ error: 'Failed to load bingo games' });
  }
});

router.post('/games', async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const eventId = parseId(req.body.event_id);
    const title = cleanText(req.body.title, 140);
    if (!eventId) throw requestError(400, 'Choose an event');
    if (title.length < 3) throw requestError(400, 'Enter a game title');

    const requestedCode = normalizeJoinCode(req.body.join_code);
    const joinCode = requestedCode || makeDefaultJoinCode(title);
    if (joinCode.length < 4) throw requestError(400, 'Join code must be at least 4 characters');

    const promptCount = Number(req.body.prompt_count || 12);
    if (!Number.isInteger(promptCount) || promptCount < 3 || promptCount > 50) {
      throw requestError(400, 'Prompt count must be between 3 and 50');
    }

    await client.query('BEGIN');
    const { rows: eventRows } = await client.query(
      'SELECT id, title FROM events WHERE id = $1',
      [eventId]
    );
    if (!eventRows[0]) throw requestError(404, 'Event not found');

    const { rows } = await client.query(
      `INSERT INTO bingo_games (
         event_id, title, join_code, instructions, prompt_count,
         leaderboard_public, contact_sharing_enabled, starts_at, ends_at,
         created_by, updated_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
       RETURNING id`,
      [
        eventId,
        title,
        joinCode,
        cleanText(req.body.instructions, 1200),
        promptCount,
        req.body.leaderboard_public !== false,
        req.body.contact_sharing_enabled !== false,
        nullableDate(req.body.starts_at),
        nullableDate(req.body.ends_at),
        req.user.id,
      ]
    );
    const gameId = rows[0].id;

    for (let index = 0; index < STARTER_PROMPTS.length; index += 1) {
      await client.query(
        `INSERT INTO bingo_prompts (
           game_id, prompt_text, category, sort_order
         ) VALUES ($1, $2, 'conversation', $3)`,
        [gameId, STARTER_PROMPTS[index], index + 1]
      );
    }

    await client.query(
      `INSERT INTO bingo_activity_log (
         game_id, actor_admin_id, activity_type, metadata
       ) VALUES ($1, $2, 'game_created', $3)`,
      [gameId, req.user.id, { event_id: eventId }]
    );
    await client.query('COMMIT');

    const game = await loadGame(pool, gameId);
    const prompts = await loadPrompts(pool, gameId);
    return res.status(201).json({ game, prompts });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ error: 'That join code is already in use' });
    }
    console.error('Create bingo game error:', error.status ? error.message : error);
    return res.status(error.status || 500).json({
      error: error.status ? error.message : 'Failed to create bingo game',
    });
  } finally {
    client.release();
  }
});

router.get('/games/:id', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid game ID' });
    const pool = getPool();
    const game = await loadGame(pool, id);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    const prompts = await loadPrompts(pool, id);
    return res.json({
      game: {
        ...game,
        public_url: `${getPublicSiteUrl()}/bingo/${game.join_code}`,
      },
      prompts,
    });
  } catch (error) {
    console.error('Load bingo game error:', error);
    return res.status(500).json({ error: 'Failed to load bingo game' });
  }
});

router.put('/games/:id', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid game ID' });
    const pool = getPool();
    const game = await loadGame(pool, id);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    const title = req.body.title === undefined ? game.title : cleanText(req.body.title, 140);
    if (title.length < 3) throw requestError(400, 'Enter a game title');

    let joinCode = game.join_code;
    let promptCount = game.prompt_count;
    if (game.status === 'draft') {
      if (req.body.join_code !== undefined) {
        joinCode = normalizeJoinCode(req.body.join_code);
        if (joinCode.length < 4) throw requestError(400, 'Join code must be at least 4 characters');
      }
      if (req.body.prompt_count !== undefined) {
        promptCount = Number(req.body.prompt_count);
        if (!Number.isInteger(promptCount) || promptCount < 3 || promptCount > 50) {
          throw requestError(400, 'Prompt count must be between 3 and 50');
        }
      }
    }

    await pool.query(
      `UPDATE bingo_games SET
         title = $1,
         join_code = $2,
         instructions = $3,
         prompt_count = $4,
         leaderboard_public = $5,
         contact_sharing_enabled = $6,
         starts_at = $7,
         ends_at = $8,
         updated_by = $9,
         updated_at = NOW()
       WHERE id = $10`,
      [
        title,
        joinCode,
        req.body.instructions === undefined
          ? game.instructions
          : cleanText(req.body.instructions, 1200),
        promptCount,
        req.body.leaderboard_public === undefined
          ? game.leaderboard_public
          : req.body.leaderboard_public === true,
        req.body.contact_sharing_enabled === undefined
          ? game.contact_sharing_enabled
          : req.body.contact_sharing_enabled === true,
        req.body.starts_at === undefined ? game.starts_at : nullableDate(req.body.starts_at),
        req.body.ends_at === undefined ? game.ends_at : nullableDate(req.body.ends_at),
        req.user.id,
        id,
      ]
    );
    return res.json({ game: await loadGame(pool, id) });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'That join code is already in use' });
    }
    console.error('Update bingo game error:', error.status ? error.message : error);
    return res.status(error.status || 500).json({
      error: error.status ? error.message : 'Failed to update bingo game',
    });
  }
});

router.post('/games/:id/status', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    const nextStatus = cleanText(req.body.status, 20);
    if (!id) return res.status(400).json({ error: 'Invalid game ID' });
    const pool = getPool();
    const game = await loadGame(pool, id);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (nextStatus === game.status) return res.json({ game });
    if (!STATUS_TRANSITIONS[game.status]?.has(nextStatus)) {
      return res.status(409).json({
        error: `A ${game.status} game cannot move directly to ${nextStatus}`,
      });
    }
    if (['registration', 'live'].includes(nextStatus) && game.active_prompt_count < game.prompt_count) {
      return res.status(409).json({
        error: `Add at least ${game.prompt_count} active prompts before opening the game`,
      });
    }
    if (nextStatus === 'draft' && game.player_count > 0) {
      return res.status(409).json({ error: 'A game with registered players cannot return to draft' });
    }

    await pool.query(
      `UPDATE bingo_games SET
         status = $1,
         ended_at = CASE WHEN $1 = 'ended' THEN NOW() ELSE ended_at END,
         updated_by = $2,
         updated_at = NOW()
       WHERE id = $3`,
      [nextStatus, req.user.id, id]
    );
    await pool.query(
      `INSERT INTO bingo_activity_log (
         game_id, actor_admin_id, activity_type, metadata
       ) VALUES ($1, $2, 'status_changed', $3)`,
      [id, req.user.id, { from: game.status, to: nextStatus }]
    );
    return res.json({ game: await loadGame(pool, id) });
  } catch (error) {
    console.error('Change bingo status error:', error);
    return res.status(error.status || 500).json({
      error: error.status ? error.message : 'Failed to change game status',
    });
  }
});

router.delete('/games/:id', requireRole('admin'), async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid game ID' });
    const pool = getPool();
    const game = await loadGame(pool, id);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (game.status !== 'draft' || game.player_count > 0) {
      return res.status(409).json({ error: 'Only empty draft games can be deleted' });
    }
    await pool.query('DELETE FROM bingo_games WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete bingo game error:', error);
    return res.status(500).json({ error: 'Failed to delete bingo game' });
  }
});

router.post('/games/:id/prompts', async (req, res) => {
  try {
    const gameId = parseId(req.params.id);
    if (!gameId) return res.status(400).json({ error: 'Invalid game ID' });
    const pool = getPool();
    await assertPromptEditable(pool, gameId);
    const promptText = cleanText(req.body.prompt_text, 500);
    if (promptText.length < 3) return res.status(400).json({ error: 'Enter a prompt' });
    const { rows: orderRows } = await pool.query(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM bingo_prompts WHERE game_id = $1',
      [gameId]
    );
    const { rows } = await pool.query(
      `INSERT INTO bingo_prompts (
         game_id, prompt_text, helper_text, category, sort_order
       ) VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        gameId,
        promptText,
        cleanText(req.body.helper_text, 300),
        cleanText(req.body.category, 40) || 'conversation',
        orderRows[0].next_order,
      ]
    );
    return res.status(201).json({ prompt: rows[0] });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.status ? error.message : 'Failed to add prompt',
    });
  }
});

router.put('/games/:id/prompts/:promptId', async (req, res) => {
  try {
    const gameId = parseId(req.params.id);
    const promptId = parseId(req.params.promptId);
    if (!gameId || !promptId) return res.status(400).json({ error: 'Invalid prompt' });
    const pool = getPool();
    await assertPromptEditable(pool, gameId);
    const { rows: existingRows } = await pool.query(
      'SELECT * FROM bingo_prompts WHERE id = $1 AND game_id = $2',
      [promptId, gameId]
    );
    const prompt = existingRows[0];
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    const promptText = req.body.prompt_text === undefined
      ? prompt.prompt_text
      : cleanText(req.body.prompt_text, 500);
    if (promptText.length < 3) return res.status(400).json({ error: 'Enter a prompt' });

    const { rows } = await pool.query(
      `UPDATE bingo_prompts SET
         prompt_text = $1,
         helper_text = $2,
         category = $3,
         sort_order = $4,
         is_active = $5,
         updated_at = NOW()
       WHERE id = $6 AND game_id = $7
       RETURNING *`,
      [
        promptText,
        req.body.helper_text === undefined
          ? prompt.helper_text
          : cleanText(req.body.helper_text, 300),
        req.body.category === undefined
          ? prompt.category
          : cleanText(req.body.category, 40) || 'conversation',
        req.body.sort_order === undefined
          ? prompt.sort_order
          : Number(req.body.sort_order) || prompt.sort_order,
        req.body.is_active === undefined ? prompt.is_active : req.body.is_active === true,
        promptId,
        gameId,
      ]
    );
    return res.json({ prompt: rows[0] });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.status ? error.message : 'Failed to update prompt',
    });
  }
});

router.delete('/games/:id/prompts/:promptId', async (req, res) => {
  try {
    const gameId = parseId(req.params.id);
    const promptId = parseId(req.params.promptId);
    if (!gameId || !promptId) return res.status(400).json({ error: 'Invalid prompt' });
    const pool = getPool();
    await assertPromptEditable(pool, gameId);
    const result = await pool.query(
      'DELETE FROM bingo_prompts WHERE id = $1 AND game_id = $2',
      [promptId, gameId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Prompt not found' });
    return res.json({ success: true });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.status ? error.message : 'Failed to delete prompt',
    });
  }
});

router.get('/games/:id/dashboard', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid game ID' });
    const pool = getPool();
    const game = await loadGame(pool, id);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    const { rows: statsRows } = await pool.query(
      `SELECT
         COUNT(*)::int AS registered,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE finish_place IS NOT NULL)::int AS finishers,
         COALESCE(AVG(completed_count), 0)::numeric(10,1) AS average_completed,
         COALESCE(SUM(completed_count), 0)::int AS completed_prompts
       FROM bingo_players
       WHERE game_id = $1`,
      [id]
    );
    const { rows: connectionRows } = await pool.query(
      'SELECT COUNT(*)::int AS connections FROM bingo_connections WHERE game_id = $1',
      [id]
    );
    const { rows: players } = await pool.query(
      `SELECT bp.id, bp.display_name, bp.company, bp.job_title, bp.status,
         bp.completed_count, bp.finish_place, bp.completed_at, bp.joined_at,
         bp.last_seen_at, bpa.email
       FROM bingo_players bp
       JOIN bingo_participants bpa ON bpa.id = bp.participant_id
       WHERE bp.game_id = $1
       ORDER BY
         CASE WHEN bp.finish_place IS NULL THEN 1 ELSE 0 END,
         bp.finish_place,
         bp.completed_count DESC,
         bp.joined_at`,
      [id]
    );
    const { rows: recentConnections } = await pool.query(
      `SELECT bc.id, bc.created_at, scanner.display_name AS scanner_name,
         target.display_name AS target_name, p.prompt_text
       FROM bingo_connections bc
       JOIN bingo_players scanner ON scanner.id = bc.scanner_player_id
       JOIN bingo_players target ON target.id = bc.target_player_id
       JOIN bingo_prompts p ON p.id = bc.prompt_id
       WHERE bc.game_id = $1
       ORDER BY bc.created_at DESC
       LIMIT 30`,
      [id]
    );

    return res.json({
      game,
      stats: {
        ...statsRows[0],
        connections: connectionRows[0].connections,
      },
      players,
      recent_connections: recentConnections,
    });
  } catch (error) {
    console.error('Load bingo dashboard error:', error);
    return res.status(500).json({ error: 'Failed to load the live dashboard' });
  }
});

router.patch('/games/:id/players/:playerId', async (req, res) => {
  try {
    const gameId = parseId(req.params.id);
    const status = cleanText(req.body.status, 20);
    if (!gameId || !['active', 'suspended', 'withdrawn'].includes(status)) {
      return res.status(400).json({ error: 'Choose a valid player status' });
    }
    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE bingo_players SET status = $1
       WHERE id = $2 AND game_id = $3
       RETURNING id, display_name, status`,
      [status, req.params.playerId, gameId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Player not found' });
    await pool.query(
      `INSERT INTO bingo_activity_log (
         game_id, player_id, actor_admin_id, activity_type, metadata
       ) VALUES ($1, $2, $3, 'player_status_changed', $4)`,
      [gameId, req.params.playerId, req.user.id, { status }]
    );
    return res.json({ player: rows[0] });
  } catch (error) {
    console.error('Update bingo player error:', error);
    return res.status(500).json({ error: 'Failed to update player' });
  }
});

router.delete('/games/:id/connections/:connectionId', requireRole('admin'), async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const gameId = parseId(req.params.id);
    if (!gameId) throw requestError(400, 'Invalid game ID');
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT bc.*, bp.completed_at AS player_completed_at
       FROM bingo_connections bc
       JOIN bingo_players bp ON bp.id = bc.scanner_player_id
       WHERE bc.id = $1 AND bc.game_id = $2
       FOR UPDATE OF bc, bp`,
      [req.params.connectionId, gameId]
    );
    const connection = rows[0];
    if (!connection) throw requestError(404, 'Connection not found');
    await client.query('DELETE FROM bingo_connections WHERE id = $1', [connection.id]);
    await client.query(
      `UPDATE bingo_player_prompts SET
         completed_at = NULL,
         completed_with_player_id = NULL
       WHERE id = $1`,
      [connection.player_prompt_id]
    );
    await client.query(
      `UPDATE bingo_players SET
         completed_count = GREATEST(completed_count - 1, 0),
         completed_at = NULL,
         finish_place = NULL
       WHERE id = $1`,
      [connection.scanner_player_id]
    );
    await client.query(
      `INSERT INTO bingo_activity_log (
         game_id, player_id, actor_admin_id, activity_type, metadata
       ) VALUES ($1, $2, $3, 'connection_revoked', $4)`,
      [
        gameId,
        connection.scanner_player_id,
        req.user.id,
        { connection_id: connection.id },
      ]
    );
    await client.query('COMMIT');
    return res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    return res.status(error.status || 500).json({
      error: error.status ? error.message : 'Failed to revoke connection',
    });
  } finally {
    client.release();
  }
});

router.get('/games/:id/export.csv', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid game ID' });
    const pool = getPool();
    const game = await loadGame(pool, id);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    const { rows } = await pool.query(
      `SELECT bp.display_name, bpa.email, bp.company, bp.job_title, bp.status,
         bp.completed_count, bp.finish_place, bp.joined_at, bp.completed_at,
         bp.share_email, bp.share_linkedin
       FROM bingo_players bp
       JOIN bingo_participants bpa ON bpa.id = bp.participant_id
       WHERE bp.game_id = $1
       ORDER BY bp.joined_at`,
      [id]
    );
    const headers = [
      'Name', 'Email', 'Company', 'Job title', 'Status', 'Prompts completed',
      'Finish place', 'Joined at', 'Completed at', 'Share email', 'Share LinkedIn',
    ];
    const lines = [
      headers.map(csvCell).join(','),
      ...rows.map((row) => [
        row.display_name,
        row.email,
        row.company,
        row.job_title,
        row.status,
        row.completed_count,
        row.finish_place,
        row.joined_at,
        row.completed_at,
        row.share_email,
        row.share_linkedin,
      ].map(csvCell).join(',')),
    ];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="bingo-${game.join_code.toLowerCase()}-participants.csv"`
    );
    return res.send(`\uFEFF${lines.join('\n')}`);
  } catch (error) {
    console.error('Export bingo players error:', error);
    return res.status(500).json({ error: 'Failed to export participants' });
  }
});

router.get('/games/:id/recap.csv', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid game ID' });
    const pool = getPool();
    const game = await loadGame(pool, id);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    const [{ rows: statsRows }, { rows: connectionRows }, { rows: winners }] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*)::int AS registered,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active,
           COUNT(*) FILTER (
             WHERE status = 'active' AND finish_place IS NOT NULL
           )::int AS finishers,
           COALESCE(
             AVG(completed_count) FILTER (WHERE status = 'active'),
             0
           )::numeric(10,1) AS average_completed,
           COALESCE(
             SUM(completed_count) FILTER (WHERE status = 'active'),
             0
           )::int AS completed_prompts
         FROM bingo_players
         WHERE game_id = $1`,
        [id]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS connections
         FROM bingo_connections
         WHERE game_id = $1`,
        [id]
      ),
      pool.query(
        `SELECT display_name, company, finish_place, completed_at
         FROM bingo_players
         WHERE game_id = $1
           AND status = 'active'
           AND finish_place BETWEEN 1 AND 3
         ORDER BY finish_place`,
        [id]
      ),
    ]);

    const stats = statsRows[0];
    const completionRate = stats.active
      ? (stats.finishers / stats.active) * 100
      : 0;
    const averageProgress = game.prompt_count
      ? (Number(stats.average_completed) / game.prompt_count) * 100
      : 0;
    const generatedAt = new Date().toISOString();

    const lines = [
      ['BERGHAUS Networking Bingo — Event Recap'],
      ['Generated at (UTC)', generatedAt],
      [],
      ['Event details'],
      ['Event', 'Value'],
      ['Event', game.event_title],
      ['Game', game.title],
      ['Event date', game.event_date],
      ['Location', game.event_location],
      ['Room code', game.join_code],
      ['Status', game.status],
      [],
      ['Engagement'],
      ['Metric', 'Value'],
      ['Registered participants', stats.registered],
      ['Active participants', stats.active],
      ['Finishers', stats.finishers],
      ['Completion rate', `${completionRate.toFixed(1)}%`],
      ['Connections recorded', connectionRows[0].connections],
      ['Prompts cleared', stats.completed_prompts],
      [
        'Average card progress',
        `${stats.average_completed} of ${game.prompt_count} (${averageProgress.toFixed(1)}%)`,
      ],
      [],
      ['Top three finishers'],
      ['Place', 'Name', 'Company', 'Completed at (UTC)'],
      ...winners.map((winner) => [
        winner.finish_place,
        winner.display_name,
        winner.company,
        winner.completed_at,
      ]),
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="bingo-${game.join_code.toLowerCase()}-shareable-recap.csv"`
    );
    return res.send(`\uFEFF${lines.map((line) => line.map(csvCell).join(',')).join('\n')}`);
  } catch (error) {
    console.error('Export bingo recap error:', error);
    return res.status(500).json({ error: 'Failed to export event recap' });
  }
});

export default router;
