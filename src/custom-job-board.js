// Retrieves jobs from verified public ATS boards used by company-owned careers sites.
const { publicFetch } = require('./public-fetch');
const { decodeHtml } = require('./job-parser');

const BOARDS = { 'helsing.ai': 'helsing', 'www.helsing.ai': 'helsing' };

async function resolveCustomJobBoard(url, { fetchImpl = publicFetch, signal } = {}) {
  const target = new URL(url);
  const board = BOARDS[target.hostname];
  const pathId = target.pathname.match(/^\/jobs\/(\d+)\/?$/)?.[1];
  if (!board || !pathId) return null;
  const queryId = target.searchParams.get('gh_jid');
  if (queryId && queryId !== pathId) throw new Error('The job IDs in this URL do not match.');
  const base = `https://boards-api.greenhouse.io/v1/boards/${board}`;
  const [postingResponse, boardResponse] = await Promise.all([
    fetchImpl(`${base}/jobs/${pathId}`, { signal }), fetchImpl(base, { signal }),
  ]);
  if (!postingResponse.ok || !boardResponse.ok) throw new Error('The job board could not provide this posting. It may have closed.');
  const posting = await postingResponse.json();
  const organization = await boardResponse.json();
  if (String(posting.id) !== pathId || !posting.title || !organization.name) throw new Error('The job board returned incomplete or mismatched job details.');
  return {
    url: target.href, company: decodeHtml(organization.name), role: decodeHtml(posting.title),
    // Greenhouse updated_at is an edit timestamp, not the original posting date.
    datePosted: '', companySource: 'Greenhouse board API', companyConfidence: 'high',
  };
}

module.exports = { resolveCustomJobBoard };
