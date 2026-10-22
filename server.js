/**
 * Standalone HTTP server for the Node version of OpenCoco.
 * Serves public/ and routes the API to the same handlers Netlify runs, so the
 * app works outside Netlify (e.g. in Docker).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
};

const searchHandler = require('./netlify/functions/search').handler;
const providersHandler = require('./netlify/functions/providers').handler;

// The frontend calls /.netlify/functions/*; /api/* mirrors the Netlify redirects.
const ROUTES = {
  '/api/search': searchHandler,
  '/api/providers': providersHandler,
  '/.netlify/functions/search': searchHandler,
  '/.netlify/functions/providers': providersHandler,
};

function sendJSON(res, status, body, extraHeaders = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...extraHeaders });
  res.end(JSON.stringify(body));
}

async function runFunction(handler, req, url, res) {
  try {
    const result = await handler({
      httpMethod: req.method,
      path: url.pathname,
      queryStringParameters: Object.fromEntries(url.searchParams),
    });
    res.writeHead(result.statusCode, result.headers);
    res.end(result.body);
  } catch (err) {
    console.error(err);
    sendJSON(res, 500, { error: 'Internal server error' });
  }
}

async function serveStatic(pathname, res) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return sendJSON(res, 400, { error: 'Bad request' });
  }

  const filePath = path.join(PUBLIC_DIR, decoded === '/' ? 'index.html' : decoded);
  // Encoded slashes (..%2f) survive URL parsing, so confirm the path stayed inside public/.
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    return sendJSON(res, 404, { error: 'Not found' });
  }

  try {
    const content = await fs.promises.readFile(filePath);
    const type = MIME_TYPES[path.extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(content);
  } catch {
    sendJSON(res, 404, { error: 'Not found' });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJSON(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, HEAD' });
  }

  const url = new URL(req.url, 'http://localhost');
  const handler = ROUTES[url.pathname];
  if (handler) return runFunction(handler, req, url, res);
  return serveStatic(url.pathname, res);
});

server.listen(PORT, () => {
  console.log(`OpenCoco listening on port ${PORT}`);
});

// Node runs as PID 1 in a container and ignores SIGTERM unless it is handled,
// which would make `docker stop` wait for the timeout and then SIGKILL.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
