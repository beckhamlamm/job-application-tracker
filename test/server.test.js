const test = require('node:test');
const assert = require('node:assert/strict');
const { parseJobPage } = require('../src/job-parser');
const { isPrivateHost, validatePublicUrl } = require('../src/url-security');

test('parses a schema.org JobPosting', () => {
  const html = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"JobPosting","title":"Product Designer","datePosted":"2026-08-18","hiringOrganization":{"name":"Northstar Labs"}}</script>`;
  assert.deepEqual(parseJobPage(html, 'https://jobs.example.com/123'), { url: 'https://jobs.example.com/123', company: 'Northstar Labs', role: 'Product Designer', datePosted: '2026-08-18' });
});

test('falls back to page metadata', () => {
  const html = '<meta property="og:site_name" content="Acme"><meta property="og:title" content="Engineer"><title>Ignored</title>';
  assert.equal(parseJobPage(html, 'https://acme.example/job').company, 'Acme');
  assert.equal(parseJobPage(html, 'https://acme.example/job').role, 'Engineer');
});

test('blocks private network targets', () => {
  assert.equal(isPrivateHost('localhost'), true); assert.equal(isPrivateHost('192.168.1.2'), true); assert.equal(isPrivateHost('jobs.example.com'), false);
});

test('validates public job URLs', () => {
  assert.equal(validatePublicUrl('https://jobs.example.com/123').hostname, 'jobs.example.com');
  assert.throws(() => validatePublicUrl('http://localhost/job'), /cannot be fetched/);
  assert.throws(() => validatePublicUrl('not a url'), /valid URL/);
});
