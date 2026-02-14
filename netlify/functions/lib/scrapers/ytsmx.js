/**
 * YTS.mx scraper - JSON API, movies only.
 */
const client = require('../client');
const { makeMagnet, parseSize } = require('../utils');

const NAME = 'YTS';
const BASE = 'https://yts.mx';

async function search(query) {
  const url = `${BASE}/api/v2/list_movies.json?query_term=${encodeURIComponent(query)}&sort_by=seeds&limit=30`;
  const data = await client.getJSON(url);
  if (!data) return [];

  const movies = data.data && data.data.movies;
  if (!movies) return [];

  const results = [];
  for (const movie of movies) {
    const title = movie.title_long || movie.title || '';
    const torrents = movie.torrents || [];
    for (const t of torrents) {
      const hash = t.hash;
      if (!hash) continue;
      const quality = t.quality || '';
      const codec = t.video_codec || '';
      const type = t.type || '';
      const name = `${title} [${quality}] [${codec}] [${type}]`;
      const sizeText = t.size || '';
      results.push({
        name,
        size: sizeText || 'N/A',
        size_gb: parseSize(sizeText),
        seeders: t.seeds || 0,
        magnet: makeMagnet(hash, title),
        provider: NAME,
      });
    }
  }
  return results;
}

module.exports = { name: NAME, base_url: BASE, search };
