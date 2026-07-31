/**
 * static/js/article_detail.js
 * ------------------------------------------------------------------
 * Powers templates/blog/article_detail.html.
 *
 * API MAPPING:
 *  - GET  /api/blog/articles/{id}/         article detail + approved_comments
 *  - GET  /api/blog/articles/              related articles (client-filtered by category)
 *  - POST /api/accounts/likes/toggle/      { article_id }  (per-user like/unlike)
 *  - POST /api/accounts/bookmarks/toggle/  { article_id }  (per-user bookmark/unbookmark)
 *  - GET  /api/accounts/likes/             used to know if current user already liked this article
 *  - GET  /api/accounts/bookmarks/         used to know if current user already bookmarked this article
 *  - POST /api/blog/comments/              { article, content, author, parent } new comment
 *
 * NOTES / API LIMITATIONS:
 *  - New comments are created with status=PENDING by the backend and are
 *    NOT returned by the article's approved_comments list until a
 *    moderator approves them, so after posting we show a "pending
 *    review" notice rather than the comment itself.
 *  - CommentViewSet has no class-level permission_classes, meaning the
 *    comment-create endpoint is not actually auth-gated server-side.
 *    This client still requires login before showing the form as usable,
 *    but this is a backend gap worth closing separately (see report).
 *  - There is a second, simpler "like" mechanism at
 *    POST /api/blog/articles/{id}/like/ that just increments a shared
 *    counter with no per-user dedupe. We use the accounts likes/toggle/
 *    endpoint instead since it supports proper per-user like/unlike.
 */

