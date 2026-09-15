// Checks custom-domain Greenhouse parsing without depending on live job availability.
const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveCustomJobBoard } = require('../src/custom-job-board');

test('pages without integration evidence do not trigger ATS requests', async () => {
  assert.equal(await resolveCustomJobBoard('https://example.com/jobs/123', { fetchImpl: () => assert.fail() }), null);
});

test('conflicting job IDs are rejected before any API request', async () => {
  await assert.rejects(resolveCustomJobBoard('https://example.org/jobs/123?gh_jid=456', {
    fetchImpl: () => assert.fail('conflicting IDs must not trigger a lookup'),
  }), /do not match/);
});

test('an unavailable posting returns no result for the caller to fall back', async () => {
  const url = 'https://example.org/jobs/123?gh_jid=123';
  assert.equal(await resolveCustomJobBoard(url, { fetchImpl: async () => ({ ok: false }) }), null);
});
