/**
 * Test suite for scraper parsing logic using mocked HTTP responses.
 * Run with: node test_scrapers.js
 */

let passCount = 0;
let failCount = 0;

function assert(condition, msg) {
  if (condition) {
    passCount++;
  } else {
    failCount++;
    console.error('  FAIL:', msg);
  }
}

// ==============================
// Mock the client module BEFORE requiring scrapers
// ==============================
const cheerio = require('cheerio');
const mockResponses = {};

function setMock(urlPattern, response) {
  mockResponses[urlPattern] = response;
}

function findMock(url) {
  for (const [pattern, resp] of Object.entries(mockResponses)) {
    if (url.includes(pattern)) return resp;
  }
  return null;
}

// Override the client module
const clientPath = require.resolve('./netlify/functions/lib/client');
require.cache[clientPath] = {
  id: clientPath,
  filename: clientPath,
  loaded: true,
  exports: {
    get: async (url) => {
      const mock = findMock(url);
      if (!mock) return null;
      return { ok: true, text: async () => mock.body, json: async () => JSON.parse(mock.body), status: 200 };
    },
    getText: async (url) => {
      const mock = findMock(url);
      return mock ? mock.body : null;
    },
    getJSON: async (url) => {
      const mock = findMock(url);
      if (!mock) return null;
      try { return JSON.parse(mock.body); } catch { return null; }
    },
    getSoup: async (url) => {
      const mock = findMock(url);
      if (!mock) return null;
      return cheerio.load(mock.body);
    },
  },
};

// ==============================
// Test utilities
// ==============================
async function testUtils() {
  console.log('\n--- Testing utils ---');
  const { parseSize, formatSize, parseSeeders, cleanName, makeMagnet } = require('./netlify/functions/lib/utils');

  assert(parseSize('2.50 GB') === 2.5, 'parseSize: 2.50 GB = 2.5');
  assert(parseSize('750 MB') === +(750 / 1024).toFixed(2), 'parseSize: 750 MB');
  assert(parseSize('1.5 TB') === 1536, 'parseSize: 1.5 TB');
  assert(parseSize('1,200 MB') === +(1200 / 1024).toFixed(2), 'parseSize: 1,200 MB');
  assert(parseSize('500 KiB') > 0, 'parseSize: 500 KiB > 0');
  assert(parseSize('') === 0, 'parseSize: empty = 0');
  assert(parseSize('unknown') === 0, 'parseSize: unknown = 0');
  assert(parseSize('2.1 GiB') === 2.1, 'parseSize: 2.1 GiB = 2.1');

  assert(formatSize(2.5) === '2.50 GB', 'formatSize: 2.5 GB');
  assert(formatSize(0.5) === '512.0 MB', 'formatSize: 0.5 GB = 512 MB');
  assert(formatSize(0) === 'N/A', 'formatSize: 0 = N/A');
  assert(formatSize(1500) === '1.46 TB', 'formatSize: 1500 GB -> TB');

  assert(parseSeeders('42') === 42, 'parseSeeders: 42');
  assert(parseSeeders('1,234') === 1234, 'parseSeeders: 1,234');
  assert(parseSeeders('') === 0, 'parseSeeders: empty = 0');
  assert(parseSeeders(null) === 0, 'parseSeeders: null = 0');

  assert(cleanName('<b>Test</b> Name') === 'Test Name', 'cleanName: strip HTML');
  assert(cleanName('Hello &amp; World') === 'Hello & World', 'cleanName: decode entities');
  assert(cleanName('  spaces   here  ') === 'spaces here', 'cleanName: normalize spaces');

  const magnet = makeMagnet('ABCDEF1234567890ABCDEF1234567890ABCDEF12', 'Test');
  assert(magnet.startsWith('magnet:?xt=urn:btih:ABCDEF'), 'makeMagnet: starts with btih');
  assert(magnet.includes('dn=Test'), 'makeMagnet: has display name');
  assert(magnet.includes('tr='), 'makeMagnet: has trackers');

  console.log('  Utils tests done');
}

