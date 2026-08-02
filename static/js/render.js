/**
 * static/js/render.js
 * ------------------------------------------------------------------
 * Shared HTML-building helpers for cards/components populated from the
 * DRF APIs. Kept framework-free (plain template strings) to match the
 * rest of the codebase's vanilla-JS approach.
 *
 * NOTE ON IMAGES: the Article model has no image/thumbnail field, so
 * every article card uses a deterministic placeholder image from
 * https://picsum.photos/seed/{id}/{w}/{h} — seeded by article id so the
 * same article always shows the same picture instead of a random one
 * on every reload.
 */

const BitraRender = (function () {
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    function formatDate(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function formatCompact(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return String(num);
    }

    function readingTime(text) {
        if (!text) return '3 min read';
        const words = String(text).trim().split(/\s+/).length;
        const minutes = Math.max(1, Math.round(words / 200));
        return `${minutes} min read`;
    }

    function articleImageUrl(article, w = 600, h = 400) {
        const seed = article && (article.id || article.pk) || 'bitra';
        return `https://picsum.photos/seed/article-${seed}/${w}/${h}`;
    }

    function avatarImageUrl(seed, size = 64) {
        return `https://picsum.photos/seed/avatar-${seed || 'bitra'}/${size}/${size}`;
    }

    /**
     * Renders one article card. Matches templates/includes/article_card.html markup 1:1
     * so existing CSS in style.css / responsive.css applies unchanged.
     */
    function articleCard(article) {
        const categoryName = article.category ? escapeHtml(article.category.name) : 'Uncategorized';
        const title = escapeHtml(article.title);
        const excerpt = escapeHtml(article.summary || '');
        const author = escapeHtml(article.author_name || 'Unknown');
        const date = formatDate(article.created_at);
        const rt = readingTime(article.summary || article.content);
        const detailUrl = `/articles/${article.id}/`;

        return `
        <article class="article-card">
            <a href="${detailUrl}" class="article-card-image">
                <img src="${articleImageUrl(article)}" alt="${title}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">
                <span class="article-category-badge">${categoryName}</span>
            </a>
            <div class="article-card-content">
                <div class="article-meta">
                    <span class="article-date">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2"/>
                            <path d="M16 2v4M8 2v4M3 10h18"/>
                        </svg>
                        ${date}
                    </span>
                    <span class="article-reading-time">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                        ${rt}
                    </span>
                </div>
                <h3 class="article-card-title">
                    <a href="${detailUrl}">${title}</a>
                </h3>
                <p class="article-card-excerpt">${excerpt}</p>
                <div class="article-card-footer">
                    <div class="article-author">
                        <div class="author-avatar-small">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                        </div>
                        <span class="author-name">${author}</span>
                    </div>
                    <div class="article-stats">
                        <span class="stat-item" title="Views">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                            ${article.views ?? 0}
                        </span>
                        <span class="stat-item" title="Likes">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                            ${article.likes ?? 0}
                        </span>
                    </div>
                </div>
            </div>
        </article>`;
    }

    /**
     * Renders one category card. Field set: {id, name, slug}. Article count
     * isn't provided by CategorySerializer, so the count badge is omitted
     * unless the caller supplies article.category.count separately.
     */
    function categoryCard(category, articleCount) {
        const name = escapeHtml(category.name);
        const countHtml = (typeof articleCount === 'number')
            ? `<span class="category-count">${articleCount} articles</span>`
            : '';
        return `
        <a href="/articles/?category=${encodeURIComponent(category.slug)}" class="category-card">
            <div class="category-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="14" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                </svg>
            </div>
            <h3 class="category-name">${name}</h3>
            ${countHtml}
        </a>`;
    }

    /**
     * Renders one author card from a User/Profile-shaped object.
     * Expected fields: username, profile.bio, profile.profile_image, profile.city/country.
     */
    function authorCard(user) {
        const username = escapeHtml(user.username || user.author_name || 'Unknown');
        const profile = user.profile || {};
        const bio = escapeHtml(profile.bio || '');
        const location = [profile.city, profile.country].filter(Boolean).map(escapeHtml).join(', ');
        const avatar = profile.profile_image || avatarImageUrl(user.id || username);

        return `
        <div class="author-card">
            <div class="author-card-avatar">
                <img src="${avatar}" alt="${username}" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">
            </div>
            <h3 class="author-card-name">${username}</h3>
            ${location ? `<p class="author-card-location">${location}</p>` : ''}
            ${bio ? `<p class="author-card-bio">${bio}</p>` : ''}
        </div>`;
    }

    /**
     * Renders pagination controls compatible with DRF's PageNumberPagination
     * response shape: { count, next, previous, results }.
     * onPageClick(pageNumber) is called when a page control is clicked.
     */
    function pagination(container, { count, pageSize, currentPage, onPageClick }) {
        if (!container) return;
        const totalPages = Math.max(1, Math.ceil(count / pageSize));
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '<div class="pagination">';
        html += `<button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''} aria-label="Previous page">&laquo;</button>`;

        for (let p = 1; p <= totalPages; p++) {
            if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) {
                html += `<button class="pagination-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
            } else if (Math.abs(p - currentPage) === 2) {
                html += `<span class="pagination-ellipsis">&hellip;</span>`;
            }
        }

        html += `<button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''} aria-label="Next page">&raquo;</button>`;
        html += '</div>';

        container.innerHTML = html;
        container.querySelectorAll('.pagination-btn[data-page]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (btn.disabled) return;
                const page = parseInt(btn.getAttribute('data-page'), 10);
                if (!isNaN(page) && typeof onPageClick === 'function') onPageClick(page);
            });
        });
    }

    return {
        escapeHtml,
        formatDate,
        formatCompact,
        readingTime,
        articleImageUrl,
        avatarImageUrl,
        articleCard,
        categoryCard,
        authorCard,
        pagination,
    };
})();
