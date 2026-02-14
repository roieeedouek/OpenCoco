"""TorrentQuest scraper - HTML scraping."""

import re
from urllib.parse import quote
from scrapers.base import BaseScraper
from scrapers import client, utils


class Source(BaseScraper):
    name = 'TorrentQuest'
    base_url = 'https://torrentquest.com'

    def search(self, query):
        url = f'{self.base_url}/search?q={quote(query)}&sort=seeders&order=desc'
        soup = client.get_soup(url)
        if not soup:
            return []
        results = []
        for row in soup.select('table tbody tr, div.search-result'):
            magnet_tag = row.select_one('a[href^="magnet:"]')
            if not magnet_tag:
                continue
            magnet = magnet_tag['href']
            name_tag = row.select_one('a.title, td a[href*="/torrent/"]')
            name = utils.clean_name(name_tag.get_text()) if name_tag else ''
            if not name:
                dn_match = re.search(r'dn=([^&]+)', magnet)
                if dn_match:
                    from urllib.parse import unquote
                    name = unquote(dn_match.group(1)).replace('+', ' ')
            if not name:
                continue
            text = row.get_text()
            size_match = re.search(r'([\d,.]+\s*(?:GB|MB|KB|TB|GiB|MiB))', text, re.I)
            size_text = size_match.group(1) if size_match else ''
            seeders = 0
            cols = row.select('td')
            if len(cols) >= 3:
                seeders = utils.parse_seeders(cols[-2].get_text())
            results.append({
                'name': name,
                'size': size_text or 'N/A',
                'size_gb': utils.parse_size(size_text),
                'seeders': seeders,
                'magnet': magnet,
                'provider': self.name,
            })
        return results
