/**
 * static/js/my_comments.js
 * ------------------------------------------------------------------
 * Powers templates/dashboard/my-comments.html.
 *
 * API MAPPING:
 *  - GET /api/blog/comments/   returns only APPROVED comments (see note
 *    below), for every article; filtered client-side to the current
 *    user's comments by matching author_name === current username.
 *  - GET /api/blog/articles/   used to resolve article titles for each comment.
 *
 * IMPORTANT API LIMITATION: CommentViewSet.get_queryset() is hardcoded
 * to Comment.Status.APPROVED with no per-user scoping, so there is
 * currently NO way for a user to see their own PENDING or REJECTED
 * comments through this API. The "Pending" tab is disabled below and
 * the "All"/"Approved" tabs show identical data as a result. Fixing
 * this properly would require a backend change (e.g. a `mine=true`
 * query param that also includes the requesting user's own non-approved
 * comments) — flagged in the conversion report as a follow-up.
 */

(function () {
    let allComments = [];
    let currentTab = 'all';

    document.addEventListener('DOMContentLoaded', function () {
        wireTabs();
        loadMyComments();
    });

    function wireTabs() {
        document.querySelectorAll('#commentsTabs .tab-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (btn.dataset.tab === 'pending') {
                    BitraNotify.info('Pending comments cannot be shown yet: the API only returns approved comments.');
                    return;
                }
                document.querySelectorAll('#commentsTabs .tab-btn').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                currentTab = btn.dataset.tab;
                renderComments();
            });
        });
    }

    function loadMyComments() {
        const container = document.getElementById('myCommentsList');
        const currentUser = BitraAPI.getCurrentUser();

        Promise.all([
            BitraAPI.get('/blog/comments/'),
            BitraAPI.get('/blog/articles/'),
        ]).then(function ([commentsData, articlesData]) {
            const comments = Array.isArray(commentsData) ? commentsData : (commentsData.results || []);
            const articles = Array.isArray(articlesData) ? articlesData : (articlesData.results || []);
            const articleById = new Map(articles.map(function (a) { return [a.id, a]; }));

            allComments = comments
                .filter(function (c) { return !currentUser || c.author_name === currentUser.username; })
                .map(function (c) { return { comment: c, article: articleById.get(c.article) }; })
                .sort(function (a, b) { return new Date(b.comment.created_at) - new Date(a.comment.created_at); });

            renderComments();
        }).catch(function (err) {
            if (err && err.status === 401) return;
            BitraNotify.error(BitraAPI.extractErrorMessage(err));
            container.innerHTML = '<p class="empty-text">Unable to load your comments.</p>';
        });
    }

    function renderComments() {
        const container = document.getElementById('myCommentsList');
        // "all" and "approved" show the same set today, since the API
        // never returns anything but approved comments (see note above).
        const items = allComments;

        if (!items.length) {
            container.innerHTML = '<p class="empty-text">You haven\'t posted any comments yet.</p>';
            return;
        }

        container.innerHTML = items.map(renderCommentRow).join('');
    }

    function renderCommentRow({ comment, article }) {
        const text = BitraRender.escapeHtml(comment.content);
        const articleTitle = article ? BitraRender.escapeHtml(article.title) : 'Deleted article';
        const date = BitraRender.formatDate(comment.created_at);
        const articleLink = article ? `/articles/${article.id}/` : '#';

        return `
        <div class="comment-item">
            <div class="comment-item-content">
                <p class="comment-text">&ldquo;${text}&rdquo;</p>
                <div class="comment-meta">
                    <span class="comment-article">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <path d="M14 2v6h6"/>
                        </svg>
                        <a href="${articleLink}" style="color: inherit;">${articleTitle}</a>
                    </span>
                    <span class="comment-date">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2"/>
                            <path d="M16 2v4M8 2v4M3 10h18"/>
                        </svg>
                        ${date}
                    </span>
                </div>
            </div>
            <span class="comment-status status-approved">Approved</span>
        </div>`;
    }
})();
