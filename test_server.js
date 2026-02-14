/**
 * Local test server that mimics Netlify's runtime:
 * - Serves static files from public/
 * - Routes /.netlify/functions/* to the function handlers
 * - Routes /api/* via redirects
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3456;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
};

// Load function handlers
const searchHandler = require('./netlify/functions/search').handler;
const providersHandler = require('./netlify/functions/providers').handler;

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  let pathname = parsed.pathname;

  // Redirect /api/* to function paths
  if (pathname === '/api/search') pathname = '/.netlify/functions/search';
  if (pathname === '/api/providers') pathname = '/.netlify/functions/providers';

  // Handle function requests
  if (pathname === '/.netlify/functions/search') {
    const event = { queryStringParameters: parsed.query, httpMethod: 'GET' };
    const result = await searchHandler(event);
    res.writeHead(result.statusCode, result.headers);
    res.end(result.body);
    return;
  }

  if (pathname === '/.netlify/functions/providers') {
    const event = { queryStringParameters: parsed.query, httpMethod: 'GET' };
    const result = await providersHandler(event);
    res.writeHead(result.statusCode, result.headers);
    res.end(result.body);
    return;
  }

  // Serve static files
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.join(PUBLIC_DIR, pathname);
  const ext = path.extname(filePath);
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
});
