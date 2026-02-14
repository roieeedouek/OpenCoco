"""YTS.mx scraper - JSON API, movies only."""

from urllib.parse import quote
from scrapers.base import BaseScraper
from scrapers import client, utils


class Source(BaseScraper):
    name = 'YTS'
    base_url = 'https://yts.mx'

    def search(self, query):
        url = f'{self.base_url}/api/v2/list_movies.json?query_term={quote(query)}&sort_by=seeds&limit=30'
        data = client.get_json(url)
        if not data:
            return []
        movies = data.get('data', {}).get('movies')
        if not movies:
            return []
        results = []
        for movie in movies:
            movie_title = movie.get('title_long', movie.get('title', ''))
            torrents = movie.get('torrents', [])
            for torrent in torrents:
                info_hash = torrent.get('hash', '')
                if not info_hash:
                    continue
                quality = torrent.get('quality', '')
                codec = torrent.get('video_codec', '')
                torrent_type = torrent.get('type', '')
                name = f'{movie_title} [{quality}] [{codec}] [{torrent_type}]'
                size_text = torrent.get('size', '')
                seeders = torrent.get('seeds', 0)
                results.append({
                    'name': name,
                    'size': size_text or 'N/A',
                    'size_gb': utils.parse_size(size_text),
                    'seeders': seeders,
                    'magnet': self._make_magnet(info_hash, movie_title),
                    'provider': self.name,
                })
        return results
