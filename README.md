# OpenCoco

A small web app that searches many public torrent sites at once and shows the results in one list, sorted
and filterable, with magnet links. Inspired by CocoScrapers for Kodi.

It is a single Flask process: no database, no accounts, no API keys. Each provider is a scraper module
under `scrapers/`, and results stream to the browser as each site answers, so slow sites don't hold up
fast ones.

## Run with Docker

A prebuilt public image is on GitHub Container Registry, so no login is needed:
[`ghcr.io/roieeedouek/opencoco`](https://github.com/users/roieeedouek/packages/container/package/opencoco).

```bash
docker run -d --name opencoco -p 5000:5000 --restart unless-stopped ghcr.io/roieeedouek/opencoco:latest
```

Then open <http://localhost:5000>.

| Tag | Meaning |
|-----|---------|
| `latest` | Most recent build of `main`. |
| `<7-char git SHA>` (e.g. `9be7925`) | A specific commit. Use this to pin a version. |

The image runs the app under gunicorn (4 workers × 8 threads) on Python 3.11 and listens on port 5000
inside the container. It is built for `linux/amd64` only, so on ARM machines (Apple Silicon, Raspberry
Pi) it runs through emulation, if at all.

Common tasks:

```bash
docker run -d -p 8080:5000 ghcr.io/roieeedouek/opencoco:latest   # serve on host port 8080 instead
docker pull ghcr.io/roieeedouek/opencoco:latest                  # update: pull the newest build,
docker rm -f opencoco                                            # remove the old container, then
                                                                 # re-run the docker run command above
docker logs -f opencoco                                          # follow the gunicorn logs
```

With Docker Compose:

```yaml
services:
  opencoco:
    image: ghcr.io/roieeedouek/opencoco:latest
    ports:
      - "5000:5000"
    restart: unless-stopped
```

To build the image yourself, use the gunicorn setup from [Run from source](#run-from-source). The
repo's own `Dockerfile` runs Flask's debug server, which is meant for development only.

## Run from source

Requires Python 3.9+.

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python app.py            # Flask debug server on http://localhost:5000
```

`python app.py` starts Flask's debug server with auto-reload, which is meant for development only. To
serve it for real, use gunicorn:

```bash
pip install gunicorn
gunicorn -b 0.0.0.0:5000 -w 4 --threads 8 --timeout 120 app:app
```

## Providers

| Provider       | Site                             |
|----------------|----------------------------------|
| ThePirateBay   | apibay.org (JSON API)            |
| 1337x          | 1337x.to                         |
| Nyaa           | nyaa.si                          |
| BitSearch      | bitsearch.to                     |
| TorrentDownload| torrentdownload.info             |
| TorrentQuest   | torrentquest.com                 |
| TorrentGalaxy  | tgx.rs                           |
| YTS            | yts.lt                           |
| EZTV           | eztv.re                          |
| KickAss        | kick4ss.com                      |
| Knaben         | knaben.eu                        |

These sites change often. At any given time some will be down or behind a Cloudflare challenge. A
failing provider doesn't break the search; it shows up in the `errors` list instead.

## API

| Endpoint | Description |
|----------|-------------|
| `GET /` | The web UI. |
| `GET /api/providers` | `{"providers": [{"name", "base_url"}, ...]}` |
| `GET /api/search?q=<query>[&providers=a,b]` | Server-Sent Events stream (see below). `providers` optionally limits the search to a comma-separated list of provider names (case-insensitive). Missing `q` returns `400`. |

`/api/search` sends one event per provider as soon as it finishes, then a final `done` event:

```
data: {"type": "results", "provider": "Nyaa", "results": [ ... ]}
data: {"type": "done", "total": 223, "errors": [{"provider": "1337x", "error": "Blocked by Cloudflare (403)"}]}
```

Each result looks like this:

```json
{"name": "...", "size": "4.7 GB", "size_gb": 4.7, "seeders": 120, "magnet": "magnet:?xt=urn:btih:...", "provider": "ThePirateBay"}
```

Quick check from the command line:

```bash
curl -N 'http://localhost:5000/api/search?q=ubuntu'
```

## Configuration

Settings live in `config.py`:

| Setting | Default | Meaning |
|---------|---------|---------|
| `REQUEST_TIMEOUT` | `8` | Per-request HTTP timeout, in seconds. |
| `MAX_WORKERS` | `12` | Providers queried in parallel per search. |
| `MAX_RESULTS_PER_PROVIDER` | `50` | Cap on results per provider (currently only applied by EZTV). |
| `MIN_SEEDERS` | `0` | Defined but not used yet. |
| `USER_AGENTS` | 5 browser UAs | Rotated across requests. |

## Adding a provider

Create `scrapers/<name>.py` with a class named `Source` that subclasses `BaseScraper`. It is picked up
automatically, with no registration step:

```python
from scrapers.base import BaseScraper
from scrapers import client, utils


class Source(BaseScraper):
    name = 'Example'
    base_url = 'https://example.org'

    def search(self, query):
        # Fetch and parse, then return a list of dicts with:
        # name, size, size_gb, seeders, magnet, provider
        return []
```

`scrapers/client.py` holds the shared HTTP helpers (timeouts, user-agent rotation), `scrapers/utils.py`
holds name, size and seeder parsing, and `BaseScraper._make_magnet(info_hash, name)` builds a magnet link
with a default set of trackers. If a scraper module fails to import, it is skipped instead of crashing
the app.

## Project layout

```
app.py            Flask app and routes
config.py         Settings
scrapers/         One module per provider, plus base.py, client.py, utils.py
templates/        index.html
static/           script.js, style.css
```

## Disclaimer

OpenCoco only indexes links that public sites already publish; it hosts no content. You are responsible
for how you use it and for following the laws where you live.
