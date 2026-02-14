/**
 * Nyaa.si scraper - HTML scraping, primarily for anime.
 */
const client = require('../client');
const { parseSeeders, parseSize, cleanName } = require('../utils');

const NAME = 'Nyaa';
const BASE = 'https://nyaa.si';

async function search(query) {
  const url = `${BASE}/?f=0&c=0_0&q=${encodeURIComponent(query)}&s=seeders&o=desc`;
  const $ = await client.getSoup(url);
  if (!$) return [];

  const results = [];
  const table = $('table.torrent-list');
  if (!table.length) return [];

  table.find('tbody tr').each((_, row) => {
    const cols = $(row).find('td');
    if (cols.length < 7) return;

    const allLinks = $(cols[1]).find('a');
    const nameTag = allLinks.last();
    const name = cleanName(nameTag.text());
    if (!name) return;

    const magnetTag = $(cols[2]).find('a[href^="magnet:"]').first();
    if (!magnetTag.length) return;
    const magnet = magnetTag.attr('href');

    const sizeText = $(cols[3]).text().trim();
    const seeders = parseSeeders($(cols[5]).text());

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