(function () {
    const articleId = document.getElementById('articleDetailRoot').dataset.articleId;
    let currentArticle = null;

    document.addEventListener('DOMContentLoaded', function () {
        if (!articleId) {
            BitraNotify.error('Invalid article.');
            return;
        }
        loadArticle();
        loadComments();
        wireCommentForm();
        wireLikeButton();
        wireBookmarkButton();
    });

    function loadArticle() {
        BitraAPI.get(`/blog/articles/${articleId}/`)
            .then(function (article) {
                currentArticle = article;
                renderArticle(article);
                loadRelatedArticles(article);
                refreshLikeBookmarkState();
            })
            .catch(function (err) {
                const msg = BitraAPI.extractErrorMessage(err);
                BitraNotify.error(`Could not load this article: ${msg}`);
                document.getElementById('articleTitle').textContent = 'Article not found';
                document.getElementById('articleBody').innerHTML = '<p>This article may have been removed.</p>';
            });
    }

    function renderArticle(article) {
        document.title = `${article.title} | Bitra`;
        document.getElementById('articleCategoryBadge').textContent = article.category ? article.category.name : 'Uncategorized';
        document.getElementById('articleTitle').textContent = article.title;
        document.getElementById('articleAuthorName').textContent = article.author_name || 'Unknown';
        document.getElementById('articleDate').textContent = BitraRender.formatDate(article.created_at);
        document.getElementById('articleReadingTime').textContent = BitraRender.readingTime(article.content || article.summary);
        document.getElementById('articleViews').textContent = article.views ?? 0;
        document.getElementById('articleLikes').textContent = article.likes ?? 0;
        document.getElementById('articleHeroImage').src = BitraRender.articleImageUrl(article, 1600, 700);
        document.getElementById('articleHeroImage').alt = article.title;

        // content is stored as plain text server-side (TextField, no rich-text
        // flag in the model), so render as paragraphs split on blank lines.
        const bodyEl = document.getElementById('articleBody');
        const paragraphs = (article.content || '').split(/\n\s*\n/).filter(Boolean);
        bodyEl.innerHTML = paragraphs.length
            ? paragraphs.map(function (p) { return `<p>${BitraRender.escapeHtml(p)}</p>`; }).join('')
            : `<p>${BitraRender.escapeHtml(article.summary || '')}</p>`;

        const tagsList = document.getElementById('articleTagsList');
        tagsList.innerHTML = (article.tags || []).map(function (tag) {
            return `<a href="/articles/?search=${encodeURIComponent(tag.name)}" class="tag">${BitraRender.escapeHtml(tag.name)}</a>`;
        }).join('');
    }

    function loadRelatedArticles(article) {
        const grid = document.getElementById('relatedArticlesGrid');
        BitraAPI.get('/blog/articles/')
            .then(function (data) {
                const all = Array.isArray(data) ? data : (data.results || []);
                const related = all.filter(function (a) {
                    return a.id !== article.id &&
                        a.status === 'REVIEWED' &&
                        article.category && a.category && a.category.slug === article.category.slug;
                }).slice(0, 4);

                const fallback = related.length ? related : all.filter(function (a) {
                    return a.id !== article.id && a.status === 'REVIEWED';
                }).slice(0, 4);

                if (!fallback.length) {
                    grid.innerHTML = '<p class="empty-text">No related articles yet.</p>';
                    return;
                }
                grid.innerHTML = fallback.map(BitraRender.articleCard).join('');
            })
            .catch(function () {
                grid.innerHTML = '';
            });
    }

    // -----------------------------------------------------------------
    // Likes / Bookmarks
    // -----------------------------------------------------------------
    function refreshLikeBookmarkState() {
        if (!BitraAPI.isAuthenticated()) return;

        BitraAPI.get('/accounts/likes/').then(function (data) {
            const likes = Array.isArray(data) ? data : (data.results || []);
            const liked = likes.some(function (l) { return String(l.article) === String(articleId); });
            setToggleState('articleLikeBtn', liked);
        }).catch(function () {});

        BitraAPI.get('/accounts/bookmarks/').then(function (data) {
            const bookmarks = Array.isArray(data) ? data : (data.results || []);
            const saved = bookmarks.some(function (b) { return String(b.article) === String(articleId); });
            setToggleState('articleBookmarkBtn', saved, 'Saved', 'Save');
        }).catch(function () {});
    }

    function setToggleState(id, active, activeLabel, inactiveLabel) {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.style.opacity = active ? '1' : '0.7';
        btn.style.fontWeight = active ? '700' : 'normal';
        if (id === 'articleBookmarkBtn') {
            btn.textContent = active ? (activeLabel || 'Saved') : (inactiveLabel || 'Save');
        }
    }

    function wireLikeButton() {
        const btn = document.getElementById('articleLikeBtn');
        btn.addEventListener('click', function () {
            if (!requireAuth()) return;
            BitraAPI.post('/accounts/likes/toggle/', { article_id: articleId })
                .then(function (res) {
                    const liked = res.status === 'liked';
                    setToggleState('articleLikeBtn', liked);
                    const likesEl = document.getElementById('articleLikes');
                    const current = parseInt(likesEl.textContent, 10) || 0;
                    likesEl.textContent = Math.max(0, current + (liked ? 1 : -1));
                })
                .catch(function (err) {
                    BitraNotify.error(BitraAPI.extractErrorMessage(err));
                });
        });
    }

    function wireBookmarkButton() {
        const btn = document.getElementById('articleBookmarkBtn');
        btn.addEventListener('click', function () {
            if (!requireAuth()) return;
            BitraAPI.post('/accounts/bookmarks/toggle/', { article_id: articleId })
                .then(function (res) {
                    const saved = res.status === 'bookmarked';
                    setToggleState('articleBookmarkBtn', saved, 'Saved', 'Save');
                    BitraNotify.success(saved ? 'Article saved to your bookmarks.' : 'Removed from bookmarks.');
                })
                .catch(function (err) {
                    BitraNotify.error(BitraAPI.extractErrorMessage(err));
                });
        });
    }

    // -----------------------------------------------------------------
    // Comments
    // -----------------------------------------------------------------
    function loadComments() {
        // approved_comments is embedded in the article detail response,
        // so we wait for that fetch rather than hitting /comments/ separately.
        const poll = setInterval(function () {
            if (currentArticle) {
                clearInterval(poll);
                renderComments(currentArticle.approved_comments || []);
            }
        }, 100);
    }

    function renderComments(comments) {
        const list = document.getElementById('commentsList');
        const countEl = document.getElementById('commentCount');
        const totalCount = countTotal(comments);
        countEl.textContent = `(${totalCount})`;

        if (!comments.length) {
            list.innerHTML = '<p class="empty-text">Be the first to comment.</p>';
            return;
        }
        list.innerHTML = comments.map(renderCommentNode).join('');
    }

    function countTotal(comments) {
        return comments.reduce(function (sum, c) {
            return sum + 1 + (c.children ? countTotal(c.children) : 0);
        }, 0);
    }

    function renderCommentNode(comment, isReply) {
        const author = BitraRender.escapeHtml(comment.author_name || 'Anonymous');
        const date = BitraRender.formatDate(comment.created_at);
        const content = BitraRender.escapeHtml(comment.content);
        const childrenHtml = (comment.children || []).map(function (c) { return renderCommentNode(c, true); }).join('');

        return `
        <div class="comment${isReply ? ' comment-reply' : ''}">
            <div class="comment-header">
                <div class="comment-author">
                    <div class="author-avatar">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                    </div>
                    <div class="comment-author-info">
                        <span class="comment-author-name">${author}</span>
                        <span class="comment-date">${date}</span>
                    </div>
                </div>
            </div>
            <div class="comment-content">
                <p>${content}</p>
            </div>
        </div>
        ${childrenHtml}`;
    }

    function wireCommentForm() {
        const form = document.getElementById('commentForm');
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!requireAuth()) return;

            const textarea = document.getElementById('commentTextarea');
            const content = textarea.value.trim();
            if (!content) return;

            const currentUser = BitraAPI.getCurrentUser();
            const submitBtn = document.getElementById('commentSubmitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Posting...';

            BitraAPI.post('/blog/comments/', {
                article: articleId,
                content: content,
                author: currentUser ? currentUser.id : undefined,
            })
                .then(function () {
                    textarea.value = '';
                    BitraNotify.success('Comment submitted! It will appear once approved by a moderator.');
                })
                .catch(function (err) {
                    BitraNotify.error(BitraAPI.extractErrorMessage(err));
                })
                .finally(function () {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Post Comment';
                });
        });
    }

    function requireAuth() {
        if (BitraAPI.isAuthenticated()) return true;
        BitraNotify.info('Please log in to do that.');
        setTimeout(function () { window.location.href = '/accounts/login/'; }, 900);
        return false;
    }
})();
