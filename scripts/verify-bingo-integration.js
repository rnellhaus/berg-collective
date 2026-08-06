import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import process from 'node:process';
import { once } from 'node:events';

// Prevent server/index.js from binding its normal local port when imported here.
process.env.VERCEL = '1';

const [{ default: app }, { getPool }, { generateTokens }] = await Promise.all([
  import('../server/index.js'),
  import('../server/db/connection.js'),
  import('../server/middleware/auth.js'),
]);

const pool = getPool();
let server;
let createdGameId;
const testEmails = [];

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

function sessionCookie(response) {
  const setCookie = response.headers.get('set-cookie');
  assert.ok(setCookie, 'Magic-link redemption should set a participant session');
  return setCookie.split(';')[0];
}

async function createParticipant(baseUrl, gameId, gameCode, profile, index) {
  const email = `bingo-qa-${crypto.randomBytes(5).toString('hex')}@example.com`;
  const token = crypto.randomBytes(32).toString('base64url');
  testEmails.push(email);

  await pool.query(
    `INSERT INTO bingo_magic_links (
       id, game_id, email, token_hash, expires_at
     ) VALUES ($1, $2, $3, $4, NOW() + INTERVAL '10 minutes')`,
    [
      crypto.randomUUID(),
      gameId,
      email,
      crypto.createHash('sha256').update(token).digest('hex'),
    ]
  );

  const inspected = await request(
    baseUrl,
    `/api/bingo/auth/inspect?token=${encodeURIComponent(token)}`
  );
  assert.equal(inspected.response.status, 200, inspected.data.error);

  const redeemed = await request(baseUrl, '/api/bingo/auth/redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  assert.equal(redeemed.response.status, 200, redeemed.data.error);
  assert.equal(redeemed.data.gameCode, gameCode);
  const cookie = sessionCookie(redeemed.response);

  const consumed = await request(
    baseUrl,
    `/api/bingo/auth/inspect?token=${encodeURIComponent(token)}`
  );
  assert.equal(consumed.response.status, 400);

  const joined = await request(baseUrl, `/api/bingo/games/${gameCode}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({
      display_name: profile.name,
      company: profile.company,
      job_title: profile.role,
      linkedin_url: `https://www.linkedin.com/in/bingo-qa-${index}`,
      share_email: true,
      share_linkedin: true,
    }),
  });
  assert.equal(joined.response.status, 201, joined.data.error);
  assert.equal(joined.data.player.display_name, profile.name);
  assert.equal(joined.data.prompts.length, 3);

  return { cookie, email, state: joined.data };
}

