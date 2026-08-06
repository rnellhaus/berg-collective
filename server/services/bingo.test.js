import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createConnectionCode,
  createPersonalQrToken,
  escapeHtml,
  formatPlace,
  hashToken,
  isValidEmail,
  normalizeEmail,
  normalizeInstagramUrl,
  normalizeLinkedInUrl,
  normalizeJoinCode,
  shuffle,
  verifyPersonalQrToken,
} from './bingo.js';

test('normalizes room codes and participant emails', () => {
  assert.equal(normalizeJoinCode('  berg summer! 2026  '), 'BERGSUMMER2026');
  assert.equal(normalizeJoinCode('--nyc---mixer--'), 'NYC-MIXER');
  assert.equal(normalizeEmail('  Person@Example.COM '), 'person@example.com');
  assert.equal(isValidEmail('person@example.com'), true);
  assert.equal(isValidEmail('not-an-email'), false);
});

test('personal QR tokens are signed and reject tampering', () => {
  const playerId = 'e2620156-9ba0-4fc4-89a5-98829be0ff91';
  const token = createPersonalQrToken(playerId, 42);
  const [payload, signature] = token.split('.');
  const tamperedSignature = `${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;

  assert.deepEqual(verifyPersonalQrToken(token), { gameId: 42, playerId });
  assert.equal(verifyPersonalQrToken(`${payload}.${tamperedSignature}`), null);
  assert.equal(verifyPersonalQrToken('not-a-token'), null);
});

test('connection codes use an unambiguous eight-character alphabet', () => {
  const code = createConnectionCode();
  assert.match(code, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
});

test('ranking labels handle ordinal edge cases', () => {
  assert.equal(formatPlace(1), '1st');
  assert.equal(formatPlace(2), '2nd');
  assert.equal(formatPlace(3), '3rd');
  assert.equal(formatPlace(4), '4th');
  assert.equal(formatPlace(11), '11th');
  assert.equal(formatPlace(12), '12th');
  assert.equal(formatPlace(13), '13th');
  assert.equal(formatPlace(21), '21st');
});

test('token hashing, HTML escaping, and shuffling preserve safety invariants', () => {
  assert.equal(hashToken('same-token'), hashToken('same-token'));
  assert.notEqual(hashToken('same-token'), hashToken('different-token'));
  assert.equal(
    escapeHtml(`<a title="x">Tom & Jerry's</a>`),
    '&lt;a title=&quot;x&quot;&gt;Tom &amp; Jerry&#039;s&lt;/a&gt;'
  );
  const original = [1, 2, 3, 4, 5];
  const randomized = shuffle(original);
  assert.deepEqual(original, [1, 2, 3, 4, 5]);
  assert.deepEqual([...randomized].sort(), original);
});

test('LinkedIn URLs are restricted to LinkedIn hosts', () => {
  assert.equal(
    normalizeLinkedInUrl('linkedin.com/in/someone'),
    'https://linkedin.com/in/someone'
  );
  assert.equal(
    normalizeLinkedInUrl('https://www.linkedin.com/in/someone'),
    'https://www.linkedin.com/in/someone'
  );
  assert.equal(
    normalizeLinkedInUrl('uk.linkedin.com/in/someone'),
    'https://uk.linkedin.com/in/someone'
  );

  // An arbitrary link must never be shareable through the LinkedIn field.
  assert.equal(normalizeLinkedInUrl('https://evil.example.com/phish'), '');
  assert.equal(normalizeLinkedInUrl('https://linkedin.com.evil.example.com/x'), '');
  assert.equal(normalizeLinkedInUrl('javascript:alert(1)'), '');
  assert.equal(normalizeLinkedInUrl(''), '');
});

test('Instagram accepts handles or profile URLs and rejects other domains', () => {
  assert.equal(normalizeInstagramUrl('@berg.collective'), 'https://instagram.com/berg.collective');
  assert.equal(normalizeInstagramUrl('bergcollective'), 'https://instagram.com/bergcollective');
  assert.equal(
    normalizeInstagramUrl('https://www.instagram.com/bergcollective/'),
    'https://instagram.com/bergcollective'
  );
  assert.equal(
    normalizeInstagramUrl('instagram.com/bergcollective?igsh=tracking'),
    'https://instagram.com/bergcollective'
  );

  assert.equal(normalizeInstagramUrl('https://evil.example.com/bergcollective'), '');
  assert.equal(normalizeInstagramUrl('instagram.com'), '');
  assert.equal(normalizeInstagramUrl('has spaces'), '');
  assert.equal(normalizeInstagramUrl(''), '');
});
