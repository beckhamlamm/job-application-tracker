// Verifies company resolution priority, ATS recognition, API lookups, and safe metadata fallbacks.
const test = require('node:test');
const assert = require('node:assert/strict');
const { atsDetails, isPlatformName, resolveCompany } = require('../src/company-resolver');

const rtxUrl = 'https://globalhr.wd5.myworkdayjobs.com/en-US/rec_rtx_ext_gateway/job/Leadership-Development-Program---Engineering--Software-Discipline--Starts-June-2027-_01873618';

test('RTX Workday posting resolves from its employer statement when organization is blank', async () => {
  // Minimal fixture reproducing the blank organization and employer statement on the supplied page.
  const job = { '@type': 'JobPosting', hiringOrganization: { name: '' }, description: 'RTX Corporation is an Aerospace and Defense company. Its businesses include Collins Aerospace, Pratt & Whitney, and Raytheon. RTX is an Equal Opportunity Employer. All qualified applicants will receive consideration.' };
  const company = await resolveCompany({ html: '', url: rtxUrl, job });
  assert.equal(company.name, 'RTX');
});

test('Workday fallback neither guesses from incidental mentions nor overrides an explicit employer', async () => {
  const job = { hiringOrganization: { name: 'Collins Aerospace' }, description: 'RTX is an Equal Opportunity Employer.' };
  assert.equal((await resolveCompany({ html: '', url: rtxUrl, job })).name, 'Collins Aerospace');
  for (const description of ['Experience with RTX and Workday products.', 'The company is an Equal Opportunity Employer.', 'Acme is an Equal Opportunity Employer. Another Company is an Equal Opportunity Employer.']) {
    assert.equal((await resolveCompany({ html: '', url: rtxUrl, job: { description } })).name, '');
  }
});

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
  assert.deepEqual(company, { name: 'Northstar Labs', source: 'lever account (inferred)', confidence: 'low' });
});

test('does not mistake a known platform name for the employer', async () => {
  const company = await resolveCompany({ html: '<meta property="og:site_name" content="LinkedIn">', url: 'https://linkedin.com/jobs/123' });
  assert.equal(company.name, '');
  assert.equal(isPlatformName('SmartRecruiters'), true);
});

test('recognizes supported ATS URLs', () => {
  assert.deepEqual(atsDetails('https://jobs.ashbyhq.com/acme/123'), { provider: 'ashby', account: 'acme' });
});

test('accepts platform companies explicitly named as the hiring organization', async () => {
  for (const [name, url] of [
    ['Workday', 'https://workday.wd5.myworkdayjobs.com/Workday/job/123'],
    ['LinkedIn', 'https://www.linkedin.com/jobs/view/123'],
    ['Greenhouse', 'https://boards.greenhouse.io/greenhouse/jobs/123'],
    ['Lever', 'https://jobs.lever.co/lever/123'],
    ['Ashby', 'https://jobs.ashbyhq.com/Ashby/123'],
  ]) {
    for (const organization of [{ name }, [{ name }]]) {
      const html = `<script type="application/ld+json">${JSON.stringify({ '@type': 'JobPosting', hiringOrganization: organization })}</script>`;
      const company = await resolveCompany({ html, url, fetchImpl: () => assert.fail('explicit employer needs no lookup') });
      assert.equal(company.name, name);
      assert.equal(company.confidence, 'high');
    }
  }
});

test('accepts platform employers from official ATS responses', async () => {
  for (const [url, payload, name] of [
    ['https://boards.greenhouse.io/greenhouse/jobs/123', { name: 'Greenhouse' }, 'Greenhouse'],
    ['https://jobs.smartrecruiters.com/LinkedIn/123-engineer', { company: { name: 'LinkedIn' } }, 'LinkedIn'],
  ]) {
    const company = await resolveCompany({ html: '', url, fetchImpl: async () => ({ ok: true, json: async () => payload }) });
    assert.equal(company.name, name);
    assert.equal(company.confidence, 'high');
  }
});

test('platform branding does not override a different hiring organization', async () => {
  const html = '<meta property="og:site_name" content="LinkedIn"><script type="application/ld+json">{"@type":"JobPosting","hiringOrganization":{"name":"Acme"}}</script>';
  const company = await resolveCompany({ html, url: 'https://www.linkedin.com/jobs/view/123' });
  assert.equal(company.name, 'Acme');
});

test('generic platform branding alone is insufficient employer evidence', async () => {
  for (const [name, url] of [['Workday', 'https://workday.com/jobs/123'], ['LinkedIn', 'https://linkedin.com/jobs/view/123']]) {
    const company = await resolveCompany({ html: `<meta property="og:site_name" content="${name}">`, url });
    assert.equal(company.name, '');
  }
});
