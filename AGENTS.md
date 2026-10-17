# OpenCoco — Base44 Dev Environment

## What this is
A single-process Flask torrent-scraper web app (`app.py`, port 5000). No database, no external credentials — it scrapes public torrent sites over HTTP via `requests` + `beautifulsoup4`. Scrapers are auto-discovered from the `scrapers/` package.

## Run in the sandbox
```
docker compose -f docker-compose.base44.yml up -d
```
- Uses `python:3.9-slim` with the repo bind-mounted at `/app`; dependencies install on container startup from `requirements.txt`.
- Flask runs in debug mode (`app.run(debug=True)`), so the Werkzeug reloader picks up source edits live — no image rebuild needed for code changes.
- Internal port 5000 is mapped to host port 3000 (the preview entry point).

## Verify
- `curl -s http://localhost:3000/` returns the OpenCoco homepage.
- `curl -s http://localhost:3000/api/providers` lists discovered scrapers.
- `curl -s 'http://localhost:3000/api/search?q=test'` runs a live search (results depend on the public sites being reachable from the sandbox).

## Notes
- Search results may be empty if the sandbox network can't reach a given torrent site; the API still returns 200 with an `errors` array per provider.
- No secrets are required to boot.
