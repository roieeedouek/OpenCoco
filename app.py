"""OpenCoco - Torrent Scraper Web App inspired by CocoScrapers for Kodi."""

import sys
import os
import json

# Ensure project root is on the import path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from concurrent.futures import ThreadPoolExecutor, as_completed
from flask import Flask, render_template, request, jsonify, Response
from scrapers import get_all_scrapers
from config import MAX_WORKERS

app = Flask(__name__)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/search')
def api_search():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({'error': 'Missing search query', 'results': []}), 400

    # Optional: filter to specific providers
    provider_filter = request.args.get('providers', '')
    enabled_providers = [p.strip().lower() for p in provider_filter.split(',') if p.strip()] if provider_filter else []

    scrapers = get_all_scrapers()
    if enabled_providers:
        scrapers = [s for s in scrapers if s.name.lower() in enabled_providers]

    def run_scraper(scraper):
        try:
            return scraper.name, scraper.search(query), None
        except Exception as e:
            return scraper.name, [], str(e)

    def stream():
        """Yield each provider's results as an SSE event the moment it finishes,
        so the client renders progressively instead of waiting for the slowest scraper."""
        total = 0
        errors = []
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
            futures = {pool.submit(run_scraper, s): s for s in scrapers}
            for future in as_completed(futures):
                name, results, error = future.result()
                if error:
                    errors.append({'provider': name, 'error': error})
                total += len(results)
                yield f"data: {json.dumps({'type': 'results', 'provider': name, 'results': results})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'total': total, 'errors': errors})}\n\n"

    headers = {
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
        'Connection': 'keep-alive',
    }
    return Response(stream(), mimetype='text/event-stream', headers=headers)


@app.route('/api/providers')
def api_providers():
    scrapers = get_all_scrapers()
    return jsonify({
        'providers': [{'name': s.name, 'base_url': s.base_url} for s in scrapers]
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
