/**
 * Networking Bingo load harness.
 *
 * Simulates a full room of participants against a dedicated throwaway game so
 * capacity can be measured before an event. It never sends email: magic-link
 * rows are inserted directly and redeemed through the real HTTP endpoints, so
 * the request path under test is the production one.
 *
 * Safety:
 *   - Creates its own draft game and synthetic accounts; never touches an
 *     existing game.
 *   - Refuses to run against a non-local target unless --allow-remote is
 *     passed explicitly.
 *   - Deletes everything it created and verifies the deletion before exiting.
 *   - Reports status codes and latencies only. No participant data, tokens, or
 *     credentials are printed.
 *
 * Usage:
 *   node --env-file=.env.local --env-file=.env.admin.local \
 *     scripts/load-test-bingo.js [--players=250] [--concurrency=25] [--rounds=3]
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import process from 'node:process';
import { once } from 'node:events';

// Keep server/index.js from binding its usual local port when imported here.
process.env.VERCEL = '1';

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = 'true'] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const PLAYERS = Number(args.get('players') || 250);
const CONCURRENCY = Number(args.get('concurrency') || 25);
const ROUNDS = Number(args.get('rounds') || 3);
const ALLOW_REMOTE = args.get('allow-remote') === 'true';
const TARGET = args.get('target') || '';

// A remote target is opt-in only. This harness writes data, so pointing it at
// production by accident must be impossible.
if (TARGET && !ALLOW_REMOTE) {
  console.error(
    'Refusing to target a remote host without --allow-remote. ' +
      'This harness creates and deletes data.'
  );
  process.exit(1);
}

const [{ default: app }, { getPool }, { generateTokens }] = await Promise.all([
  import('../server/index.js'),
  import('../server/db/connection.js'),
  import('../server/middleware/auth.js'),
]);

const pool = getPool();
let server;
let createdGameId;
const testEmails = [];
const samples = [];

function record(label, startedAt, status, ok) {
  samples.push({ label, ms: Number(process.hrtime.bigint() - startedAt) / 1e6, status, ok });
}

async function timed(label, run) {
  const startedAt = process.hrtime.bigint();
  try {
    const response = await run();
    record(label, startedAt, response.status, response.ok);
    return response;
  } catch (error) {
    // A transport failure is a real result for capacity purposes.
    record(label, startedAt, 0, false);
    throw error;
  }
}

// Bounded worker pool: the room is large but the harness must not open 250
// sockets at once, which would measure the harness rather than the server.
async function pooled(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = await worker(items[index], index);
      } catch (error) {
        results[index] = { error: error.message };
      }
    }
  });
  await Promise.all(runners);
  return results;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function report() {
  const byLabel = new Map();
  for (const sample of samples) {
    if (!byLabel.has(sample.label)) byLabel.set(sample.label, []);
    byLabel.get(sample.label).push(sample);
  }

  console.log('\n=== Latency by operation ===');
  console.log(
    'operation'.padEnd(22),
    'n'.padStart(6),
    'p50'.padStart(9),
    'p95'.padStart(9),
    'p99'.padStart(9),
    'max'.padStart(9),
    'err%'.padStart(7)
  );
  for (const [label, entries] of byLabel) {
    const ms = entries.map((entry) => entry.ms);
    const errors = entries.filter((entry) => !entry.ok).length;
    console.log(
      label.padEnd(22),
      String(entries.length).padStart(6),
      `${percentile(ms, 50).toFixed(0)}ms`.padStart(9),
      `${percentile(ms, 95).toFixed(0)}ms`.padStart(9),
      `${percentile(ms, 99).toFixed(0)}ms`.padStart(9),
      `${Math.max(...ms).toFixed(0)}ms`.padStart(9),
      `${((errors / entries.length) * 100).toFixed(2)}%`.padStart(7)
    );
  }

  const statuses = new Map();
  for (const sample of samples) {
    statuses.set(sample.status, (statuses.get(sample.status) || 0) + 1);
  }
  console.log('\n=== HTTP status distribution ===');
  for (const [status, count] of [...statuses].sort((a, b) => a[0] - b[0])) {
    console.log(`  ${status === 0 ? 'transport error' : status}: ${count}`);
  }

  const totalErrors = samples.filter((sample) => !sample.ok).length;
  const errorRate = (totalErrors / samples.length) * 100;
  const reads = samples.filter((sample) => sample.label.includes('read')).map((s) => s.ms);

  console.log('\n=== Launch SLO ===');
  const p95Reads = percentile(reads, 95);
  console.log(`  requests:        ${samples.length}`);
  console.log(`  error rate:      ${errorRate.toFixed(2)}%  (target < 1%)`);
  console.log(`  p95 reads:       ${p95Reads.toFixed(0)}ms  (target < 1500ms)`);

  const pass = errorRate < 1 && p95Reads < 1500;
  console.log(`  verdict:         ${pass ? 'PASS' : 'FAIL'}`);
  return pass;
}

async function createPlayer(baseUrl, gameId, gameCode, index) {
  const email = `bingo-load-${crypto.randomBytes(6).toString('hex')}@example.invalid`;
  const token = crypto.randomBytes(32).toString('base64url');
  testEmails.push(email);

  // Inserted directly so no email provider is involved at any point.
  await pool.query(
    `INSERT INTO bingo_magic_links (id, game_id, email, token_hash, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + INTERVAL '30 minutes')`,
    [
      crypto.randomUUID(),
      gameId,
      email,
      crypto.createHash('sha256').update(token).digest('hex'),
    ]
  );

  const redeemed = await timed('auth redeem', () => fetch(`${baseUrl}/api/bingo/auth/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  }));
  if (!redeemed.ok) return null;
  const cookie = (redeemed.headers.get('set-cookie') || '').split(';')[0];

  const joined = await timed('join', () => fetch(`${baseUrl}/api/bingo/games/${gameCode}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      display_name: `Load Tester ${index + 1}`,
      company: 'Load Test Co',
      job_title: 'Synthetic Attendee',
    }),
  }));
  if (!joined.ok) return null;
  const state = await joined.json().catch(() => null);
  if (!state?.player) return null;

  return { cookie, playerId: state.player.id, qrToken: state.player.qr_token };
}

try {
  const { rows: adminRows } = await pool.query(
    `SELECT id, email, role FROM users WHERE role = 'admin' ORDER BY id LIMIT 1`
  );
  assert.ok(adminRows[0], 'An admin user is required to create the test game');

  const { rows: eventRows } = await pool.query('SELECT id FROM events ORDER BY id DESC LIMIT 1');
  assert.ok(eventRows[0], 'An event is required to create the test game');

  const { accessToken } = generateTokens(adminRows[0]);
  const authHeaders = {
    'Content-Type': 'application/json',
    Cookie: `access_token=${accessToken}`,
  };

  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = TARGET || `http://127.0.0.1:${server.address().port}`;
  console.log(`Target: ${TARGET ? 'REMOTE (explicitly allowed)' : 'local in-process server'}`);
  console.log(`Simulating ${PLAYERS} players, concurrency ${CONCURRENCY}, ${ROUNDS} read rounds.`);

  // A dedicated throwaway game. Never an existing one.
  const joinCode = `LOAD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const created = await fetch(`${baseUrl}/api/bingo/admin/games`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      event_id: eventRows[0].id,
      title: 'Automated Bingo Load Test',
      join_code: joinCode,
      prompt_count: 8,
    }),
  });
  const createdData = await created.json();
  assert.equal(created.status, 201, createdData.error);
  createdGameId = createdData.game.id;

  for (const status of ['registration', 'live']) {
    const moved = await fetch(`${baseUrl}/api/bingo/admin/games/${createdGameId}/status`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ status }),
    });
    assert.equal(moved.status, 200, `Could not move game to ${status}`);
  }

  console.log('\nPhase 1: registration and join…');
  const players = (
    await pooled(
      Array.from({ length: PLAYERS }, (unused, index) => index),
      CONCURRENCY,
      (index) => createPlayer(baseUrl, createdGameId, joinCode, index)
    )
  ).filter((player) => player && !player.error);
  console.log(`  joined ${players.length}/${PLAYERS}`);
  assert.ok(players.length > 0, 'No synthetic player could join');

  console.log('Phase 2: steady-state reads (player state + leaderboard)…');
  for (let round = 0; round < ROUNDS; round += 1) {
    await pooled(players, CONCURRENCY, (player) => Promise.all([
      timed('player state read', () => fetch(`${baseUrl}/api/bingo/games/${joinCode}/player`, {
        headers: { Cookie: player.cookie },
      })),
      timed('leaderboard read', () => fetch(`${baseUrl}/api/bingo/games/${joinCode}/leaderboard`, {
        headers: { Cookie: player.cookie },
      })),
    ]));
  }

  console.log('Phase 3: concurrent connection writes…');
  // Pair players off so every write targets a distinct partner, which is the
  // contended path: it takes row locks and assigns finish places.
  const pairs = [];
  for (let index = 0; index + 1 < players.length; index += 2) {
    pairs.push([players[index], players[index + 1]]);
  }
  await pooled(pairs, CONCURRENCY, ([scanner, target]) => timed(
    'connection write',
    () => fetch(`${baseUrl}/api/bingo/games/${joinCode}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: scanner.cookie },
      body: JSON.stringify({ person_token: target.qrToken }),
    })
  ));

  console.log('Phase 4: admin dashboard under full load…');
  for (let round = 0; round < ROUNDS; round += 1) {
    await timed('admin dashboard', () => fetch(
      `${baseUrl}/api/bingo/admin/games/${createdGameId}/dashboard`,
      { headers: authHeaders }
    ));
  }

  // Correctness still has to hold under contention: no duplicate finish places.
  const { rows: placeRows } = await pool.query(
    `SELECT finish_place, COUNT(*)::int AS count
     FROM bingo_players
     WHERE game_id = $1 AND finish_place IS NOT NULL
     GROUP BY finish_place HAVING COUNT(*) > 1`,
    [createdGameId]
  );
  console.log(`\nDuplicate finish places: ${placeRows.length} (must be 0)`);

  const passed = report();
  assert.equal(placeRows.length, 0, 'Concurrent writes assigned a duplicate finish place');
  if (!passed) process.exitCode = 1;
} finally {
  console.log('\n=== Cleanup ===');
  if (createdGameId) {
    await pool.query('DELETE FROM bingo_games WHERE id = $1', [createdGameId]);
  }
  if (testEmails.length) {
    await pool.query('DELETE FROM bingo_participants WHERE email = ANY($1::text[])', [testEmails]);
  }

  // Verified cleanup: confirm nothing was left behind rather than assuming.
  const { rows: leftoverGames } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM bingo_games WHERE id = $1',
    [createdGameId || 0]
  );
  const { rows: leftoverParticipants } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM bingo_participants WHERE email = ANY($1::text[])',
    [testEmails.length ? testEmails : ['']]
  );
  console.log(`  leftover games:        ${leftoverGames[0].count} (must be 0)`);
  console.log(`  leftover participants: ${leftoverParticipants[0].count} (must be 0)`);
  if (leftoverGames[0].count || leftoverParticipants[0].count) {
    console.error('  CLEANUP INCOMPLETE — inspect before running again.');
    process.exitCode = 1;
  }

  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await pool.end();
}
