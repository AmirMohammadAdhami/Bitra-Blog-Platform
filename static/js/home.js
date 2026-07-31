/**
 * static/js/home.js
 * ------------------------------------------------------------------
 * Populates templates/home/home.html from GET /api/blog/articles/ and
 * GET /api/blog/categories/.
 *
 * IMPORTANT API LIMITATIONS this file works around:
 *  - ArticleViewSet has no filter/search/ordering backend, so "popular"
 *    (sorted by likes) and "latest" (sorted by created_at) are both
 *    derived by fetching the full article list once and sorting/slicing
 *    in the browser.
 *  - There is no PUBLISHED status on Article (choices are DRAFT,
 *    SUBMITTED, REVIEWED, REJECTED) and no dedicated "is this visible
 *    to readers" flag, so REVIEWED is treated as the closest equivalent
 *    of "published" for public-facing sections.
 *  - There is no "popular authors" / follower-count endpoint, so the
 *    Popular Authors section is built from the distinct authors found
 *    in the fetched articles (best-effort, not a true engagement ranking).
 *  - CategorySerializer does not return an article count, so category
 *    cards render without a count badge.
 */

document.addEventListener('DOMContentLoaded', function () {
    loadHomeArticles();
    loadHomeCategories();
});

function loadHomeArticles() {
    BitraAPI.get('/blog/articles/')
        .then(function (data) {
            const all = Array.isArray(data) ? data : (data.results || []);
            const visible = all.filter(function (a) { return a.status === 'REVIEWED'; });
            const pool = visible.length ? visible : all; // fall back if nothing is REVIEWED yet

            renderHeroStats(all);
            renderPopularArticles(pool);
            renderLatestArticles(pool);
            renderPopularAuthors(pool);
        })
        .catch(function (err) {
            const msg = BitraAPI.extractErrorMessage(err);
            BitraNotify.error(`Could not load articles: ${msg}`);
            document.querySelectorAll('[data-loading="true"]').forEach(function (el) {
                el.innerHTML = '<p class="empty-text">Unable to load content right now.</p>';
            });
        });
}

function renderHeroStats(allArticles) {
    const statArticles = document.getElementById('statArticles');
    const statAuthors = document.getElementById('statAuthors');
    const statViews = document.getElementById('statViews');
    if (!statArticles) return;

    const totalViews = allArticles.reduce(function (sum, a) { return sum + (a.views || 0); }, 0);
    const distinctAuthors = new Set(allArticles.map(function (a) { return a.author_name; }).filter(Boolean));

    statArticles.textContent = allArticles.length;
    statAuthors.textContent = distinctAuthors.size;
    statViews.textContent = formatCompactNumber(totalViews);
}

function renderPopularArticles(articles) {
    const grid = document.getElementById('popularArticlesGrid');
    if (!grid) return;

    const top = [...articles].sort(function (a, b) { return (b.likes || 0) - (a.likes || 0); }).slice(0, 3);

    if (!top.length) {
        grid.innerHTML = '<p class="empty-text">No articles yet — check back soon.</p>';
        return;
    }
    grid.innerHTML = top.map(BitraRender.articleCard).join('');
}

function renderLatestArticles(articles) {
    const featuredSlot = document.getElementById('featuredArticleSlot');
    const list = document.getElementById('latestArticlesList');
    if (!featuredSlot || !list) return;

    const latest = [...articles].sort(function (a, b) {
        return new Date(b.created_at) - new Date(a.created_at);
    });

    if (!latest.length) {
        featuredSlot.innerHTML = '<p class="empty-text">No articles yet.</p>';
        list.innerHTML = '';
        return;
    }

    featuredSlot.innerHTML = BitraRender.articleCard(latest[0]).replace(
        'class="article-card"',
        'class="article-card article-card-featured"'
    );
    list.innerHTML = latest.slice(1, 4).map(BitraRender.articleCard).join('');
}

function renderPopularAuthors(articles) {
    const scroll = document.getElementById('popularAuthorsScroll');
    if (!scroll) return;

    const seen = new Map();
    articles.forEach(function (a) {
        if (!a.author_name) return;
        if (!seen.has(a.author_name)) {
            seen.set(a.author_name, { username: a.author_name, articleCount: 0, likes: 0 });
        }
        const entry = seen.get(a.author_name);
        entry.articleCount += 1;
        entry.likes += (a.likes || 0);
    });

    const authors = Array.from(seen.values())
        .sort(function (a, b) { return b.likes - a.likes; })
        .slice(0, 6);

    if (!authors.length) {
        scroll.innerHTML = '<p class="empty-text">No contributors yet.</p>';
        return;
    }

    scroll.innerHTML = authors.map(function (a) {
        return BitraRender.authorCard({
            username: a.username,
            profile: { bio: `${a.articleCount} article${a.articleCount === 1 ? '' : 's'} &middot; ${a.likes} likes` },
        });
    }).join('');
}

function loadHomeCategories() {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;

    BitraAPI.get('/blog/categories/')
        .then(function (data) {
            const categories = Array.isArray(data) ? data : (data.results || []);
            if (!categories.length) {
                grid.innerHTML = '<p class="empty-text">No categories yet.</p>';
                return;
            }
            grid.innerHTML = categories.map(function (c) { return BitraRender.categoryCard(c); }).join('');
        })
        .catch(function (err) {
            grid.innerHTML = '<p class="empty-text">Unable to load categories.</p>';
        });
}

function formatCompactNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M+';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k+';
    return String(n);
}
