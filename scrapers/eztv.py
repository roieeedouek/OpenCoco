"""EZTV scraper - JSON API, primarily for TV shows.

The EZTV HTML search page is behind a Cloudflare challenge, so we use the
public API (which is not challenged) and filter recent releases by title.
This covers recently listed torrents, not the full archive.
"""

from scrapers.base import BaseScraper
from scrapers import client, utils
from config import MAX_RESULTS_PER_PROVIDER


class Source(BaseScraper):
    name = 'EZTV'
    base_url = 'https://eztv.re'

    def search(self, query):
        q = query.lower()
        results = []
        # Scan up to 3 pages of recent torrents and filter by the query.
        for page in range(1, 4):
            url = f'{self.base_url}/api/get-torrents?limit=100&page={page}'
            data = client.get_json(url)
            if not data:
                break
            torrents = data.get('torrents', [])
            if not torrents:
                break
            for t in torrents:
                title = t.get('title', '') or t.get('filename', '')
                if q not in title.lower():
                    continue
                info_hash = t.get('hash', '')
                magnet = t.get('magnet_url', '')
                if not magnet and info_hash:
                    magnet = self._make_magnet(info_hash, title)
                if not magnet:
                    continue
                size_bytes = t.get('size_bytes', 0) or 0
                try:
                    size_gb = round(int(size_bytes) / (1024 ** 3), 2)
                except (ValueError, TypeError):
                    size_gb = 0.0
                results.append({
                    'name': utils.clean_name(title),
                    'size': utils.format_size(size_gb),
                    'size_gb': size_gb,
                    'seeders': t.get('seeds', 0) or 0,
                    'magnet': magnet,
                    'provider': self.name,
                })
                if len(results) >= MAX_RESULTS_PER_PROVIDER:
                    return results
        return results
