// Reads schema job records, organization references, and microdata without fetching or executing scripts.
const { load } = require('cheerio');

const MAX_OBJECT_DEPTH = 40;

function objects(value, output = [], depth = 0) {
  if (!value || typeof value !== 'object' || depth > MAX_OBJECT_DEPTH) return output;
  output.push(value);
  for (const child of Object.values(value)) objects(child, output, depth + 1);
  return output;
}

function hasType(value, type) {
  return [value?.['@type']].flat().some((item) => typeof item === 'string' && item.split(/[\/#]/).pop() === type);
}

function findJobPosting(value) {
  return objects(value).find((node) => hasType(node, 'JobPosting')) || null;
}

function readJsonNodes($) {
  const nodes = [];
  $('script').each((_, el) => {
    if (!['application/ld+json', 'application/json'].includes(($(el).attr('type') || '').toLowerCase())) return;
    try { objects(JSON.parse($(el).text()), nodes); } catch { /* Ignore malformed optional metadata. */ }
  });
  return nodes;
}

function samePage(candidate, url) {
  if (!candidate) return false;
  try {
    const a = new URL(candidate, url);
    const b = new URL(url);
    return a.origin === b.origin && a.pathname === b.pathname;
  } catch { return false; }
}

function selectJsonJob(nodes, url) {
  const jobs = nodes.filter((node) => hasType(node, 'JobPosting'));
  const selected = jobs.find((job) => samePage(job.url || job.mainEntityOfPage?.['@id'], url)) || (jobs.length === 1 ? jobs[0] : null);
  if (!selected) return null;
  const resolve = (org) => org?.['@id'] ? { ...nodes.find((node) => node['@id'] === org['@id'] && node.name), ...org } : org;
  return { ...selected, hiringOrganization: Array.isArray(selected.hiringOrganization)
    ? selected.hiringOrganization.map(resolve) : resolve(selected.hiringOrganization) };
}

function readMicrodataJob($) {
  const scopes = $('[itemtype], [typeof]').filter((_, el) => /(?:^|[\s/#:])JobPosting$/.test($(el).attr('itemtype') || $(el).attr('typeof') || ''));
  if (scopes.length !== 1) return null;
  const scope = scopes.first();
  const field = (root, key) => root.find(`[itemprop~="${key}"], [property~="${key}"]`).first();
  const value = (el) => el.attr('content') || el.attr('datetime') || el.text().trim();
  const org = field(scope, 'hiringOrganization');
  return { '@type': 'JobPosting', title: value(field(scope, 'title')), datePosted: value(field(scope, 'datePosted')),
    description: value(field(scope, 'description')), hiringOrganization: { name: value(field(org, 'name')) || value(org) } };
}

function getStructuredJob(html, url) {
  const $ = load(html);
  return selectJsonJob(readJsonNodes($), url) || readMicrodataJob($);
}

module.exports = { objects, hasType, findJobPosting, getStructuredJob };
