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
        table = soup.select_one('table.table2')
        if not table:
            # Try alternative layout
            for div in soup.select('div.grey_bar3, div'):
                pass
            return results
        for row in table.select('tr')[1:]:  # skip header row
            cols = row.select('td')
            if len(cols) < 4:
                continue
            # Name from first column link
            name_tag = cols[0].select_one('a')
            name = utils.clean_name(name_tag.get_text()) if name_tag else ''
            if not name:
                continue
            # Get the torrent detail page to find magnet link
            detail_href = name_tag.get('href', '')
            # Size from third column
            size_text = cols[2].get_text(strip=True) if len(cols) > 2 else ''
            # Seeders from fourth column
            seeders = utils.parse_seeders(cols[3].get_text()) if len(cols) > 3 else 0
            # Try to extract hash from the detail link
            hash_match = re.search(r'/([a-fA-F0-9]{40})/', detail_href)
            if hash_match:
                info_hash = hash_match.group(1)
                magnet = self._make_magnet(info_hash, name)
            else:
                continue
            results.append({
                'name': name,
                'size': size_text or 'N/A',
                'size_gb': utils.parse_size(size_text),
                'seeders': seeders,
                'magnet': magnet,
                'provider': self.name,
            })
        return results
