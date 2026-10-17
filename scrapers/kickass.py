"""KickAss Torrents scraper - HTML scraping with domain fallback."""

import re
from urllib.parse import quote, unquote, parse_qs, urlparse
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
            raise RuntimeError('All KickAss domains are down or broken')
        table = soup.select_one('table.data')
        if not table:
            raise RuntimeError('All KickAss domains are down or broken')
        results = []
        for row in table.select('tr')[1:]:
            cols = row.select('td')
            if len(cols) < 5:
                continue
            # Name from the torrent detail link (href starts with /t).
            # Several links share that href prefix; pick the one with text.
            name = ''
            for a in cols[0].select('a[href^="/t"]'):
                txt = a.get_text(strip=True)
                if txt:
                    name = utils.clean_name(txt)
                    break
            if not name:
                continue
            # Magnet is wrapped in a redirect URL: mylink.cloud/?url=<encoded magnet>
            magnet = ''
            magnet_tag = cols[0].select_one('a[href*="magnet"]')
            if magnet_tag:
                href = magnet_tag.get('href', '')
                if 'url=' in href:
                    magnet = unquote(parse_qs(urlparse(href).query).get('url', [''])[0])
                elif href.startswith('magnet:'):
                    magnet = href
            if not magnet:
                continue
            # Size from second column, seeders from fourth
            size_text = cols[1].get_text(strip=True) if len(cols) > 1 else ''
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
