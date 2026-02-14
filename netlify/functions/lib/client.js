/**
 * HTTP client with user-agent rotation for scraping.
 */
const cheerio = require('cheerio');
const fetch = require('node-fetch');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
];

const DEFAULT_TIMEOUT = 6000;

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function get(url, { timeout = DEFAULT_TIMEOUT, headers = {} } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': randomUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        ...headers,
      },
      redirect: 'follow',
    });
    if (!resp.ok) return null;
    return resp;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function getText(url, opts) {
  const resp = await get(url, opts);
  if (!resp) return null;
  try {
    return await resp.text();
  } catch {
    return null;
  }
}

async function getJSON(url, opts) {
  const resp = await get(url, opts);
  if (!resp) return null;
  try {
    return await resp.json();
  } catch {
    return null;
  }
}

async function getSoup(url, opts) {
  const html = await getText(url, opts);
  if (!html) return null;
  return cheerio.load(html);
}

module.exports = { get, getText, getJSON, getSoup };
