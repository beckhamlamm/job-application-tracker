const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { parseJobPage } = require('./src/job-parser');
const { validatePublicUrl } = require('./src/url-security');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY = 1_000_000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

async function parseRequest(req, res) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > MAX_BODY) throw new Error('Request is too large.');
  }
  const input = JSON.parse(body || '{}').url;
  const target = validatePublicUrl(input);

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

module.exports = { server };
