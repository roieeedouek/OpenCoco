"""Knaben scraper - HTML scraping."""

from urllib.parse import quote
from scrapers.base import BaseScraper
from scrapers import client, utils


class Source(BaseScraper):
    name = 'Knaben'
    base_url = 'https://knaben.eu'

    def search(self, query):
        url = f'{self.base_url}/search/index.php?q={quote(query)}&search=fast'
        soup = client.get_soup(url)
        if not soup:
            return []
        results = []
        for row in soup.select('table tr, div.result'):
            # Try to find magnet link
            magnet_tag = row.select_one('a[href^="magnet:"]')
            if not magnet_tag:
                continue
            magnet = magnet_tag['href']
            # Name
            name_tag = row.select_one('a.title, td.name a, a[href*="/torrent/"]')
            name = utils.clean_name(name_tag.get_text()) if name_tag else ''
            if not name:
                # Try getting name from the magnet link dn parameter
                import re
                dn_match = re.search(r'dn=([^&]+)', magnet)
                if dn_match:
                    from urllib.parse import unquote
                    name = unquote(dn_match.group(1)).replace('+', ' ')
            if not name:
                continue
            # Extract size and seeders from row text
            text = row.get_text()
            import re
            size_match = re.search(r'([\d,.]+\s*(?:GB|MB|KB|TB|GiB|MiB))', text, re.I)
            size_text = size_match.group(1) if size_match else ''
            seeders = 0
            seed_tag = row.select_one('td.seed, span.seed')
            if seed_tag:
                seeders = utils.parse_seeders(seed_tag.get_text())
            results.append({
                'name': name,
                'size': size_text or 'N/A',
                'size_gb': utils.parse_size(size_text),
                'seeders': seeders,
                'magnet': magnet,
                'provider': self.name,
            })
        return results
