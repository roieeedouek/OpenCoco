"""BitSearch scraper - HTML scraping."""

from urllib.parse import quote
from scrapers.base import BaseScraper
from scrapers import client, utils


class Source(BaseScraper):
    name = 'BitSearch'
    base_url = 'https://bitsearch.to'

    def search(self, query):
        url = f'{self.base_url}/search?q={quote(query)}&sort=size'
        soup = client.get_soup(url)
        if not soup:
            return []
        results = []
        for item in soup.select('li.search-result, div.search-result, li.card.search-result'):
            name_tag = item.select_one('h5.title a, a.title')
            name = utils.clean_name(name_tag.get_text()) if name_tag else ''
            if not name:
                continue
            magnet_tag = item.select_one('a[href^="magnet:"]')
            if not magnet_tag:
                continue
            magnet = magnet_tag['href']
            # Stats div contains size and seeders
            stats = item.select('div.stats div, div.info span')
            size_text = ''
            seeders = 0
            for stat in stats:
                text = stat.get_text(strip=True)
                if any(u in text.upper() for u in ('GB', 'MB', 'KB', 'TB')):
                    size_text = text
                if 'seed' in text.lower() or 'se:' in text.lower():
                    seeders = utils.parse_seeders(text)
            if not size_text:
                # Try to extract from full text
                full_text = item.get_text()
                import re
                size_match = re.search(r'([\d,.]+\s*(?:GB|MB|KB|TB))', full_text, re.I)
                if size_match:
                    size_text = size_match.group(1)
            results.append({
                'name': name,
                'size': size_text or 'N/A',
                'size_gb': utils.parse_size(size_text),
                'seeders': seeders,
                'magnet': magnet,
                'provider': self.name,
            })
        return results
