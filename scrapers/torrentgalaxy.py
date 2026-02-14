"""TorrentGalaxy scraper - HTML scraping."""

from urllib.parse import quote
from scrapers.base import BaseScraper
from scrapers import client, utils


class Source(BaseScraper):
    name = 'TorrentGalaxy'
    base_url = 'https://tgx.rs'

    def search(self, query):
        url = f'{self.base_url}/torrents.php?search={quote(query)}&sort=seeders&order=desc'
        soup = client.get_soup(url)
        if not soup:
            return []
        results = []
        for row in soup.select('div.tgxtablerow'):
            # Name
            name_tag = row.select_one('a.txlight')
            if not name_tag:
                # Alternative selector
                name_tag = row.select_one('div.tgxtablecell a[href*="/torrent/"]')
            name = utils.clean_name(name_tag.get_text()) if name_tag else ''
            if not name:
                continue
            # Magnet
            magnet_tag = row.select_one('a[href^="magnet:"]')
            if not magnet_tag:
                continue
            magnet = magnet_tag['href']
            # Size - look for the cell containing size info
            cells = row.select('div.tgxtablecell')
            size_text = ''
            seeders = 0
            for cell in cells:
                text = cell.get_text(strip=True)
                if any(u in text.upper() for u in ('GB', 'MB', 'KB', 'TB')):
                    size_text = text
                # Seeders are in a span with specific font color or class
                seed_span = cell.select_one('span[title="Seeders/Leechers"] b, font[color="green"]')
                if seed_span:
                    seeders = utils.parse_seeders(seed_span.get_text())
            if not size_text:
                size_text = 'N/A'
            results.append({
                'name': name,
                'size': size_text,
                'size_gb': utils.parse_size(size_text),
                'seeders': seeders,
                'magnet': magnet,
                'provider': self.name,
            })
        return results
