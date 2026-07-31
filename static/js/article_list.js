/**
 * static/js/article_list.js
 * ------------------------------------------------------------------
 * Powers templates/blog/article_list.html.
 *
 * API LIMITATION: GET /api/blog/articles/ has no query-param filtering,
 * search, or ordering support (ArticleViewSet has no filter_backends).
 * So this file fetches the full article + category lists once and does
 * all filtering/search/pagination in the browser. This is fine at small
 * scale but will need a real backend filter (e.g. django-filter +
 * SearchFilter) if the article count grows significantly.
 */

(function () {
    const PAGE_SIZE = 9;

    let allArticles = [];
    let filteredArticles = [];
    let currentPage = 1;
    let currentCategory = '';
    let currentSearch = '';

    document.addEventListener('DOMContentLoaded', function () {
        const params = new URLSearchParams(window.location.search);
        currentCategory = params.get('category') || '';
        currentSearch = params.get('search') || '';

        const searchInput = document.getElementById('articleSearchInput');
        if (searchInput && currentSearch) searchInput.value = currentSearch;

        loadCategoryFilters();
        loadArticles();

        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', function () {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(function () {
                    currentSearch = searchInput.value.trim();
                    currentPage = 1;
                    applyFilters();
                }, 300);
            });
        }
    });

    function loadArticles() {
        const grid = document.getElementById('articlesGrid');
        BitraAPI.get('/blog/articles/')
            .then(function (data) {
                allArticles = (Array.isArray(data) ? data : (data.results || []))
                    .filter(function (a) { return a.status === 'REVIEWED'; });
                applyFilters();
            })
            .catch(function (err) {
                const msg = BitraAPI.extractErrorMessage(err);
                BitraNotify.error(`Could not load articles: ${msg}`);
                grid.innerHTML = '<p class="empty-text">Unable to load articles right now.</p>';
            });
    }

    function loadCategoryFilters() {
        const container = document.getElementById('categoryFilters');
        BitraAPI.get('/blog/categories/')
            .then(function (data) {
                const categories = Array.isArray(data) ? data : (data.results || []);
                categories.forEach(function (cat) {
                    const btn = document.createElement('button');
                    btn.className = 'filter-btn' + (currentCategory === cat.slug ? ' active' : '');
                    btn.dataset.categorySlug = cat.slug;
                    btn.textContent = cat.name;
                    container.appendChild(btn);
                });
                if (!currentCategory) {
                    container.querySelector('.filter-btn').classList.add('active');
                }
                wireFilterButtons();
            })
            .catch(function () {
                wireFilterButtons();
            });
    }

    function wireFilterButtons() {
        const container = document.getElementById('categoryFilters');
        container.querySelectorAll('.filter-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                container.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                currentCategory = btn.dataset.categorySlug || '';
                currentPage = 1;
                applyFilters();
            });
        });
    }

    function applyFilters() {
        filteredArticles = allArticles.filter(function (article) {
            const matchesCategory = !currentCategory || (article.category && article.category.slug === currentCategory);
            const q = currentSearch.toLowerCase();
            const matchesSearch = !q ||
                article.title.toLowerCase().includes(q) ||
                (article.summary || '').toLowerCase().includes(q) ||
                (article.author_name || '').toLowerCase().includes(q);
            return matchesCategory && matchesSearch;
        });
        renderPage();
    }

    function renderPage() {
        const grid = document.getElementById('articlesGrid');
        const paginationContainer = document.getElementById('articlesPagination');

        if (!filteredArticles.length) {
            grid.innerHTML = '<p class="empty-text">No articles match your filters.</p>';
            paginationContainer.innerHTML = '';
            return;
        }

        const start = (currentPage - 1) * PAGE_SIZE;
        const pageItems = filteredArticles.slice(start, start + PAGE_SIZE);
        grid.innerHTML = pageItems.map(BitraRender.articleCard).join('');

        BitraRender.pagination(paginationContainer, {
            count: filteredArticles.length,
            pageSize: PAGE_SIZE,
            currentPage: currentPage,
            onPageClick: function (page) {
                currentPage = page;
                renderPage();
                grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            },
        });
    }
})();
