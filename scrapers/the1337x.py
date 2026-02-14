"""1337x scraper - HTML scraping with two-phase fetch (list -> detail page)."""

import re
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor, as_completed
from scrapers.base import BaseScraper
from scrapers import client, utils


class Source(BaseScraper):
    name = '1337x'
    base_url = 'https://1337x.to'

    def search(self, query):
        search_url = f'{self.base_url}/search/{quote(query)}/1/'
        soup = client.get_soup(search_url)
        if not soup:
            return []
        links = []
        for a_tag in soup.select('td.coll-1.name a[href*="/torrent/"]'):
            href = a_tag.get('href', '')
            if href:
                links.append(self.base_url + href)
        if not links:
            return []
        results = []

        def fetch_detail(url):
            page = client.get_soup(url)
            if not page:
                return None
            name_tag = page.select_one('div.box-info-heading h1')
            name = utils.clean_name(name_tag.get_text()) if name_tag else ''
            if not name:
                return None
            magnet_tag = page.select_one('a[href^="magnet:"]')
            if not magnet_tag:
                return None
            magnet = magnet_tag['href']
            size_text = ''
            seeders_text = '0'
            for li in page.select('ul.list li'):
                label = li.select_one('strong')
                value = li.select_one('span')
                if not label or not value:
                    continue
                label_text = label.get_text().strip().lower()
                if 'size' in label_text:
                    size_text = value.get_text().strip()
                    # Remove nested span (e.g. "(2,621,440,000 Bytes)")
                    size_text = re.sub(r'\(.*?\)', '', size_text).strip()
                elif 'seeders' in label_text:
                    seeders_text = value.get_text().strip()
            return {
                'name': name,
                'size': size_text or 'N/A',
                'size_gb': utils.parse_size(size_text),
                'seeders': utils.parse_seeders(seeders_text),
                'magnet': magnet,
                'provider': self.name,
            }

        with ThreadPoolExecutor(max_workers=8) as pool:
            futures = {pool.submit(fetch_detail, url): url for url in links[:20]}
            for future in as_completed(futures):
                try:
                    result = future.result()
                    if result:
                        results.append(result)
                except Exception:
                    pass
        return results
