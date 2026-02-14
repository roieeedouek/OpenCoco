"""Nyaa.si scraper - HTML scraping, primarily for anime content."""

from urllib.parse import quote
from scrapers.base import BaseScraper
from scrapers import client, utils


class Source(BaseScraper):
    name = 'Nyaa'
    base_url = 'https://nyaa.si'

    def search(self, query):
        url = f'{self.base_url}/?f=0&c=0_0&q={quote(query)}&s=seeders&o=desc'
        soup = client.get_soup(url)
        if not soup:
            return []
        results = []
        table = soup.select_one('table.torrent-list')
        if not table:
            return []
        for row in table.select('tbody tr'):
            cols = row.select('td')
            if len(cols) < 7:
                continue
            # Name from second column
            name_tag = cols[1].select('a')[-1] if cols[1].select('a') else None
            name = utils.clean_name(name_tag.get_text()) if name_tag else ''
            if not name:
                continue
            # Magnet from third column
            magnet_tag = cols[2].select_one('a[href^="magnet:"]')
            if not magnet_tag:
                continue
            magnet = magnet_tag['href']
            # Size from fourth column
            size_text = cols[3].get_text(strip=True)
            # Seeders from sixth column
            seeders = utils.parse_seeders(cols[5].get_text())
            results.append({
                'name': name,
                'size': size_text or 'N/A',
                'size_gb': utils.parse_size(size_text),
                'seeders': seeders,
                'magnet': magnet,
                'provider': self.name,
            })
        return results
