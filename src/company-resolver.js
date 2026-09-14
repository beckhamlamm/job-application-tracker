// Resolves employer names through ranked structured-data, ATS API, metadata, and domain strategies.
const { decodeHtml, getMetaContent, getStructuredJob } = require('./job-parser');
const { publicFetch } = require('./public-fetch');

const PLATFORM_NAMES = new Set([
  'ashby', 'greenhouse', 'indeed', 'lever', 'linkedin', 'smartrecruiters', 'workable', 'workday',
]);

function result(name, source, confidence) {
  return { name: decodeHtml(name), source, confidence };
}

function cleanSlug(slug = '') {
  let decoded = slug;
  try { decoded = decodeURIComponent(slug); } catch { /* Keep malformed slugs readable. */ }
  return decoded
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isPlatformName(name = '') {
  return PLATFORM_NAMES.has(name.trim().toLowerCase().replace(/\s+/g, ''));
}

function atsDetails(url) {
  const target = new URL(url);
  const segments = target.pathname.split('/').filter(Boolean);
  if (/^(?:job-boards\.|boards\.)greenhouse\.io$/i.test(target.hostname)) {
    return { provider: 'greenhouse', account: segments[0] };
  }
  if (/^jobs\.(?:eu\.)?lever\.co$/i.test(target.hostname)) {
    return { provider: 'lever', account: segments[0] };
  }
  if (/^jobs\.ashbyhq\.com$/i.test(target.hostname)) {
    return { provider: 'ashby', account: segments[0] };
  }
  if (/^(?:careers|jobs)\.smartrecruiters\.com$/i.test(target.hostname)) {
    return { provider: 'smartrecruiters', account: segments[0], jobId: segments[1]?.match(/^\d+/)?.[0] || segments[1] };
  }
  if (/^apply\.workable\.com$/i.test(target.hostname)) {
    return { provider: 'workable', account: segments[0] };
  }
  return null;
}

async function fetchJson(fetchImpl, url, signal) {
  const response = await fetchImpl(url, { signal, headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Company lookup returned ${response.status}`);
  return response.json();
}

async function resolveFromAts(details, fetchImpl, signal) {
  if (!details?.account) return null;
  try {
    if (details.provider === 'greenhouse') {
      const board = await fetchJson(fetchImpl, `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(details.account)}`, signal);
      if (board.name) return result(board.name, 'Greenhouse board API', 'high');
    }
    if (details.provider === 'smartrecruiters' && details.jobId) {
      const posting = await fetchJson(fetchImpl, `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(details.account)}/postings/${encodeURIComponent(details.jobId)}`, signal);
      if (posting.company?.name) return result(posting.company.name, 'SmartRecruiters API', 'high');
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    // Optional API unavailable: continue to page evidence.
  }
  return null;
}

function genericMetadataCompany(html, url) {
  const siteName = decodeHtml(getMetaContent(html, 'og:site_name'));
  if (siteName && !isPlatformName(siteName)) return result(siteName, 'page metadata', 'medium');

  const target = new URL(url);
  if (/(^|\.)(greenhouse\.io|lever\.co|ashbyhq\.com|smartrecruiters\.com|workable\.com|myworkdayjobs\.com|linkedin\.com|indeed\.com|glassdoor\.com)$/.test(target.hostname)) {
    return result('', 'unresolved', 'low');
  }
  const host = target.hostname.replace(/^www\.|^careers\.|^jobs\./g, '');
  const label = host.split('.')[0];
  if (label && !isPlatformName(label)) return result(cleanSlug(label), 'company domain', 'low');
  return result('', 'unresolved', 'low');
}

async function resolveCompany({ html, url, job = getStructuredJob(html), fetchImpl = publicFetch, signal }) {
  const organization = job?.hiringOrganization;
  const structuredName = decodeHtml((Array.isArray(organization) ? organization[0] : organization)?.name);
  if (structuredName && !isPlatformName(structuredName)) {
    return result(structuredName, 'JobPosting structured data', 'high');
  }

  const details = atsDetails(url);
  const atsResult = await resolveFromAts(details, fetchImpl, signal);
  if (atsResult) return atsResult;
  const metadata = genericMetadataCompany(html, url);
  if (metadata.name) return metadata;
  if (details?.account) return result(cleanSlug(details.account), `${details.provider} account (inferred)`, 'low');
  return metadata;
}

module.exports = { atsDetails, cleanSlug, genericMetadataCompany, isPlatformName, resolveCompany };