// ==============================
// Test PirateBay scraper
// ==============================
async function testPirateBay() {
  console.log('\n--- Testing ThePirateBay ---');
  setMock('apibay.org', {
    body: JSON.stringify([
      { id: '123', info_hash: 'AAAA1234567890BBBB1234567890CCCC12345678', name: 'Ubuntu 24.04 Desktop amd64', size: '5368709120', seeders: '150', leechers: '30' },
      { id: '456', info_hash: 'DDDD1234567890EEEE1234567890FFFF12345678', name: 'Ubuntu Server 24.04', size: '2147483648', seeders: '80', leechers: '10' },
      { id: '0', info_hash: '0000000000000000000000000000000000000000', name: 'No results', size: '0', seeders: '0', leechers: '0' },
    ]),
  });

  delete require.cache[require.resolve('./netlify/functions/lib/scrapers/piratebay')];
  const piratebay = require('./netlify/functions/lib/scrapers/piratebay');
  const results = await piratebay.search('ubuntu');

  assert(results.length === 2, 'PirateBay: 2 results (skips id=0)');
  assert(results[0].name === 'Ubuntu 24.04 Desktop amd64', 'PirateBay: correct name');
  assert(results[0].seeders === 150, 'PirateBay: seeders = 150');
  assert(results[0].size_gb === 5.0, 'PirateBay: size = 5 GB');
  assert(results[0].magnet.startsWith('magnet:?xt=urn:btih:'), 'PirateBay: valid magnet');
  assert(results[0].provider === 'ThePirateBay', 'PirateBay: provider name');
  assert(results[1].name === 'Ubuntu Server 24.04', 'PirateBay: second result name');
  assert(results[1].size_gb === 2.0, 'PirateBay: second result size = 2 GB');

  console.log('  PirateBay tests done');
}

// ==============================
// Test YTS scraper
// ==============================
async function testYTS() {
  console.log('\n--- Testing YTS ---');
  setMock('yts.mx', {
    body: JSON.stringify({
      status: 'ok',
      data: {
        movies: [{
          title: 'The Matrix',
          title_long: 'The Matrix (1999)',
          torrents: [
            { hash: 'AA11BB22CC33DD44EE55FF66AA11BB22CC33DD44', quality: '1080p', video_codec: 'x264', type: 'bluray', size: '2.10 GB', seeds: 500 },
            { hash: 'FF11EE22DD33CC44BB55AA66FF11EE22DD33CC44', quality: '720p', video_codec: 'x264', type: 'bluray', size: '1.05 GB', seeds: 300 },
          ],
        }],
      },
    }),
  });

  delete require.cache[require.resolve('./netlify/functions/lib/scrapers/ytsmx')];
  const yts = require('./netlify/functions/lib/scrapers/ytsmx');
  const results = await yts.search('matrix');

  assert(results.length === 2, 'YTS: 2 results');
  assert(results[0].name.includes('The Matrix (1999)'), 'YTS: name includes title');
  assert(results[0].name.includes('1080p'), 'YTS: name includes quality');
  assert(results[0].seeders === 500, 'YTS: seeders = 500');
  assert(results[0].size === '2.10 GB', 'YTS: size string');
  assert(results[0].size_gb === 2.1, 'YTS: size_gb = 2.1');
  assert(results[0].magnet.includes('btih:AA11BB22'), 'YTS: magnet has hash');
  assert(results[1].seeders === 300, 'YTS: second result seeders');

  console.log('  YTS tests done');
}

// ==============================
// Test 1337x scraper
// ==============================
async function test1337x() {
  console.log('\n--- Testing 1337x ---');
  // Search page
  setMock('1337x.to/search', {
    body: `<html><body><table><tbody>
      <tr><td class="coll-1 name"><a href="/sub/1/">Sub</a><a href="/torrent/12345/ubuntu-24/">Ubuntu 24.04</a></td></tr>
      <tr><td class="coll-1 name"><a href="/sub/2/">Sub</a><a href="/torrent/67890/ubuntu-server/">Ubuntu Server</a></td></tr>
    </tbody></table></body></html>`,
  });

  // Detail pages
  setMock('1337x.to/torrent/12345', {
    body: `<html><body>
      <div class="box-info-heading"><h1>Ubuntu 24.04 Desktop amd64</h1></div>
      <a href="magnet:?xt=urn:btih:AAAA1234&dn=Ubuntu">Magnet</a>
      <ul class="list">
        <li><strong>Total size</strong><span>4.7 GB</span></li>
        <li><strong>Seeders</strong><span>245</span></li>
      </ul>
    </body></html>`,
  });

  setMock('1337x.to/torrent/67890', {
    body: `<html><body>
      <div class="box-info-heading"><h1>Ubuntu Server 24.04</h1></div>
      <a href="magnet:?xt=urn:btih:BBBB5678&dn=UbuntuServer">Magnet</a>
      <ul class="list">
        <li><strong>Total size</strong><span>2.1 GB (2,254,857,830 Bytes)</span></li>
        <li><strong>Seeders</strong><span>103</span></li>
      </ul>
    </body></html>`,
  });

  delete require.cache[require.resolve('./netlify/functions/lib/scrapers/the1337x')];
  const the1337x = require('./netlify/functions/lib/scrapers/the1337x');
  const results = await the1337x.search('ubuntu');

  assert(results.length === 2, '1337x: 2 results from 2 detail pages');
  // Results may come in any order due to concurrent fetch
  const r1 = results.find(r => r.name.includes('Desktop'));
  const r2 = results.find(r => r.name.includes('Server'));
  assert(r1, '1337x: found Desktop result');
  assert(r2, '1337x: found Server result');
  if (r1) {
    assert(r1.seeders === 245, '1337x: Desktop seeders = 245');
    assert(r1.size_gb === 4.7, '1337x: Desktop size = 4.7 GB');
    assert(r1.magnet.startsWith('magnet:'), '1337x: valid magnet');
  }
  if (r2) {
    assert(r2.size === '2.1 GB', '1337x: Server size string (parenthetical stripped)');
    assert(r2.seeders === 103, '1337x: Server seeders = 103');
  }

  console.log('  1337x tests done');
}

