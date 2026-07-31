/**
 * static/js/bookmarks.js
 * ------------------------------------------------------------------
 * Powers templates/dashboard/bookmarks.html.
 *
 * API MAPPING:
 *  - GET  /api/accounts/bookmarks/            current user's bookmarks: [{id, article, created_at}]
 *  - GET  /api/blog/articles/                 used to join article details onto each bookmark
 *  - POST /api/accounts/bookmarks/toggle/     { article_id }  used to "Remove"
 */

document.addEventListener('DOMContentLoaded', function () {
    loadBookmarkedArticles();
});

function loadBookmarkedArticles() {
    const container = document.getElementById('bookmarkedArticlesList');
    if (!container) return;

    Promise.all([
        BitraAPI.get('/accounts/bookmarks/'),
        BitraAPI.get('/blog/articles/'),
    ]).then(function ([bookmarksData, articlesData]) {
        const bookmarks = Array.isArray(bookmarksData) ? bookmarksData : (bookmarksData.results || []);
        const articles = Array.isArray(articlesData) ? articlesData : (articlesData.results || []);
        const articleById = new Map(articles.map(function (a) { return [a.id, a]; }));

        const items = bookmarks
            .map(function (bm) { return { bookmark: bm, article: articleById.get(bm.article) }; })
            .filter(function (item) { return !!item.article; })
            .sort(function (a, b) { return new Date(b.bookmark.created_at) - new Date(a.bookmark.created_at); });

        renderBookmarkedArticles(items);
    }).catch(function (err) {
        if (err && err.status === 401) return;
        BitraNotify.error(BitraAPI.extractErrorMessage(err));
        container.innerHTML = '<p class="empty-text">Unable to load your bookmarks.</p>';
    });
}

function renderBookmarkedArticles(items) {
    const container = document.getElementById('bookmarkedArticlesList');

    if (!items.length) {
        container.innerHTML = '<p class="empty-text">You haven\'t bookmarked any articles yet.</p>';
        return;
    }

    container.innerHTML = items.map(function (item) { return bookmarkedArticleRow(item.article, item.bookmark); }).join('');

    container.querySelectorAll('[data-remove-bookmark]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const articleId = btn.dataset.removeBookmark;
            btn.disabled = true;
            BitraAPI.post('/accounts/bookmarks/toggle/', { article_id: articleId })
                .then(function () {
                    BitraNotify.success('Removed from bookmarks.');
                    loadBookmarkedArticles();
                })
                .catch(function (err) {
                    BitraNotify.error(BitraAPI.extractErrorMessage(err));
                    btn.disabled = false;
                });
        });
    });
}

function bookmarkedArticleRow(article, bookmark) {
    const title = BitraRender.escapeHtml(article.title);
    const excerpt = BitraRender.escapeHtml(article.summary || '');
    const savedDate = BitraRender.formatDate(bookmark.created_at);

    return `
    <div class="comment-item" style="align-items: stretch;">
        <div class="comment-item-content">
            <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--dark); margin-bottom: var(--space-sm);">
                <a href="/articles/${article.id}/" style="color: inherit;">${title}</a>
            </h4>
            <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: var(--space-md); line-height: 1.6;">${excerpt}</p>
            <div class="comment-meta">
                <span style="display: flex; align-items: center; gap: var(--space-xs); font-size: 0.8rem; color: var(--text-muted);">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2"/>
                        <path d="M16 2v4M8 2v4M3 10h18"/>
                    </svg>
                    Saved on ${savedDate}
                </span>
            </div>
        </div>
        <div style="display: flex; align-items: center;">
            <button class="btn btn-outline btn-sm" data-remove-bookmark="${article.id}" style="display: inline-flex; align-items: center; gap: var(--space-sm); border-color: rgba(239, 68, 68, 0.3); color: var(--error);">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                </svg>
                Remove
            </button>
        </div>
    </div>`;
}
