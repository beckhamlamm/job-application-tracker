// Protects structured-record selection and reference resolution with small, offline fixtures.
const test = require('node:test');
const assert = require('node:assert/strict');
const { getStructuredJob, findJobPosting } = require('../src/structured-data');

test('malformed JSON does not prevent microdata fallback', () => {
  const html = '<script type="application/ld+json">{broken</script><div itemtype="https://schema.org/JobPosting"><span itemprop="title">Engineer</span></div>';
  assert.equal(getStructuredJob(html, 'https://example.org/job').title, 'Engineer');
});

test('multiple unmatched structured jobs do not select an arbitrary posting', () => {
  const html = '<script type="application/ld+json">[{"@type":"JobPosting","url":"/jobs/1"},{"@type":"JobPosting","url":"/jobs/2"}]</script>';
  assert.equal(getStructuredJob(html, 'https://example.org/careers'), null);
});

test('inline organization fields take precedence over referenced fields', () => {
  const html = `<script type="application/ld+json">${JSON.stringify([
    { '@type': 'JobPosting', hiringOrganization: [{ '@id': '#org', name: 'Local Studio' }] },
    { '@type': 'Organization', '@id': '#org', name: 'Parent Studio' },
  ])}</script>`;
  assert.equal(getStructuredJob(html, 'https://example.org/job').hiringOrganization[0].name, 'Local Studio');
});

test('nested records support schema URLs and preserve the existing parser export', () => {
  const job = { '@type': ['https://schema.org/JobPosting'], title: 'Designer' };
  assert.equal(findJobPosting({ data: [job] }), job);
  assert.equal(require('../src/job-parser').findJobPosting, findJobPosting);
});