// ==============================
// Test Nyaa scraper
// ==============================
async function testNyaa() {
  console.log('\n--- Testing Nyaa ---');
  setMock('nyaa.si', {
    body: `<html><body><table class="torrent-list"><tbody>
      <tr>
        <td>Category</td>
        <td><a href="/view/1">Comments</a><a href="/view/1">[SubGroup] Anime Title S01E01 [1080p]</a></td>
        <td><a href="/download/1.torrent">DL</a><a href="magnet:?xt=urn:btih:NYAA1234&dn=anime">Magnet</a></td>
        <td>1.4 GiB</td>
        <td>2024-01-15</td>
        <td>520</td>
        <td>30</td>
      </tr>
    </tbody></table></body></html>`,
  });

  delete require.cache[require.resolve('./netlify/functions/lib/scrapers/nyaa')];
  const nyaa = require('./netlify/functions/lib/scrapers/nyaa');
  const results = await nyaa.search('anime');

  assert(results.length === 1, 'Nyaa: 1 result');
  assert(results[0].name.includes('Anime Title'), 'Nyaa: correct name');
  assert(results[0].seeders === 520, 'Nyaa: seeders = 520');
  assert(results[0].size === '1.4 GiB', 'Nyaa: size string');
  assert(results[0].size_gb === 1.4, 'Nyaa: size_gb = 1.4');
  assert(results[0].magnet.startsWith('magnet:'), 'Nyaa: valid magnet');
  assert(results[0].provider === 'Nyaa', 'Nyaa: provider name');

  console.log('  Nyaa tests done');
}

// ==============================
// Test EZTV scraper
// ==============================
async function testEZTV() {
  console.log('\n--- Testing EZTV ---');
  setMock('eztvx.to', {
    body: `<html><body><table class="forum_header_border">
      <tr class="forum_header_border">
        <td>Icon</td>
        <td><a href="/ep/1" class="epinfo">Breaking.Bad.S01E01.720p</a></td>
        <td><a href="magnet:?xt=urn:btih:EZTV1234&dn=bb" class="magnet">Magnet</a></td>
        <td>350 MB</td>
        <td>2024-01-10</td>
        <td>1,250</td>
      </tr>
    </table></body></html>`,
  });

  delete require.cache[require.resolve('./netlify/functions/lib/scrapers/eztv')];
  const eztv = require('./netlify/functions/lib/scrapers/eztv');
  const results = await eztv.search('breaking bad');

  assert(results.length === 1, 'EZTV: 1 result');
  assert(results[0].name.includes('Breaking.Bad'), 'EZTV: correct name');
  assert(results[0].seeders === 1250, 'EZTV: seeders = 1250');
  assert(results[0].size === '350 MB', 'EZTV: size string');
  assert(results[0].magnet.startsWith('magnet:'), 'EZTV: valid magnet');
  assert(results[0].provider === 'EZTV', 'EZTV: provider name');

  console.log('  EZTV tests done');
}

