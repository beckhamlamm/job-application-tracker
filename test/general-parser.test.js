// Exercises general parsing behavior with synthetic HTML and mocked APIs, independent of live postings.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseJobPage, getMetaContent } = require('../src/job-parser');
const { resolveCompany } = require('../src/company-resolver');
const { resolveCustomJobBoard } = require('../src/custom-job-board');
const { discoverBoards } = require('../src/custom-job-board');

test('a hosted posting can identify its employer in text when structured organization is blank', async () => {
  const url = 'https://example.wd5.myworkdayjobs.com/careers/job/123';
  const html = `<script type="application/ld+json">${JSON.stringify({
    '@type': 'JobPosting', title: 'Systems Engineer', hiringOrganization: { name: '' },
    description: 'Our teams use Example Tools products. Northstar Labs is an Equal Opportunity Employer.',
    datePosted: '2026-01-15',
  })}</script>`;
  const parsed = parseJobPage(html, url);
  const company = await resolveCompany({ html, url, job: parsed.structuredJob, fetchImpl: () => assert.fail('page evidence needs no network') });
  assert.equal(company.name, 'Northstar Labs');
  assert.equal(parsed.role, 'Systems Engineer');
  assert.equal(parsed.datePosted, '2026-01-15');
});

test('employer statements neither override structured employers nor resolve ambiguous evidence', async () => {
  const url = 'https://example.wd5.myworkdayjobs.com/careers/job/123';
  const resolve = (job) => resolveCompany({ html: '', url, job, fetchImpl: () => assert.fail('page evidence needs no network') });
  assert.equal((await resolve({ hiringOrganization: { name: 'Example Studio' }, description: 'Northstar Labs is an Equal Opportunity Employer.' })).name, 'Example Studio');
  for (const description of ['Experience with Example Tools and Workday products.', 'The company is an Equal Opportunity Employer.', 'Northstar Labs is an Equal Opportunity Employer. Example Studio is an Equal Opportunity Employer.']) {
    assert.equal((await resolve({ description })).name, '');
  }
});

test('a verified embedded board preserves the URL and does not treat an update date as a posting date', async () => {
  const url = 'https://example.org/jobs/123?gh_jid=123&utm_source=test';
  const endpoints = [];
  const result = await resolveCustomJobBoard(url, { fetchImpl: async (endpoint) => {
    endpoints.push(endpoint);
    return { ok: true, json: async () => endpoint.endsWith('/jobs/123')
      ? { id: 123, title: ' Software Engineer ', absolute_url: 'https://example.org/jobs/123', updated_at: '2026-01-15' }
      : { name: 'Example Studio' } };
  } });
  assert.deepEqual(endpoints, [
    'https://boards-api.greenhouse.io/v1/boards/example/jobs/123',
    'https://boards-api.greenhouse.io/v1/boards/example',
  ]);
  assert.equal(result.company, 'Example Studio');
  assert.equal(result.role, 'Software Engineer');
  assert.equal(result.url, url);
  assert.equal(result.datePosted, '');
});

test('a listing with multiple embedded job links is not treated as one posting', () => {
  assert.deepEqual(discoverBoards('https://example.org/careers', '<a href="https://boards.greenhouse.io/example/jobs/1">One</a><a href="https://boards.greenhouse.io/example/jobs/2">Two</a>'), []);
});

test('custom HTML heading outranks a generic site title', async () => {
  const html = '<title>Careers</title><main><h1>Senior <span>Engineer</span></h1></main><meta content="O\'Brien Labs" property="og:site_name">';
  const parsed = parseJobPage(html, 'https://careers.obrien.co.uk/roles/5');
  assert.equal(parsed.role, 'Senior Engineer');
  assert.equal(getMetaContent(html, 'og:site_name'), "O'Brien Labs");
  assert.equal((await resolveCompany({ html, url: parsed.url, job: parsed.structuredJob })).name, "O'Brien Labs");
});
test('JSON-LD references resolve across separate scripts', () => {
  const html = '<script type="application/ld+json">{"@type":"JobPosting","title":"Designer","hiringOrganization":{"@id":"#org"}}</script><script type="application/ld+json">{"@id":"#org","@type":"Organization","name":"Studio"}</script>';
  assert.equal(parseJobPage(html, 'https://studio.test/job').structuredJob.hiringOrganization.name, 'Studio');
});
test('microdata and RDFa identify employer and job date', () => {
  for (const [type, prop] of [['itemtype', 'itemprop'], ['typeof', 'property']]) {
    const html = `<section ${type}="https://schema.org/JobPosting"><h1 ${prop}="title">Designer</h1><div ${prop}="hiringOrganization"><span ${prop}="name">Studio</span></div><time ${prop}="datePosted" datetime="2026-09-15"></time></section>`;
    const parsed = parseJobPage(html, 'https://studio.test/job');
    assert.equal(parsed.structuredJob.hiringOrganization.name, 'Studio');
    assert.equal(parsed.datePosted, '2026-09-15');
  }
});
test('embedded JSON from a JS application supports exact job selection', () => {
  const html = '<script type="application/json">{"jobs":[{"@type":"JobPosting","title":"Wrong","url":"/jobs/1"},{"@type":"JobPosting","title":"Correct","url":"/jobs/2"}]}</script>';
  assert.equal(parseJobPage(html, 'https://example.com/jobs/2').role, 'Correct');
});
test('discovers a board with a different name from an iframe on any domain', async () => {
  const result = await resolveCustomJobBoard('https://example.org/careers/engineer', {
    html: '<iframe src="https://boards.greenhouse.io/embed/job_app?for=differentboard&token=123"></iframe>',
    fetchImpl: async (url) => ({ ok: true, json: async () => url.endsWith('/123') ? { id: 123, title: 'Engineer' } : { name: 'Example Org' } }),
  });
  assert.equal(result.company, 'Example Org');
  assert.equal(result.role, 'Engineer');
});
test('rejects guessed board matches that point to another company domain', async () => {
  const result = await resolveCustomJobBoard('https://example.org/jobs/123?gh_jid=123', {
    fetchImpl: async () => ({ ok: true, json: async () => ({ id: 123, title: 'Wrong', absolute_url: 'https://unrelated.com/jobs/123' }) }),
  });
  assert.equal(result, null);
});
