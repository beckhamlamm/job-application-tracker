// Verifies job-page parsing fallbacks and protection against unsafe URL targets.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseJobPage } = require('../src/job-parser');
const { isPrivateHost, validatePublicUrl } = require('../src/url-security');

test('parses a schema.org JobPosting', () => {
  const html = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"JobPosting","title":"Product Designer","datePosted":"2026-08-18","hiringOrganization":{"name":"Northstar Labs"}}</script>`;
  const parsed = parseJobPage(html, 'https://jobs.example.com/123');
  assert.equal(parsed.structuredJob.hiringOrganization.name, 'Northstar Labs');
  assert.equal(parsed.role, 'Product Designer');
  assert.equal(parsed.datePosted, '2026-08-18');
});

test('falls back to page metadata', () => {
  const html =
    '<meta property="og:site_name" content="Acme"><meta property="og:title" content="Engineer"><title>Ignored</title>';
  assert.equal(parseJobPage(html, 'https://acme.example/job').role, 'Engineer');
});

test('blocks private network targets', () => {
  assert.equal(isPrivateHost('localhost'), true);
  assert.equal(isPrivateHost('192.168.1.2'), true);
  assert.equal(isPrivateHost('jobs.example.com'), false);
});

test('validates public job URLs', () => {
  assert.equal(validatePublicUrl('https://jobs.example.com/123').hostname, 'jobs.example.com');
  assert.throws(() => validatePublicUrl('http://localhost/job'), /cannot be fetched/);
  assert.throws(() => validatePublicUrl('not a url'), /valid URL/);
});
