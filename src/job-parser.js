// Selects role, posting date, and company-page evidence using structured records and HTML fallbacks.
const { load } = require('cheerio');
const { getDomain } = require('tldts');
const { objects, hasType, findJobPosting, getStructuredJob } = require('./structured-data');
function decodeHtml(value = '') { return typeof value === 'string' ? load(value).text().replace(/\s+/g, ' ').trim() : ''; }
function getMetaContent(html, key) {
  const $ = load(html);
  return $('meta').filter((_, el) => [$(el).attr('name'), $(el).attr('property')].includes(key)).first().attr('content') || '';
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
