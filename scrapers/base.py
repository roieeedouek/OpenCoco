"""Base scraper class that all providers inherit from."""

from abc import ABC, abstractmethod


class BaseScraper(ABC):
    name = ''
    base_url = ''

    @abstractmethod
    def search(self, query):
        """Search for torrents matching the query string.

        Args:
            query: Search string entered by the user.

        Returns:
            List of dicts with keys: name, size, seeders, magnet, provider.
        """

    def _make_magnet(self, info_hash, name=''):
        trackers = [
            'udp://tracker.opentrackr.org:1337/announce',
            'udp://open.stealth.si:80/announce',
            'udp://tracker.torrent.eu.org:451/announce',
            'udp://open.demonii.com:1337/announce',
            'udp://explodie.org:6969/announce',
            'udp://tracker.moeking.me:6969/announce',
        ]
        magnet = f'magnet:?xt=urn:btih:{info_hash}'
        if name:
            from urllib.parse import quote
            magnet += f'&dn={quote(name)}'
        for t in trackers:
            from urllib.parse import quote
            magnet += f'&tr={quote(t)}'
        return magnet
