// Discovers Greenhouse integrations on arbitrary career domains and verifies inferred boards against job URLs.
const { load } = require('cheerio');
const { getDomain } = require('tldts');
const { publicFetch } = require('./public-fetch');
const { decodeHtml } = require('./job-parser');
function discoverBoards(url, html = '') {
  const target = new URL(url);
  const candidates = [];
  const $ = load(html);
  const add = (board, id, inferred = false) => {
    if (/^[\w-]+$/.test(board || '') && /^\d+$/.test(id || '')) candidates.push({ board, id, inferred });
  };
  $('a[href], iframe[src], script[src]').each((_, el) => {
    try {
      const link = new URL($(el).attr('href') || $(el).attr('src'), url);
      const path = link.pathname.split('/').filter(Boolean);
      if (/^(?:boards|job-boards)\.greenhouse\.io$/.test(link.hostname)) {
        if (path[0] === 'embed') add(link.searchParams.get('for'), link.searchParams.get('token') || target.searchParams.get('gh_jid'));
        else add(path[0], path[1] === 'jobs' ? path[2] : target.searchParams.get('gh_jid'));
      }
    } catch {}
  });
  const id = target.searchParams.get('gh_jid');
  if (id) {
    const pathId = target.pathname.match(/\/jobs\/(\d+)\/?$/)?.[1];
    if (pathId && pathId !== id) throw new Error('The job IDs in this URL do not match.');
    const domain = getDomain(target.hostname);
    if (domain) add(domain.split('.')[0], id, true);
  }
  const unique = candidates.filter((item, index) => candidates.findIndex((other) => other.board === item.board && other.id === item.id) === index);
  // A page with several job links is a listing, not evidence for choosing the first job.
  if (!id && new Set(unique.map((item) => `${item.board}/${item.id}`)).size > 1) return [];
  return unique.filter((item) => !id || item.id === id).slice(0, 3);
}
async function resolveCustomJobBoard(url, { html = '', fetchImpl = publicFetch, signal } = {}) {
  const target = new URL(url);
  for (const candidate of discoverBoards(url, html)) {
    try {
      const base = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(candidate.board)}`;
      const postingResponse = await fetchImpl(`${base}/jobs/${candidate.id}`, { signal });
      if (!postingResponse.ok) continue;
      const posting = await postingResponse.json();
      if (String(posting.id) !== candidate.id || !posting.title) continue;
      if (candidate.inferred) {
        const canonical = new URL(posting.absolute_url);
        if (canonical.hostname !== target.hostname || canonical.pathname.replace(/\/$/, '') !== target.pathname.replace(/\/$/, '')) continue;
      }
      const boardResponse = await fetchImpl(base, { signal });
      if (!boardResponse.ok) continue;
      const organization = await boardResponse.json();
      if (!organization.name) continue;
      return { url: target.href, company: decodeHtml(organization.name), role: decodeHtml(posting.title),
        datePosted: '', companySource: 'Greenhouse board API', companyConfidence: 'high' };
    } catch (error) { if (signal?.aborted) throw error; }
  }
  return null;
}
module.exports = { resolveCustomJobBoard, discoverBoards };
