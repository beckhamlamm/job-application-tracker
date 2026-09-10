const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY = 1_000_000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function decode(value = '') {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ').trim();
}

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function findJobPosting(value) {
  if (!value || typeof value !== 'object') return null;
  if ((Array.isArray(value['@type']) ? value['@type'] : [value['@type']]).includes('JobPosting')) return value;
  for (const child of Object.values(value)) {
    const found = Array.isArray(child)
      ? child.map(findJobPosting).find(Boolean)
      : findJobPosting(child);
    if (found) return found;
  }
  return null;
}

function meta(html, key) {
  const tags = html.match(/<meta\s[^>]*>/gi) || [];
  const tag = tags.find((item) => new RegExp(`(?:name|property)=["']${key}["']`, 'i').test(item));
  return tag?.match(/content=["']([^"']*)["']/i)?.[1] || '';
}

function parseJobPage(html, url) {
  let job = null;
  const scripts = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const script of scripts) {
    try {
      const raw = script.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '').trim();
      job = findJobPosting(JSON.parse(raw));
      if (job) break;
    } catch { /* malformed structured data; fall back to metadata */ }
  }

  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
  const host = new URL(url).hostname.replace(/^www\./, '');
  const organization = first(job?.hiringOrganization);
  const role = decode(job?.title || meta(html, 'og:title') || titleTag).replace(/\s+[|–—-]\s+(LinkedIn|Indeed|Glassdoor).*$/i, '');
  let company = decode(organization?.name || meta(html, 'og:site_name'));
  if (!company && role.includes(' at ')) company = role.split(/ at /i).pop();
  if (!company) company = host.split('.')[0].replace(/(^|[-_])(\w)/g, (_, space, c) => `${space ? ' ' : ''}${c.toUpperCase()}`);

  return {
    url,
    company,
    role,
    datePosted: String(job?.datePosted || '').slice(0, 10),
  };
}

function isPrivateHost(hostname) {
  return hostname === 'localhost' || hostname === '::1' || hostname.endsWith('.local') ||
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
}

async function parseRequest(req, res) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > MAX_BODY) throw new Error('Request is too large.');
  }
  const input = JSON.parse(body || '{}').url;
  let target;
  try { target = new URL(input); } catch { throw new Error('Enter a valid URL, including https://'); }
  if (!['http:', 'https:'].includes(target.protocol) || isPrivateHost(target.hostname)) throw new Error('That URL cannot be fetched.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(target, {
      redirect: 'follow', signal: controller.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; Applyboard/1.0)', accept: 'text/html' },
    });
    if (!response.ok) throw new Error(`The job page returned ${response.status}. You can still add it manually.`);
    const html = (await response.text()).slice(0, 4_000_000);
    sendJson(res, 200, parseJobPage(html, response.url));
  } finally { clearTimeout(timeout); }
}

function sendJson(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(value));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/parse') {
    try { await parseRequest(req, res); }
    catch (error) { sendJson(res, 400, { error: error.name === 'AbortError' ? 'The page took too long to respond.' : error.message }); }
    return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) return sendJson(res, 405, { error: 'Method not allowed' });
  const requestPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.resolve(PUBLIC_DIR, `.${requestPath}`);
  if (!filePath.startsWith(PUBLIC_DIR)) return sendJson(res, 404, { error: 'Not found' });
  fs.readFile(filePath, (error, data) => {
    if (error) return sendJson(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'content-type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
});

if (require.main === module) server.listen(PORT, () => console.log(`Applyboard is running at http://localhost:${PORT}`));

module.exports = { decode, findJobPosting, parseJobPage, isPrivateHost };
