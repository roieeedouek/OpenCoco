/**
 * EZTV scraper - HTML scraping, primarily for TV shows.
 */
const client = require('../client');
const { parseSeeders, parseSize, cleanName } = require('../utils');

const NAME = 'EZTV';
const BASE = 'https://eztvx.to';

async function search(query) {
  const encoded = query.replace(/\s+/g, '-');
  const url = `${BASE}/search/${encodeURIComponent(encoded)}`;
  const $ = await client.getSoup(url);
  if (!$) return [];

  const results = [];
  const table = $('table.forum_header_border');
  if (!table.length) return [];

  table.find('tr.forum_header_border').each((_, row) => {
    const cols = $(row).find('td');
    if (cols.length < 5) return;

    const nameTag = $(cols[1]).find('a.epinfo').first();
    const name = cleanName(nameTag.text());
    if (!name) return;

    const magnetTag = $(cols[2]).find('a.magnet, a[href^="magnet:"]').first();
    if (!magnetTag.length) return;
    const magnet = magnetTag.attr('href') || '';
    if (!magnet.startsWith('magnet:')) return;

    const sizeText = cols.length > 3 ? $(cols[3]).text().trim() : '';
    const seeders = cols.length > 5 ? parseSeeders($(cols[5]).text()) : 0;

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
