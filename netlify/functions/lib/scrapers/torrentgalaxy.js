/**
 * TorrentGalaxy scraper - HTML scraping.
 */
const client = require('../client');
const { parseSeeders, parseSize, cleanName } = require('../utils');

const NAME = 'TorrentGalaxy';
const BASE = 'https://tgx.rs';

async function search(query) {
  const url = `${BASE}/torrents.php?search=${encodeURIComponent(query)}&sort=seeders&order=desc`;
  const $ = await client.getSoup(url);
  if (!$) return [];

  const results = [];
  $('div.tgxtablerow').each((_, row) => {
    const $row = $(row);
    const nameTag = $row.find('a.txlight').first();
    const name = cleanName(nameTag.text() || $row.find('a[href*="/torrent/"]').first().text());
    if (!name) return;

    const magnetTag = $row.find('a[href^="magnet:"]').first();
    if (!magnetTag.length) return;
    const magnet = magnetTag.attr('href');

    let sizeText = '';
    let seeders = 0;
    $row.find('div.tgxtablecell').each((_, cell) => {
      const $cell = $(cell);
      const text = $cell.text().trim();
      if (/\d+\s*(GB|MB|KB|TB)/i.test(text)) sizeText = text;
      const seedSpan = $cell.find('font[color="green"], span b').first();
      if (seedSpan.length) {
        const s = parseSeeders(seedSpan.text());
        if (s > 0) seeders = s;
      }
    });

    results.push({
      name,
      size: sizeText || 'N/A',
      size_gb: parseSize(sizeText),
      seeders,
      magnet,
      provider: NAME,
    });
  });
  return results;
}

module.exports = { name: NAME, base_url: BASE, search };
