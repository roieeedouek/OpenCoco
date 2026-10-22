document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('search-form');
    const input = document.getElementById('search-input');
    const btn = document.getElementById('search-btn');
    const status = document.getElementById('status');
    const resultsDiv = document.getElementById('results');
    const resultsInfo = document.getElementById('results-info');
    const resultsCount = document.getElementById('results-count');
    const toggleProviders = document.getElementById('toggle-providers');
    const providerList = document.getElementById('provider-list');
    const sortButtons = document.querySelectorAll('.sort-btn');

    let currentResults = [];
    let currentSort = 'seeders';
    let currentEventSource = null;

    // Load provider list
    fetch('/api/providers')
        .then(r => r.json())
        .then(data => {
            providerList.innerHTML = data.providers.map(p =>
                `<label><input type="checkbox" value="${p.name}" checked> ${p.name}</label>`
            ).join('');
        });

    toggleProviders.addEventListener('click', () => {
        providerList.classList.toggle('hidden');
    });

    // Search
    form.addEventListener('submit', e => {
        e.preventDefault();
        const query = input.value.trim();
        if (!query) return;

        // Get selected providers
        const checked = providerList.querySelectorAll('input[type="checkbox"]:checked');
        const providers = Array.from(checked).map(c => c.value).join(',');

        // Close any in-flight search stream
        if (currentEventSource) currentEventSource.close();

        btn.disabled = true;
        resultsDiv.innerHTML = '';
        resultsInfo.classList.add('hidden');
        currentResults = [];
        status.classList.remove('hidden', 'error');
        status.innerHTML = '<span class="spinner"></span> Searching across providers...';

        const params = new URLSearchParams({ q: query });
        if (providers) params.set('providers', providers);

        const es = new EventSource(`/api/search?${params}`);
        currentEventSource = es;
        let errorCount = 0;

        es.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'results') {
                // Render progressively as each provider finishes
                currentResults = currentResults.concat(data.results || []);
                if (currentResults.length > 0) {
                    status.classList.add('hidden');
                    resultsCount.textContent = `${currentResults.length} results so far...`;
                    resultsInfo.classList.remove('hidden');
                    sortAndRender();
                }
            } else if (data.type === 'done') {
                es.close();
                currentEventSource = null;
                btn.disabled = false;
                errorCount = (data.errors || []).length;

                if (currentResults.length === 0) {
                    status.textContent = 'No results found.';
                    resultsInfo.classList.add('hidden');
                    return;
                }

                status.classList.add('hidden');
                const errorText = errorCount > 0 ? ` (${errorCount} provider${errorCount > 1 ? 's' : ''} failed)` : '';
                resultsCount.textContent = `${data.total} results${errorText}`;
                resultsInfo.classList.remove('hidden');
                sortAndRender();
            }
        });

        es.onerror = () => {
            es.close();
            currentEventSource = null;
            btn.disabled = false;
            if (currentResults.length === 0) {
                status.classList.add('error');
                status.textContent = 'Request failed. Is the server running?';
            }
        };
    });

    // Sorting
    sortButtons.forEach(b => {
        b.addEventListener('click', () => {
            sortButtons.forEach(x => x.classList.remove('active'));
            b.classList.add('active');
            currentSort = b.dataset.sort;
            sortAndRender();
        });
    });

    function sortAndRender() {
        const sorted = [...currentResults];
        if (currentSort === 'seeders') {
            sorted.sort((a, b) => (b.seeders || 0) - (a.seeders || 0));
        } else if (currentSort === 'size') {
            sorted.sort((a, b) => (b.size_gb || 0) - (a.size_gb || 0));
        } else if (currentSort === 'name') {
            sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }
        // Preserve scroll position so the list stays stable while results
        // stream in and the DOM is re-rendered on each chunk.
        const scrollY = window.scrollY;
        renderResults(sorted);
        window.scrollTo(0, scrollY);
    }

    function renderResults(results) {
        resultsDiv.innerHTML = results.map((r, i) => {
            const seedClass = r.seeders > 10 ? '' : r.seeders > 0 ? 'low' : 'dead';
            return `
                <div class="result-card">
                    <div class="result-name">${escapeHtml(r.name)}</div>
                    <div class="result-meta">
                        <span class="meta-item"><strong>Size:</strong> ${escapeHtml(r.size || 'N/A')}</span>
                        <span class="meta-item"><strong>Seeds:</strong> <span class="seeders ${seedClass}">${r.seeders || 0}</span></span>
                        <span class="provider-badge">${escapeHtml(r.provider)}</span>
                    </div>
                    <div class="result-actions">
                        <a class="magnet-btn" href="${escapeHtml(r.magnet)}" title="Open magnet link">&#x1F9F2; Magnet</a>
                        <button class="copy-btn" data-idx="${i}" title="Copy magnet link to clipboard">Copy</button>
                    </div>
                </div>
            `;
        }).join('');

        // Attach copy handlers
        resultsDiv.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                const magnet = results[idx].magnet;
                navigator.clipboard.writeText(magnet).then(() => {
                    btn.textContent = 'Copied!';
                    btn.classList.add('copied');
                    setTimeout(() => {
                        btn.textContent = 'Copy';
                        btn.classList.remove('copied');
                    }, 2000);
                });
            });
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});
