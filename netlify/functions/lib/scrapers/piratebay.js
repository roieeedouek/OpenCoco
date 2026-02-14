/**
 * ThePirateBay scraper - JSON API at apibay.org.
 */
const client = require('../client');
const { makeMagnet, formatSize, parseSeeders, cleanName } = require('../utils');

const NAME = 'ThePirateBay';
const BASE = 'https://apibay.org';

async function search(query) {
  const url = `${BASE}/q.php?q=${encodeURIComponent(query)}&cat=0`;
  const data = await client.getJSON(url);
  if (!data || !Array.isArray(data)) return [];
  const results = [];
  for (const item of data) {
    if (String(item.id) === '0') continue;
    const hash = item.info_hash;
    if (!hash || hash.length < 20) continue;
    const name = cleanName(item.name);
    if (!name) continue;
    const seeders = parseSeeders(item.seeders);
    const sizeBytes = parseInt(item.size, 10) || 0;
    const sizeGb = +(sizeBytes / (1024 ** 3)).toFixed(2);
    results.push({
      name,
      size: formatSize(sizeGb),
      size_gb: sizeGb,
      seeders,
      magnet: makeMagnet(hash, name),
      provider: NAME,
    });
  }
  return results;
}

module.exports = { name: NAME, base_url: BASE, search };