try {
  const { rows: adminRows } = await pool.query(
    `SELECT id, email, role
     FROM users
     WHERE role = 'admin'
     ORDER BY id
     LIMIT 1`
  );
  assert.ok(adminRows[0], 'An admin user is required for the integration check');

  const { rows: eventRows } = await pool.query(
    `SELECT id
     FROM events
     ORDER BY
       CASE WHEN status IN ('upcoming', 'draft') THEN 0 ELSE 1 END,
       id DESC
     LIMIT 1`
  );
  assert.ok(eventRows[0], 'An event is required for the integration check');

  const { accessToken } = generateTokens(adminRows[0]);
  const authHeaders = {
    'Content-Type': 'application/json',
    Cookie: `access_token=${accessToken}`,
  };

  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const health = await request(baseUrl, '/api/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.data.status, 'ok');

  const joinCode = `QA-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const created = await request(baseUrl, '/api/bingo/admin/games', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      event_id: eventRows[0].id,
      title: 'Automated Bingo Validation',
      join_code: joinCode,
      prompt_count: 3,
    }),
  });
  assert.equal(created.response.status, 201, created.data.error);
  createdGameId = created.data.game.id;
  assert.equal(created.data.prompts.length, 12);

  const adminGame = await request(
    baseUrl,
    `/api/bingo/admin/games/${createdGameId}`,
    { headers: authHeaders }
  );
  assert.equal(adminGame.response.status, 200, adminGame.data.error);
  assert.equal(adminGame.data.game.join_code, joinCode);

  const publicGame = await request(baseUrl, `/api/bingo/games/${joinCode}`);
  assert.equal(publicGame.response.status, 200, publicGame.data.error);
  assert.equal(publicGame.data.game.status, 'draft');
  assert.equal(publicGame.data.authenticated, false);

  const registration = await request(
    baseUrl,
    `/api/bingo/admin/games/${createdGameId}/status`,
    {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ status: 'registration' }),
    }
  );
  assert.equal(registration.response.status, 200, registration.data.error);

  const profiles = [
    { name: 'QA Maya Johnson', company: 'Betterment', role: 'Product Lead' },
    { name: 'QA Andre Williams', company: 'OpenAI', role: 'Research Lead' },
    { name: 'QA Nia Brooks', company: 'Adobe', role: 'Design Director' },
    { name: 'QA Jordan Lee', company: 'Microsoft', role: 'Engineering Lead' },
  ];
  const players = [];
  for (let index = 0; index < profiles.length; index += 1) {
    players.push(await createParticipant(
      baseUrl,
      createdGameId,
      joinCode,
      profiles[index],
      index
    ));
  }

  const started = await request(
    baseUrl,
    `/api/bingo/admin/games/${createdGameId}/status`,
    {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ status: 'live' }),
    }
  );
  assert.equal(started.response.status, 200, started.data.error);

  async function connect(scanner, target) {
    return request(baseUrl, `/api/bingo/games/${joinCode}/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: scanner.cookie,
      },
      body: JSON.stringify({ person_token: target.state.player.qr_token }),
    });
  }

  const selfScan = await connect(players[0], players[0]);
  assert.equal(selfScan.response.status, 409);

  const firstConnection = await connect(players[0], players[1]);
  assert.equal(firstConnection.response.status, 201, firstConnection.data.error);
  assert.equal(firstConnection.data.player.completed_count, 1);

  const duplicateConnection = await connect(players[0], players[1]);
  assert.equal(duplicateConnection.response.status, 409);

  await connect(players[0], players[2]);
  const firstFinisher = await connect(players[0], players[3]);
  assert.equal(firstFinisher.response.status, 201, firstFinisher.data.error);
  assert.equal(firstFinisher.data.player.finish_place, 1);
  assert.equal(firstFinisher.data.player.finish_label, '1st');
  assert.equal(firstFinisher.data.connections.length, 3);
  assert.ok(firstFinisher.data.connections.some((connection) => connection.email));

  await connect(players[1], players[0]);
  await connect(players[1], players[2]);
  const secondFinisher = await connect(players[1], players[3]);
  assert.equal(secondFinisher.response.status, 201, secondFinisher.data.error);
  assert.equal(secondFinisher.data.player.finish_place, 2);

  const leaders = await request(baseUrl, `/api/bingo/games/${joinCode}/leaderboard`, {
    headers: { Cookie: players[0].cookie },
  });
  assert.equal(leaders.response.status, 200, leaders.data.error);
  assert.deepEqual(
    leaders.data.finishers.slice(0, 2).map((player) => player.finish_place),
    [1, 2]
  );

  const dashboard = await request(
    baseUrl,
    `/api/bingo/admin/games/${createdGameId}/dashboard`,
    { headers: authHeaders }
  );
  assert.equal(dashboard.response.status, 200, dashboard.data.error);
  assert.equal(dashboard.data.stats.registered, 4);
  assert.equal(dashboard.data.stats.connections, 6);
  assert.equal(dashboard.data.stats.finishers, 2);

  const suspended = await request(
    baseUrl,
    `/api/bingo/admin/games/${createdGameId}/players/${players[3].state.player.id}`,
    {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'suspended' }),
    }
  );
  assert.equal(suspended.response.status, 200, suspended.data.error);
  assert.equal(suspended.data.player.status, 'suspended');

  const restored = await request(
    baseUrl,
    `/api/bingo/admin/games/${createdGameId}/players/${players[3].state.player.id}`,
    {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'active' }),
    }
  );
  assert.equal(restored.response.status, 200, restored.data.error);

  const exportResponse = await fetch(
    `${baseUrl}/api/bingo/admin/games/${createdGameId}/export.csv`,
    { headers: { Cookie: authHeaders.Cookie } }
  );
  const exportText = await exportResponse.text();
  assert.equal(exportResponse.status, 200);
  assert.match(exportResponse.headers.get('content-type'), /^text\/csv/);
  assert.match(exportText, /QA Maya Johnson/);

  const recapResponse = await fetch(
    `${baseUrl}/api/bingo/admin/games/${createdGameId}/recap.csv`,
    { headers: { Cookie: authHeaders.Cookie } }
  );
  const recapText = await recapResponse.text();
  assert.equal(recapResponse.status, 200);
  assert.match(recapResponse.headers.get('content-type'), /^text\/csv/);
  assert.match(
    recapResponse.headers.get('content-disposition'),
    /shareable-recap\.csv/
  );
  assert.match(recapText, /BERGHAUS Networking Bingo/);
  assert.match(recapText, /Completion rate/);
  assert.match(recapText, /Top three finishers/);
  assert.match(recapText, /QA Maya Johnson/);
  assert.doesNotMatch(recapText, /@example\.com/);
  assert.doesNotMatch(recapText, /Share email/);

  console.log(
    'Bingo integration verified: auth, joins, signed QR validation, duplicate/self-scan defense, placements, dashboard, moderation, private CSV export, and privacy-safe recap.'
  );
} finally {
  if (createdGameId) {
    await pool.query('DELETE FROM bingo_games WHERE id = $1', [createdGameId]);
  }
  if (testEmails.length) {
    await pool.query(
      'DELETE FROM bingo_participants WHERE email = ANY($1::text[])',
      [testEmails]
    );
  }
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await pool.end();
}
