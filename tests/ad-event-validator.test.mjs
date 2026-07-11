// ADS-TRACK-01 — unit tests for the /api/ad-event payload validator.
// Run: npm test  (node --test, no dependencies)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateAdEvent } from '../src/lib/ad-event-validator.js';

const UUID = '11111111-1111-4111-8111-111111111111';

test('accepts a full valid payload', () => {
  const out = validateAdEvent({ slot_id: 'slot-b', anuncio_id: UUID, evento: 'impression', path: '/' });
  assert.deepEqual(out, { slot_id: 'slot-b', anuncio_id: UUID, evento: 'impression', path: '/' });
});

test('accepts viewable and click eventos', () => {
  assert.equal(validateAdEvent({ slot_id: 's', evento: 'viewable' })?.evento, 'viewable');
  assert.equal(validateAdEvent({ slot_id: 's', evento: 'click' })?.evento, 'click');
});

test('anuncio_id and path are optional (normalized to null)', () => {
  const out = validateAdEvent({ slot_id: 'home-leaderboard', evento: 'click' });
  assert.deepEqual(out, { slot_id: 'home-leaderboard', anuncio_id: null, evento: 'click', path: null });
});

test('normalizes uppercase UUIDs to lowercase', () => {
  const out = validateAdEvent({ slot_id: 's', anuncio_id: UUID.toUpperCase(), evento: 'click' });
  assert.equal(out?.anuncio_id, UUID);
});

test('empty-string anuncio_id and path are treated as absent', () => {
  const out = validateAdEvent({ slot_id: 's', anuncio_id: '', evento: 'click', path: '' });
  assert.deepEqual(out, { slot_id: 's', anuncio_id: null, evento: 'click', path: null });
});

test('rejects non-object payloads', () => {
  for (const bad of [null, undefined, 'x', 42, true, [], [{}]]) {
    assert.equal(validateAdEvent(bad), null, `should reject ${JSON.stringify(bad)}`);
  }
});

test('rejects missing or malformed slot_id', () => {
  assert.equal(validateAdEvent({ evento: 'click' }), null);
  assert.equal(validateAdEvent({ slot_id: '', evento: 'click' }), null);
  assert.equal(validateAdEvent({ slot_id: 42, evento: 'click' }), null);
  assert.equal(validateAdEvent({ slot_id: 'x'.repeat(101), evento: 'click' }), null);
});

test('rejects unknown or missing evento', () => {
  assert.equal(validateAdEvent({ slot_id: 's' }), null);
  assert.equal(validateAdEvent({ slot_id: 's', evento: 'IMPRESSION' }), null);
  assert.equal(validateAdEvent({ slot_id: 's', evento: 'purchase' }), null);
  assert.equal(validateAdEvent({ slot_id: 's', evento: 7 }), null);
});

test('rejects malformed anuncio_id', () => {
  assert.equal(validateAdEvent({ slot_id: 's', anuncio_id: 'not-a-uuid', evento: 'click' }), null);
  assert.equal(validateAdEvent({ slot_id: 's', anuncio_id: 123, evento: 'click' }), null);
  assert.equal(validateAdEvent({ slot_id: 's', anuncio_id: `${UUID}x`, evento: 'click' }), null);
});

test('rejects malformed path', () => {
  assert.equal(validateAdEvent({ slot_id: 's', evento: 'click', path: 'no-leading-slash' }), null);
  assert.equal(validateAdEvent({ slot_id: 's', evento: 'click', path: 'https://evil.example' }), null);
  assert.equal(validateAdEvent({ slot_id: 's', evento: 'click', path: '/' + 'x'.repeat(500) }), null);
  assert.equal(validateAdEvent({ slot_id: 's', evento: 'click', path: 42 }), null);
});

test('ignores extra keys', () => {
  const out = validateAdEvent({ slot_id: 's', evento: 'click', extra: 'ignored', ua: 'nope' });
  assert.deepEqual(out, { slot_id: 's', anuncio_id: null, evento: 'click', path: null });
});