// ==============================
// Test TorrentGalaxy scraper
// ==============================
async function testTorrentGalaxy() {
  console.log('\n--- Testing TorrentGalaxy ---');
  setMock('tgx.rs', {
    body: `<html><body>
      <div class="tgxtablerow">
        <div class="tgxtablecell"><a href="/torrent/123/test" class="txlight">Movie.2024.1080p.BluRay</a></div>
        <div class="tgxtablecell"><a href="magnet:?xt=urn:btih:TGX12345&dn=movie">Magnet</a></div>
        <div class="tgxtablecell">4.5 GB</div>
        <div class="tgxtablecell"><font color="green">89</font></div>
      </div>
    </body></html>`,
  });

  delete require.cache[require.resolve('./netlify/functions/lib/scrapers/torrentgalaxy')];
  const tgx = require('./netlify/functions/lib/scrapers/torrentgalaxy');
  const results = await tgx.search('movie');

  assert(results.length === 1, 'TGX: 1 result');
  assert(results[0].name.includes('Movie.2024'), 'TGX: correct name');
  assert(results[0].seeders === 89, 'TGX: seeders = 89');
  assert(results[0].size === '4.5 GB', 'TGX: size string');
  assert(results[0].size_gb === 4.5, 'TGX: size_gb = 4.5');
  assert(results[0].magnet.startsWith('magnet:'), 'TGX: valid magnet');

  console.log('  TorrentGalaxy tests done');
}

// ==============================
// Test search function handler
// ==============================
async function testSearchHandler() {
  console.log('\n--- Testing search handler ---');
  // Keep mocks from above active
  delete require.cache[require.resolve('./netlify/functions/search')];
  const { handler } = require('./netlify/functions/search');

  // Test missing query
  const emptyResp = await handler({ queryStringParameters: {} });
  assert(emptyResp.statusCode === 400, 'Handler: 400 on empty query');
  const emptyBody = JSON.parse(emptyResp.body);
  assert(emptyBody.error === 'Missing search query', 'Handler: error message on empty');

  // Test with query (will use existing mocks)
  const resp = await handler({ queryStringParameters: { q: 'test' } });
  assert(resp.statusCode === 200, 'Handler: 200 on valid query');
  const body = JSON.parse(resp.body);
  assert(body.query === 'test', 'Handler: echoes query');
  assert(typeof body.total === 'number', 'Handler: has total count');
  assert(Array.isArray(body.results), 'Handler: has results array');
  assert(Array.isArray(body.errors), 'Handler: has errors array');
  // Results should be sorted by seeders
  if (body.results.length >= 2) {
    assert(body.results[0].seeders >= body.results[1].seeders, 'Handler: results sorted by seeders desc');
  }

  // Test provider filter
  const filteredResp = await handler({ queryStringParameters: { q: 'test', providers: 'YTS' } });
  const filteredBody = JSON.parse(filteredResp.body);
  assert(filteredResp.statusCode === 200, 'Handler: 200 with provider filter');
  for (const r of filteredBody.results) {
    assert(r.provider === 'YTS', 'Handler: only YTS results when filtered');
  }

  console.log('  Search handler tests done');
}

// ==============================
// Test providers function handler
// ==============================
async function testProvidersHandler() {
  console.log('\n--- Testing providers handler ---');
  delete require.cache[require.resolve('./netlify/functions/providers')];
  const { handler } = require('./netlify/functions/providers');

  const resp = await handler({});
  assert(resp.statusCode === 200, 'Providers: 200');
  const body = JSON.parse(resp.body);
  assert(Array.isArray(body.providers), 'Providers: has providers array');
  assert(body.providers.length === 11, 'Providers: 11 scrapers');
  for (const p of body.providers) {
    assert(typeof p.name === 'string' && p.name.length > 0, `Providers: ${p.name} has name`);
    assert(typeof p.base_url === 'string' && p.base_url.startsWith('https://'), `Providers: ${p.name} has valid URL`);
  }

  console.log('  Providers handler tests done');
}

// ==============================
// Run all tests
// ==============================
async function main() {
  console.log('OpenCoco Scraper Test Suite');
  console.log('==========================');

  await testUtils();
  await testPirateBay();
  await testYTS();
  await test1337x();
  await testNyaa();
  await testEZTV();
  await testTorrentGalaxy();
  await testSearchHandler();
  await testProvidersHandler();

  console.log('\n==========================');
  console.log(`Results: ${passCount} passed, ${failCount} failed out of ${passCount + failCount} assertions`);
  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('ALL TESTS PASSED');
  }
}

main().catch(e => {
  console.error('Test runner error:', e);
  process.exit(1);
});
