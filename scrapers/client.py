"""HTTP client with user-agent rotation and error handling."""

import random
import requests
from bs4 import BeautifulSoup
from config import USER_AGENTS, REQUEST_TIMEOUT


def _session():
    s = requests.Session()
    s.headers.update({
        'User-Agent': random.choice(USER_AGENTS),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
    })
    return s


def get(url, timeout=REQUEST_TIMEOUT, headers=None, params=None):
    """Perform a GET request and return a Response object or None on failure."""
    try:
        s = _session()
        if headers:
            s.headers.update(headers)
        resp = s.get(url, timeout=timeout, params=params, allow_redirects=True)
        resp.raise_for_status()
        return resp
    except Exception:
        return None


def get_json(url, timeout=REQUEST_TIMEOUT, headers=None, params=None):
    """Perform a GET request and return parsed JSON or None."""
    resp = get(url, timeout=timeout, headers=headers, params=params)
    if resp is None:
        return None
    try:
        return resp.json()
    except Exception:
        return None


def get_soup(url, timeout=REQUEST_TIMEOUT, headers=None, params=None):
    """Perform a GET request and return a BeautifulSoup object or None."""
    resp = get(url, timeout=timeout, headers=headers, params=params)
    if resp is None:
        return None
    try:
        return BeautifulSoup(resp.text, 'lxml')
    except Exception:
        return None
