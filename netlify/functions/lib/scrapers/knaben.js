/**
 * Knaben scraper - HTML scraping.
 */
const client = require('../client');
const { parseSeeders, parseSize, cleanName } = require('../utils');

const NAME = 'Knaben';
const BASE = 'https://knaben.eu';

async function search(query) {
  const url = `${BASE}/search/index.php?q=${encodeURIComponent(query)}&search=fast`;
  const $ = await client.getSoup(url);
  if (!$) return [];

  const results = [];
  $('table tr, div.result').each((_, row) => {
    const $row = $(row);
    const magnetTag = $row.find('a[href^="magnet:"]').first();
    if (!magnetTag.length) return;
    const magnet = magnetTag.attr('href');

    let name = '';
    const nameTag = $row.find('a.title, td.name a, a[href*="/torrent/"]').first();
    if (nameTag.length) {
      name = cleanName(nameTag.text());
    }
    if (!name) {
      const dnMatch = (magnet || '').match(/dn=([^&]+)/);
      if (dnMatch) name = decodeURIComponent(dnMatch[1]).replace(/\+/g, ' ');
    }
    if (!name) return;

    const text = $row.text();
    const sizeMatch = text.match(/([\d,.]+\s*(?:GB|MB|KB|TB|GiB|MiB))/i);
    const sizeText = sizeMatch ? sizeMatch[1] : '';

    let seeders = 0;
    const seedTag = $row.find('td.seed, span.seed').first();
    if (seedTag.length) seeders = parseSeeders(seedTag.text());

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
