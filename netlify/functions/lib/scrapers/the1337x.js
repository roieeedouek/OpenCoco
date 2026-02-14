/**
 * 1337x scraper - HTML scrape with two-phase fetch (list -> detail page).
 */
const client = require('../client');
const { parseSeeders, parseSize, cleanName } = require('../utils');

const NAME = '1337x';
const BASE = 'https://1337x.to';

async function search(query) {
  const url = `${BASE}/search/${encodeURIComponent(query)}/1/`;
  const $ = await client.getSoup(url);
  if (!$) return [];

  const links = [];
  $('td.coll-1.name a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('/torrent/')) links.push(BASE + href);
  });

  if (!links.length) return [];

  // Fetch detail pages concurrently (limit to 15)
  const detailPromises = links.slice(0, 15).map(async (detailUrl) => {
    try {
      const page = await client.getSoup(detailUrl);
      if (!page) return null;

      const name = cleanName(page('div.box-info-heading h1').text());
      if (!name) return null;

      const magnetTag = page('a[href^="magnet:"]').first();
      if (!magnetTag.length) return null;
      const magnet = magnetTag.attr('href');

      let sizeText = '';
      let seedersText = '0';
      page('ul.list li').each((_, li) => {
        const label = page(li).find('strong').text().toLowerCase();
        const value = page(li).find('span').text().trim();
        if (label.includes('size')) {
          sizeText = value.replace(/\(.*?\)/g, '').trim();
        } else if (label.includes('seeders')) {
          seedersText = value;
        }
      });

      return {
        name,
        size: sizeText || 'N/A',
        size_gb: parseSize(sizeText),
        seeders: parseSeeders(seedersText),
        magnet,
        provider: NAME,
      };
    } catch {
      return null;
    }
  });

  const settled = await Promise.all(detailPromises);
  return settled.filter(Boolean);
}

module.exports = { name: NAME, base_url: BASE, search };
