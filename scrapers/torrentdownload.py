"""TorrentDownload scraper - HTML scraping."""

import re
from urllib.parse import quote
from scrapers.base import BaseScraper
from scrapers import client, utils


class Source(BaseScraper):
    name = 'TorrentDownload'
    base_url = 'https://www.torrentdownload.info'

    def search(self, query):
        url = f'{self.base_url}/search?q={quote(query)}'
        soup = client.get_soup(url)
        if not soup:
            return []
        results = []
        # Real result rows live outside table.table2 (which only holds sponsored
        # "Fast Links"). Select every row whose first link contains a 40-char hash.
        for row in soup.select('tr'):
            name_tag = row.select_one('td a')
            if not name_tag:
                continue
            href = name_tag.get('href', '')
            hash_match = re.search(r'/([a-fA-F0-9]{40})/', href)
            if not hash_match:
                continue
            info_hash = hash_match.group(1)
            name = utils.clean_name(name_tag.get_text())
            if not name:
                continue
            cols = row.select('td')
            size_text = cols[2].get_text(strip=True) if len(cols) > 2 else ''
            seeders = utils.parse_seeders(cols[3].get_text()) if len(cols) > 3 else 0
            results.append({
                'name': name,
                'size': size_text or 'N/A',
                'size_gb': utils.parse_size(size_text),
                'seeders': seeders,
                'magnet': self._make_magnet(info_hash, name),
                'provider': self.name,
            })
        return results
