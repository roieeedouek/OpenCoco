"""EZTV scraper - HTML scraping, primarily for TV shows."""

import re
from urllib.parse import quote
from scrapers.base import BaseScraper
from scrapers import client, utils


class Source(BaseScraper):
    name = 'EZTV'
    base_url = 'https://eztvx.to'

    def search(self, query):
        search_query = query.replace(' ', '-')
        url = f'{self.base_url}/search/{quote(search_query)}'
        soup = client.get_soup(url)
        if not soup:
            return []
        results = []
        table = soup.select_one('table.forum_header_border')
        if not table:
            return []
        for row in table.select('tr.forum_header_border'):
            cols = row.select('td')
            if len(cols) < 5:
                continue
            # Name from second column link
            name_tag = cols[1].select_one('a.epinfo')
            name = utils.clean_name(name_tag.get_text()) if name_tag else ''
            if not name:
                continue
            # Magnet link from third column
            magnet_tag = cols[2].select_one('a.magnet, a[href^="magnet:"]')
            if not magnet_tag:
                continue
            magnet = magnet_tag.get('href', '')
            if not magnet.startswith('magnet:'):
                continue
            # Size from fourth column
            size_text = cols[3].get_text(strip=True) if len(cols) > 3 else ''
            # Seeders from fifth column
            seeders = utils.parse_seeders(cols[5].get_text()) if len(cols) > 5 else 0
            results.append({
                'name': name,
                'size': size_text or 'N/A',
                'size_gb': utils.parse_size(size_text),
                'seeders': seeders,
                'magnet': magnet,
                'provider': self.name,
            })
        return results
