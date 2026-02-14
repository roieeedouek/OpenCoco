/**
 * Shared utility functions for scrapers.
 */

const TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://open.demonii.com:1337/announce',
  'udp://explodie.org:6969/announce',
  'udp://tracker.moeking.me:6969/announce',
];

function makeMagnet(hash, name = '') {
  let magnet = `magnet:?xt=urn:btih:${hash}`;
  if (name) magnet += `&dn=${encodeURIComponent(name)}`;
  for (const t of TRACKERS) {
    magnet += `&tr=${encodeURIComponent(t)}`;
  }
  return magnet;
}

function parseSize(sizeStr) {
  if (!sizeStr) return 0;
  sizeStr = sizeStr.replace(/,/g, '').trim();
  const m = sizeStr.match(/([\d.]+)\s*(TB|TiB|GB|GiB|MB|MiB|KB|KiB)/i);
  if (!m) return 0;
  const val = parseFloat(m[1]);
  const unit = m[2].toUpperCase().replace(/IB$/, '').replace(/I$/, '');
  if (unit === 'T') return val * 1024;
  if (unit === 'G') return val;
  if (unit === 'M') return +(val / 1024).toFixed(2);
  if (unit === 'K') return +(val / (1024 * 1024)).toFixed(4);
  return 0;
}

function formatSize(gb) {
  if (gb >= 1024) return `${(gb / 1024).toFixed(2)} TB`;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  if (gb > 0) return `${(gb * 1024).toFixed(1)} MB`;
  return 'N/A';
}

function parseSeeders(text) {
  if (!text) return 0;
  const cleaned = String(text).replace(/,/g, '').trim();
  const m = cleaned.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function cleanName(name) {
  if (!name) return '';
  return name.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

module.exports = { makeMagnet, parseSize, formatSize, parseSeeders, cleanName };
