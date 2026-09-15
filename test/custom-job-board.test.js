// Checks custom-domain Greenhouse parsing without depending on live job availability.
const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveCustomJobBoard } = require('../src/custom-job-board');
const url = 'https://helsing.ai/jobs/4976480101?gh_jid=4976480101&utm_source=Simplify&ref=Simplify';

test('Helsing returns company and role and preserves the submitted URL', async () => {
  const result = await resolveCustomJobBoard(url, { fetchImpl: async (endpoint) => ({ ok: true, json: async () => endpoint.endsWith('/4976480101')
    ? { id: 4976480101, title: 'Junior Software Engineer ', absolute_url: url, updated_at: '2026-09-15' } : { name: 'Helsing' } }) });
  assert.equal(result.company, 'Helsing');
  assert.equal(result.role, 'Junior Software Engineer');
  assert.equal(result.url, url);
  assert.equal(result.datePosted, '');
});

test('pages without integration evidence do not trigger ATS requests', async () => {
  assert.equal(await resolveCustomJobBoard('https://example.com/jobs/123', { fetchImpl: () => assert.fail() }), null);
});

test('conflicting job IDs and closed jobs are reported', async () => {
  await assert.rejects(resolveCustomJobBoard(url.replace('gh_jid=4976480101', 'gh_jid=1')), /do not match/);
  assert.equal(await resolveCustomJobBoard(url, { fetchImpl: async () => ({ ok: false }) }), null);
});
