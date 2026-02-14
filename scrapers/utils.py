"""Shared utility functions for scrapers, adapted from CocoScraper's source_utils."""

import re


def parse_size(size_str):
    """Parse a human-readable size string into a float in GB.

    Handles formats like '2.50 GB', '750 MB', '1,200 MB', '2.1 GiB'.
    Returns 0.0 if parsing fails.
    """
    if not size_str:
        return 0.0
    size_str = size_str.strip().replace(',', '')
    match = re.search(r'([\d.]+)\s*(GB|GiB|MB|MiB|KB|KiB|TB|TiB)', size_str, re.I)
    if not match:
        return 0.0
    value = float(match.group(1))
    unit = match.group(2).upper().rstrip('IB').rstrip('I')
    if unit == 'T':
        return value * 1024.0
    if unit == 'G':
        return value
    if unit == 'M':
        return round(value / 1024.0, 2)
    if unit == 'K':
        return round(value / (1024.0 * 1024.0), 4)
    return 0.0


def format_size(gb):
    """Format a size in GB to a human-readable string."""
    if gb >= 1024:
        return f'{gb / 1024:.2f} TB'
    if gb >= 1:
        return f'{gb:.2f} GB'
    if gb > 0:
        return f'{gb * 1024:.1f} MB'
    return 'N/A'


def parse_seeders(text):
    """Extract an integer seeder count from text. Returns 0 on failure."""
    if not text:
        return 0
    text = str(text).strip().replace(',', '')
    match = re.search(r'(\d+)', text)
    return int(match.group(1)) if match else 0


def extract_hash(magnet_or_url):
    """Extract the info_hash from a magnet URI or torrent URL."""
    match = re.search(r'btih[:/]([a-fA-F0-9]{40})', magnet_or_url)
    if match:
        return match.group(1).upper()
    match = re.search(r'btih[:/]([a-fA-F0-9]{32})', magnet_or_url)
    if match:
        return match.group(1).upper()
    return None


def clean_name(name):
    """Strip common junk from torrent names."""
    if not name:
        return ''
    name = re.sub(r'<[^>]+>', '', name)  # strip HTML tags
    name = re.sub(r'\s+', ' ', name).strip()
    name = name.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    return name
