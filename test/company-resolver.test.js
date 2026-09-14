// Verifies company resolution priority, ATS recognition, API lookups, and safe metadata fallbacks.
const test = require('node:test');
const assert = require('node:assert/strict');
const { atsDetails, isPlatformName, resolveCompany } = require('../src/company-resolver');

test('prefers structured hiring organization data without an API request', async () => {
  const html = '<script type="application/ld+json">{"@type":"JobPosting","hiringOrganization":{"name":"Acme Corp"}}</script>';
  const company = await resolveCompany({ html, url: 'https://jobs.lever.co/acme/123', fetchImpl: () => assert.fail('should not fetch') });
  assert.deepEqual(company, { name: 'Acme Corp', source: 'JobPosting structured data', confidence: 'high' });
});

test('resolves a Greenhouse organization through its public board API', async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ name: 'Northstar Labs' }) });
  const company = await resolveCompany({ html: '', url: 'https://boards.greenhouse.io/northstar/jobs/123', fetchImpl });
  assert.deepEqual(company, { name: 'Northstar Labs', source: 'Greenhouse board API', confidence: 'high' });
});

test('resolves a SmartRecruiters posting through its public API', async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ company: { name: 'Northstar Labs' } }) });
  const company = await resolveCompany({ html: '', url: 'https://careers.smartrecruiters.com/northstar/123', fetchImpl });
  assert.equal(company.name, 'Northstar Labs');
  assert.equal(company.confidence, 'high');
});

test('uses ATS account names when an API has no company field', async () => {
  const company = await resolveCompany({ html: '', url: 'https://jobs.lever.co/northstar-labs/123' });
  assert.deepEqual(company, { name: 'Northstar Labs', source: 'Lever site', confidence: 'medium' });
});

test('does not mistake a known platform name for the employer', async () => {
  const company = await resolveCompany({ html: '<meta property="og:site_name" content="LinkedIn">', url: 'https://linkedin.com/jobs/123' });
  assert.equal(company.name, '');
  assert.equal(isPlatformName('SmartRecruiters'), true);
});

test('recognizes supported ATS URLs', () => {
  assert.deepEqual(atsDetails('https://jobs.ashbyhq.com/acme/123'), { provider: 'ashby', account: 'acme' });
});
