/**
 * TorrentQuest scraper - HTML scraping.
 */
const client = require('../client');
const { parseSeeders, parseSize, cleanName } = require('../utils');

const NAME = 'TorrentQuest';
const BASE = 'https://torrentquest.com';

async function search(query) {
  const url = `${BASE}/search?q=${encodeURIComponent(query)}&sort=seeders&order=desc`;
  const $ = await client.getSoup(url);
  if (!$) return [];

  const results = [];
  $('table tbody tr, div.search-result').each((_, row) => {
    const $row = $(row);
    const magnetTag = $row.find('a[href^="magnet:"]').first();
    if (!magnetTag.length) return;
    const magnet = magnetTag.attr('href');

    let name = '';
    const nameTag = $row.find('a.title, td a[href*="/torrent/"]').first();
    if (nameTag.length) name = cleanName(nameTag.text());
    if (!name) {
      const dnMatch = (magnet || '').match(/dn=([^&]+)/);
      if (dnMatch) name = decodeURIComponent(dnMatch[1]).replace(/\+/g, ' ');
    }
    if (!name) return;

    const text = $row.text();
    const sizeMatch = text.match(/([\d,.]+\s*(?:GB|MB|KB|TB|GiB|MiB))/i);
    const sizeText = sizeMatch ? sizeMatch[1] : '';

    let seeders = 0;
    const cols = $row.find('td');
    if (cols.length >= 3) seeders = parseSeeders($(cols[cols.length - 2]).text());

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
