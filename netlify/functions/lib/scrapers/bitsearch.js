/**
 * BitSearch scraper - HTML scraping.
 */
const client = require('../client');
const { parseSeeders, parseSize, cleanName } = require('../utils');

const NAME = 'BitSearch';
const BASE = 'https://bitsearch.to';

async function search(query) {
  const url = `${BASE}/search?q=${encodeURIComponent(query)}&sort=size`;
  const $ = await client.getSoup(url);
  if (!$) return [];

  const results = [];
  $('li.search-result, li.card.search-result').each((_, item) => {
    const $item = $(item);
    const nameTag = $item.find('h5.title a, a.title').first();
    const name = cleanName(nameTag.text());
    if (!name) return;

    const magnetTag = $item.find('a[href^="magnet:"]').first();
    if (!magnetTag.length) return;
    const magnet = magnetTag.attr('href');

    let sizeText = '';
    let seeders = 0;
    $item.find('div.stats div, div.info span').each((_, stat) => {
      const text = $(stat).text().trim();
      if (/\d+\s*(GB|MB|KB|TB)/i.test(text)) sizeText = text;
      if (/seed/i.test(text) || /se:/i.test(text)) seeders = parseSeeders(text);
    });

    if (!sizeText) {
      const full = $item.text();
      const m = full.match(/([\d,.]+\s*(?:GB|MB|KB|TB))/i);
      if (m) sizeText = m[1];
    }

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
