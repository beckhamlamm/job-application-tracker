// Coordinates safe page fetching, board discovery, and field resolution independently of HTTP transport.
const { parseJobPage } = require('./job-parser');
const { resolveCompany } = require('./company-resolver');
const { validatePublicUrl } = require('./url-security');
const { publicFetch } = require('./public-fetch');
const { resolveCustomJobBoard } = require('./custom-job-board');

const PARSE_TIMEOUT_MS = 12_000;
const MAX_HTML_LENGTH = 4_000_000;

/**
 * Creates an async URL parser with replaceable fetching and extraction dependencies.
 * Fetch implementations must honor AbortSignal and return response-like objects.
 * The returned function rejects invalid URLs, blocked pages, and fetch failures;
 * missing extracted fields remain empty for the user to review manually.
 * @param {object} [dependencies] Network, parser, resolver, and timeout overrides.
 * @returns {function(string|URL): Promise<object>} Parser returning public job fields.
 */
function createJobService({
  fetchPage = publicFetch,
  parsePage = parseJobPage,
  resolveEmployer = resolveCompany,
  resolveBoard = resolveCustomJobBoard,
  timeoutMs = PARSE_TIMEOUT_MS,
} = {}) {
  return async function parseJob(input) {
    const target = validatePublicUrl(input);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const options = { signal: controller.signal, fetchImpl: fetchPage };
    try {
      const response = await fetchPage(target, {
        signal: controller.signal,
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; Applyboard/1.0)', accept: 'text/html' },
      });
      const html = (await response.text()).slice(0, MAX_HTML_LENGTH);
      const blocked =
        !response.ok || /<title[^>]*>\s*(?:Vercel Security Checkpoint|Access Denied)/i.test(html);
      const customJob = await resolveBoard(target, { ...options, html: blocked ? '' : html });
      if (customJob) {
        return customJob;
      }
      if (blocked) {
        throw new Error(
          'This website requires browser verification or is unavailable. Open it in your browser and enter the job details manually.',
        );
      }
      const { structuredJob, pageCompany, ...fields } = parsePage(html, response.url);
      const company = await resolveEmployer({
        ...options,
        html,
        url: response.url,
        job: structuredJob,
        pageCompany,
      });
      return {
        ...fields,
        company: company.name,
        companySource: company.source,
        companyConfidence: company.confidence,
      };
    } finally {
      clearTimeout(timeout);
    }
  };
}

module.exports = { createJobService };
