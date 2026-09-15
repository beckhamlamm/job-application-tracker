// Extracts job metadata from HTML and embedded structured records without executing page scripts.
const { load } = require('cheerio');
const { getDomain } = require('tldts');
function decodeHtml(value = '') { return typeof value === 'string' ? load(value).text().replace(/\s+/g, ' ').trim() : ''; }
function getMetaContent(html, key) {
  const $ = load(html);
  return $('meta').filter((_, el) => [$(el).attr('name'), $(el).attr('property')].includes(key)).first().attr('content') || '';
}
function objects(value, output = [], depth = 0) {
  if (!value || typeof value !== 'object' || depth > 40) return output;
  output.push(value);
  for (const child of Object.values(value)) objects(child, output, depth + 1);
  return output;
}
const hasType = (value, type) => [value?.['@type']].flat().some((item) => typeof item === 'string' && item.split(/[\/#]/).pop() === type);
function findJobPosting(value) { return objects(value).find((node) => hasType(node, 'JobPosting')) || null; }
function getStructuredJob(html, url) {
  const $ = load(html);
  const nodes = [];
  $('script').each((_, el) => {
    if (!['application/ld+json', 'application/json'].includes(($(el).attr('type') || '').toLowerCase())) return;
    try { objects(JSON.parse($(el).text()), nodes); } catch { /* Ignore malformed optional metadata. */ }
  });
  const jobs = nodes.filter((node) => hasType(node, 'JobPosting'));
  const sameUrl = (candidate) => {
    if (!candidate) return false;
    try { const a = new URL(candidate, url); const b = new URL(url); return a.origin === b.origin && a.pathname === b.pathname; } catch { return false; }
  };
  const selected = jobs.find((job) => sameUrl(job.url || job.mainEntityOfPage?.['@id'])) || (jobs.length === 1 ? jobs[0] : null);
  if (selected) {
    const resolve = (org) => org?.['@id'] ? { ...nodes.find((node) => node['@id'] === org['@id'] && node.name), ...org } : org;
    return { ...selected, hiringOrganization: Array.isArray(selected.hiringOrganization) ? selected.hiringOrganization.map(resolve) : resolve(selected.hiringOrganization) };
  }
  const scopes = $('[itemtype], [typeof]').filter((_, el) => /(?:^|[\s/#:])JobPosting$/.test($(el).attr('itemtype') || $(el).attr('typeof') || ''));
  if (scopes.length !== 1) return null;
  const scope = scopes.first();
  const field = (root, key) => root.find(`[itemprop~="${key}"], [property~="${key}"]`).first();
  const value = (el) => el.attr('content') || el.attr('datetime') || el.text().trim();
  const org = field(scope, 'hiringOrganization');
  return { '@type': 'JobPosting', title: value(field(scope, 'title')), datePosted: value(field(scope, 'datePosted')),
    description: value(field(scope, 'description')), hiringOrganization: { name: value(field(org, 'name')) || value(org) } };
}
function validDate(value) {
  const date = typeof value === 'string' ? value.slice(0, 10) : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const parsed = new Date(date);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().startsWith(date) ? date : '';
}
function parseJobPage(html, url) {
  const $ = load(html);
  const job = getStructuredJob(html, url);
  let pageCompany = '';
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      for (const node of objects(JSON.parse($(el).text()))) {
        if (hasType(node, 'Organization') && node.name && node.url) {
          try { if (getDomain(new URL(node.url, url).hostname) === getDomain(new URL(url).hostname)) pageCompany = decodeHtml(node.name); } catch {}
        }
      }
    } catch {}
  });
  $('script, style, nav, footer, [hidden], [aria-hidden="true"]').remove();
  const heading = $('main h1, article h1').first().text() || $('h1').first().text();
  const generic = /^(?:careers?|jobs?|join (?:us|our team)|open (?:roles|positions)|opportunities|apply(?: now)?)$/i;
  let role = decodeHtml(job?.title || job?.name);
  if (!role) role = [heading, getMetaContent(html, 'og:title'), $('title').text()].map(decodeHtml)
    .find((text) => text && !generic.test(text) && !/security checkpoint|access denied|verify.*browser/i.test(text)) || '';
  const brand = getMetaContent(html, 'og:site_name');
  if (brand && role.endsWith(` | ${brand}`)) role = role.slice(0, -brand.length - 3).trim();
  return { url, structuredJob: job, role, datePosted: validDate(job?.datePosted), pageCompany };
}
module.exports = { decodeHtml, findJobPosting, getMetaContent, getStructuredJob, parseJobPage };
