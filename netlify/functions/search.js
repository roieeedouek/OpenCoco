/**
 * Netlify Function: search
 * Searches all torrent providers concurrently and returns aggregated results.
 */
const scrapers = require('./lib/scrapers');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const params = event.queryStringParameters || {};
  const query = (params.q || '').trim();

  if (!query) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing search query', results: [] }),
    };
  }

  // Optional provider filter
  const providerFilter = params.providers || '';
  const enabled = providerFilter
    ? providerFilter.split(',').map(p => p.trim().toLowerCase()).filter(Boolean)
    : [];

  const activscrapers = enabled.length
    ? scrapers.filter(s => enabled.includes(s.name.toLowerCase()))
    : scrapers;

  const errors = [];

  // Run all scrapers concurrently with individual error handling
  const promises = activscrapers.map(async (scraper) => {
    try {
      const results = await scraper.search(query);
      return { name: scraper.name, results: results || [], error: null };
    } catch (e) {
      return { name: scraper.name, results: [], error: e.message };
    }
  });

  const settled = await Promise.all(promises);

  let allResults = [];
  for (const { name, results, error } of settled) {
    if (error) errors.push({ provider: name, error });
    allResults = allResults.concat(results);
  }

  // Sort by seeders descending
  allResults.sort((a, b) => (b.seeders || 0) - (a.seeders || 0));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      query,
      total: allResults.length,
      results: allResults,
      errors,
    }),
  };
};
