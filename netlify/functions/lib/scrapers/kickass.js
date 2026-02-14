/**
 * KickAss Torrents scraper - HTML scraping.
 */
const client = require('../client');
const { parseSeeders, parseSize, cleanName } = require('../utils');

const NAME = 'KickAss';
const DOMAINS = ['kick4ss.com', 'thekat.info', 'kickass.cm', 'kickasstorrents.to', 'kat.am'];

async function findWorkingDomain() {
  for (const domain of DOMAINS) {
    const resp = await client.get(`https://${domain}`, { timeout: 4000 });
    if (resp) return `https://${domain}`;
  }
  return `https://${DOMAINS[0]}`;
}

async function search(query) {
  const base = await findWorkingDomain();
  const url = `${base}/usearch/${encodeURIComponent(query)}/?field=size&sorder=desc`;
  const $ = await client.getSoup(url);
  if (!$) return [];

  const results = [];
  const table = $('table.data');
  if (!table.length) return [];

  table.find('tr').slice(1).each((_, row) => {
    const cols = $(row).find('td');
    if (cols.length < 5) return;

    const nameTag = $(cols[0]).find('a.cellMainLink').first();
    const name = cleanName(nameTag.text());
    if (!name) return;

    const magnetTag = $(cols[0]).find('a[href^="magnet:"]').first();
    if (!magnetTag.length) return;
    const magnet = magnetTag.attr('href');

    const sizeText = cols.length > 1 ? $(cols[1]).text().trim() : '';
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

module.exports = { name: NAME, base_url: `https://${DOMAINS[0]}`, search };
