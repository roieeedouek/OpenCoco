"""Scraper registry - auto-discovers and loads all scraper modules."""

import importlib
import os
import pkgutil


def get_all_scrapers():
    """Discover and instantiate all scraper classes in this package."""
    scrapers = []
    package_dir = os.path.dirname(__file__)
    for _, module_name, _ in pkgutil.iter_modules([package_dir]):
        if module_name in ('base', 'utils', 'client'):
            continue
        try:
            mod = importlib.import_module(f'.{module_name}', package=__name__)
            if hasattr(mod, 'Source'):
                scrapers.append(mod.Source())
        except Exception:
            pass
    return scrapers
