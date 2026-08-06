import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import {
  describeEmailFailure,
  isRetryableEmailError,
  magicLinkEmailLimiter,
  magicLinkIpLimiter,
} from './bingoPublic.js';

// Mounts only the magic-link limiters so the venue-scale behavior can be
// exercised without a database or an email provider.
async function startLimiterApp() {
  const app = express();
  app.use(express.json());
  app.post(
    '/magic-link',
    magicLinkIpLimiter,
    magicLinkEmailLimiter,
    (req, res) => res.json({ ok: true })
  );

  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}/magic-link`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function requestLink(url, email) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

test('a venue full of attendees behind one shared IP is not rate limited', async () => {
  const app = await startLimiterApp();
  try {
    // Every attendee shares the venue NAT address but uses a distinct email.
    const statuses = [];
    for (let i = 0; i < 300; i += 1) {
      const response = await requestLink(app.url, `attendee${i}@example.com`);
      statuses.push(response.status);
    }

    const blocked = statuses.filter((status) => status === 429);
    assert.equal(blocked.length, 0, 'no attendee should be blocked by the shared-IP ceiling');
    assert.equal(statuses.length, 300);
    assert.ok(statuses.every((status) => status === 200));
  } finally {
    await app.close();
  }
});

test('repeated requests for a single email are still throttled', async () => {
  const app = await startLimiterApp();
  try {
    const email = 'repeat-offender@example.com';
    const statuses = [];
    for (let i = 0; i < 8; i += 1) {
      const response = await requestLink(app.url, email);
      statuses.push(response.status);
    }

    assert.deepEqual(statuses.slice(0, 5), [200, 200, 200, 200, 200]);
    assert.ok(
      statuses.slice(5).every((status) => status === 429),
      'requests past the per-email allowance must be rejected'
    );
  } finally {
    await app.close();
  }
});

test('requests without a usable email skip the shared per-email bucket', async () => {
  const app = await startLimiterApp();
  try {
    // A room full of typos must not collapse onto one key and lock each other
    // out; these fall through to the handler's own validation instead.
    const statuses = [];
    for (let i = 0; i < 20; i += 1) {
      const response = await requestLink(app.url, 'not-an-email');
      statuses.push(response.status);
    }
    assert.ok(statuses.every((status) => status === 200));
  } finally {
    await app.close();
  }
});

test('transient email provider failures are retryable, permanent ones are not', () => {
  assert.equal(isRetryableEmailError({ statusCode: 429 }), true);
  assert.equal(isRetryableEmailError({ statusCode: 500 }), true);
  assert.equal(isRetryableEmailError({ statusCode: 503 }), true);
  assert.equal(isRetryableEmailError({ name: 'rate_limit_exceeded' }), true);
  assert.equal(isRetryableEmailError({ name: 'application_error' }), true);

  assert.equal(isRetryableEmailError({ statusCode: 422, name: 'validation_error' }), false);
  assert.equal(isRetryableEmailError({ statusCode: 403, name: 'invalid_api_key' }), false);
  assert.equal(isRetryableEmailError(null), false);
});

test('email failure descriptions never leak the recipient or token', () => {
  const description = describeEmailFailure({
    name: 'validation_error',
    statusCode: 422,
    message: 'recipient attendee@example.com rejected',
  });

  assert.equal(description, 'validation_error (422)');
  assert.ok(!description.includes('@'));
  assert.equal(describeEmailFailure(null), 'unknown_error');
});
