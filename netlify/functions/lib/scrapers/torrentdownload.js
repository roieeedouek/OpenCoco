/**
 * TorrentDownload scraper - HTML scraping.
 */
const client = require('../client');
const { parseSeeders, parseSize, cleanName, makeMagnet } = require('../utils');

const NAME = 'TorrentDownload';
const BASE = 'https://www.torrentdownload.info';

async function search(query) {
  const url = `${BASE}/search?q=${encodeURIComponent(query)}`;
  const $ = await client.getSoup(url);
  if (!$) return [];

  const results = [];
  const table = $('table.table2');
  if (!table.length) return [];

  table.find('tr').slice(1).each((_, row) => {
    const cols = $(row).find('td');
    if (cols.length < 4) return;

    const nameTag = $(cols[0]).find('a').first();
    const name = cleanName(nameTag.text());
    if (!name) return;

    const href = nameTag.attr('href') || '';
    const hashMatch = href.match(/\/([a-fA-F0-9]{40})\//);
    if (!hashMatch) return;
    const magnet = makeMagnet(hashMatch[1], name);

    const sizeText = cols.length > 2 ? $(cols[2]).text().trim() : '';
    const seeders = cols.length > 3 ? parseSeeders($(cols[3]).text()) : 0;

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
