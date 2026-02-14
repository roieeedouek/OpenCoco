"""KickAss Torrents scraper - HTML scraping with domain fallback."""

import re
from urllib.parse import quote
from scrapers.base import BaseScraper
from scrapers import client, utils


class Source(BaseScraper):
    name = 'KickAss'
    domains = [
        'kick4ss.com',
        'thekat.info',
        'kickass.cm',
        'kickass.ws',
        'kickasstorrents.to',
        'kat.am',
    ]
    base_url = 'https://kick4ss.com'

    def _find_working_domain(self):
        for domain in self.domains:
            url = f'https://{domain}'
            resp = client.get(url, timeout=5)
            if resp and resp.status_code == 200:
                return url
        return self.base_url

    def search(self, query):
        base = self._find_working_domain()
        url = f'{base}/usearch/{quote(query)}/?field=size&sorder=desc'
        soup = client.get_soup(url)
        if not soup:
            return []
        results = []
        table = soup.select_one('table.data')
        if not table:
            return []
        for row in table.select('tr')[1:]:
            cols = row.select('td')
            if len(cols) < 5:
                continue
            # Name
            name_tag = cols[0].select_one('a.cellMainLink')
            name = utils.clean_name(name_tag.get_text()) if name_tag else ''
            if not name:
                continue
            # Magnet
            magnet_tag = cols[0].select_one('a[href^="magnet:"]')
            if not magnet_tag:
                # Try to find hash from the torrent link
                link = name_tag.get('href', '')
                detail_page = client.get_soup(base + link)
                if detail_page:
                    magnet_tag = detail_page.select_one('a[href^="magnet:"]')
                if not magnet_tag:
                    continue
            magnet = magnet_tag['href']
            # Size
            size_text = cols[1].get_text(strip=True) if len(cols) > 1 else ''
            # Seeders
            seeders = utils.parse_seeders(cols[3].get_text()) if len(cols) > 3 else 0
            results.append({
                'name': name,
                'size': size_text or 'N/A',
                'size_gb': utils.parse_size(size_text),
                'seeders': seeders,
                'magnet': magnet,
                'provider': self.name,
            })
        return results
