/**
 * Netlify Function: providers
 * Returns the list of available scraper providers.
 */
const scrapers = require('./lib/scrapers');

exports.handler = async () => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      providers: scrapers.map(s => ({ name: s.name, base_url: s.base_url })),
    }),
  };
};
