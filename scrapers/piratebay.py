"""PirateBay scraper - uses the apibay.org JSON API."""

from urllib.parse import quote
from scrapers.base import BaseScraper
from scrapers import client, utils


class Source(BaseScraper):
    name = 'ThePirateBay'
    base_url = 'https://apibay.org'

    def search(self, query):
        url = f'{self.base_url}/q.php?q={quote(query)}&cat=0'
        data = client.get_json(url)
        if not data:
            return []
        results = []
        for item in data:
            if str(item.get('id')) == '0':
                continue
            info_hash = item.get('info_hash', '')
            if not info_hash or len(info_hash) < 20:
                continue
            name = utils.clean_name(item.get('name', ''))
            if not name:
                continue
            seeders = utils.parse_seeders(item.get('seeders', 0))
            try:
                size_bytes = int(item.get('size', 0))
                size_gb = round(size_bytes / (1024 ** 3), 2)
            except (ValueError, TypeError):
                size_gb = 0.0
            results.append({
                'name': name,
                'size': utils.format_size(size_gb),
                'size_gb': size_gb,
                'seeders': seeders,
                'magnet': self._make_magnet(info_hash, name),
                'provider': self.name,
            })
        return results
