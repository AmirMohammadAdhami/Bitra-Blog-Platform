/**
 * static/js/likes.js
 * ------------------------------------------------------------------
 * Powers templates/dashboard/likes.html.
 *
 * API MAPPING:
 *  - GET  /api/accounts/likes/            current user's likes: [{id, article, created_at}]
 *  - GET  /api/blog/articles/             used to join article details onto each like
 *          (LikeSerializer only returns the article id, not its title/
 *          category/summary, so a second fetch + client-side join is
 *          required to render anything useful)
 *  - POST /api/accounts/likes/toggle/     { article_id }  used to "Unlike"
 */

document.addEventListener('DOMContentLoaded', function () {
    loadLikedArticles();
});

function loadLikedArticles() {
    const container = document.getElementById('likedArticlesList');
    if (!container) return;

    Promise.all([
        BitraAPI.get('/accounts/likes/'),
        BitraAPI.get('/blog/articles/'),
    ]).then(function ([likesData, articlesData]) {
        const likes = Array.isArray(likesData) ? likesData : (likesData.results || []);
        const articles = Array.isArray(articlesData) ? articlesData : (articlesData.results || []);
        const articleById = new Map(articles.map(function (a) { return [a.id, a]; }));

        const items = likes
            .map(function (like) { return { like: like, article: articleById.get(like.article) }; })
            .filter(function (item) { return !!item.article; })
            .sort(function (a, b) { return new Date(b.like.created_at) - new Date(a.like.created_at); });

        renderLikedArticles(items);
    }).catch(function (err) {
        if (err && err.status === 401) return;
        BitraNotify.error(BitraAPI.extractErrorMessage(err));
        container.innerHTML = '<p class="empty-text">Unable to load your liked articles.</p>';
    });
}

function renderLikedArticles(items) {
    const container = document.getElementById('likedArticlesList');

    if (!items.length) {
        container.innerHTML = '<p class="empty-text">You haven\'t liked any articles yet.</p>';
        return;
    }

    container.innerHTML = items.map(function (item) { return likedArticleRow(item.article, item.like); }).join('');

    container.querySelectorAll('[data-unlike-article]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const articleId = btn.dataset.unlikeArticle;
            btn.disabled = true;
            BitraAPI.post('/accounts/likes/toggle/', { article_id: articleId })
                .then(function () {
                    BitraNotify.success('Removed from liked articles.');
                    loadLikedArticles();
                })
                .catch(function (err) {
                    BitraNotify.error(BitraAPI.extractErrorMessage(err));
                    btn.disabled = false;
                });
        });
    });
}

function likedArticleRow(article, like) {
    const categoryName = article.category ? BitraRender.escapeHtml(article.category.name) : '';
    const title = BitraRender.escapeHtml(article.title);
    const excerpt = BitraRender.escapeHtml(article.summary || '');
    const likedDate = BitraRender.formatDate(like.created_at);

    return `
    <div class="comment-item" style="align-items: stretch;">
        <div class="comment-item-content">
            ${categoryName ? `<div style="display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-sm);">
                <span style="display: inline-block; padding: var(--space-xs) var(--space-md); background: var(--primary); color: white; font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-full);">${categoryName}</span>
            </div>` : ''}
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
                    Liked on ${likedDate}
                </span>
            </div>
        </div>
        <div style="display: flex; align-items: center;">
            <button class="btn btn-outline btn-sm" data-unlike-article="${article.id}" style="display: inline-flex; align-items: center; gap: var(--space-sm);">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" style="color: var(--error);">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                Unlike
            </button>
        </div>
    </div>`;
}
