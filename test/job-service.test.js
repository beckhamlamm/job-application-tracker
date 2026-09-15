// Tests parsing orchestration, dependency boundaries, and error handling using synthetic responses only.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createJobService } = require('../src/job-service');

const url = 'https://example.org/jobs/123';
const html =
  '<script type="application/ld+json">{"@type":"JobPosting","title":"Engineer","datePosted":"2026-01-15","hiringOrganization":{"name":"Example Studio"}}</script>';
const page = (body = html, ok = true) => ({ ok, url, text: async () => body });

test('service combines page fields and company evidence without exposing intermediate data', async () => {
  const parse = createJobService({ fetchPage: async () => page() });
  assert.deepEqual(await parse(url), {
    url,
    role: 'Engineer',
    datePosted: '2026-01-15',
    company: 'Example Studio',
    companySource: 'JobPosting structured data',
    companyConfidence: 'high',
  });
});

test('service rejects private URLs before invoking dependencies', async () => {
  const parse = createJobService({ fetchPage: () => assert.fail('must not fetch') });
  await assert.rejects(parse('http://localhost/job'), /cannot be fetched/);
});

test('verified board data can resolve a blocked page using the injected fetch dependency', async () => {
  const responses = [
    page('<title>Access Denied</title>', false),
    { ok: true, json: async () => ({ id: 123, title: 'Designer', absolute_url: url }) },
    { ok: true, json: async () => ({ name: 'Example Studio' }) },
  ];
  const signals = [];
  const parse = createJobService({
    fetchPage: async (_, { signal }) => {
      signals.push(signal);
      assert.ok(responses.length, 'unexpected network call');
      return responses.shift();
    },
  });
  const result = await parse(`${url}?gh_jid=123`);
  assert.equal(result.company, 'Example Studio');
  assert.equal(result.role, 'Designer');
  assert.equal(responses.length, 0);
  assert.ok(signals.every((signal) => signal === signals[0]));
});

test('unresolved blocked pages never enter page-field parsing', async () => {
  for (const response of [page('', false), page('<title>Vercel Security Checkpoint</title>')]) {
    const parse = createJobService({
      fetchPage: async () => response,
      parsePage: () => assert.fail('must not parse blocked content'),
    });
    await assert.rejects(parse(url), /requires browser verification/);
  }
});

test('parsing strategies can be replaced without changing orchestration', async () => {
  const parsed = Object.freeze({
    url,
    role: 'Designer',
    structuredJob: { title: 'Designer' },
    pageCompany: 'Studio',
  });
  const fetchPage = async () => page();
  const parse = createJobService({
    fetchPage,
    resolveBoard: async () => null,
    parsePage: () => parsed,
    resolveEmployer: async (context) => {
      assert.equal(context.job, parsed.structuredJob);
      assert.equal(context.pageCompany, 'Studio');
      assert.equal(context.fetchImpl, fetchPage);
      return { name: 'Studio', source: 'test', confidence: 'high' };
    },
  });
  assert.equal((await parse(url)).company, 'Studio');
  assert.ok(parsed.structuredJob, 'service must not mutate parser output');
});

test('service propagates fetch failures and aborts slow fetches', async () => {
  const failed = createJobService({
    fetchPage: async () => {
      throw new Error('Unavailable');
    },
  });
  await assert.rejects(failed(url), /Unavailable/);
  const slow = createJobService({
    timeoutMs: 5,
    fetchPage: (_, { signal }) =>
      new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      }),
  });
  await assert.rejects(slow(url), { name: 'AbortError' });
});
