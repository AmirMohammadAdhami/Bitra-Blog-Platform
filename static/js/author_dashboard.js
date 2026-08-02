/**
 * static/js/author_dashboard.js
 * ------------------------------------------------------------------
 * Powers templates/dashboard/author_dashboard.html.
 *
 * API MAPPING:
 *  - GET   /api/blog/articles/            all articles; filtered client-side
 *          to author_name === current username (no "my articles" filter
 *          exists server-side)
 *  - POST  /api/blog/articles/            create a new article (as DRAFT)
 *  - PATCH /api/blog/articles/{id}/       move a draft to SUBMITTED ("Publish"
 *          really means "submit for editorial review" here — there is no
 *          author-facing action that publishes directly, since REVIEWED
 *          is presumably staff-only in intent, even though the API itself
 *          doesn't enforce that distinction beyond IsAuthenticatedOrReadOnly)
 *
 * This page has no sidebar include, so it performs its own auth guard
 * rather than relying on sidebar.js.
 */

(function () {
    let myArticles = [];

    document.addEventListener('DOMContentLoaded', function () {
        if (!BitraAPI.isAuthenticated()) {
            BitraNotify.info('Please log in to view your author dashboard.');
            setTimeout(function () { window.location.href = '/accounts/login/'; }, 700);
            return;
        }

        const currentUser = BitraAPI.getCurrentUser();
        if (currentUser && !currentUser.is_author) {
            BitraNotify.info('You need an approved author request to access this page.');
            setTimeout(function () { window.location.href = '/dashboard/author-request/'; }, 900);
            return;
        }

        const welcomeText = document.getElementById('authorWelcomeText');
        if (welcomeText && currentUser) {
            welcomeText.textContent = `Welcome back, ${currentUser.full_name || currentUser.username}. Here's your writing overview.`;
        }

        loadMyArticles();
        wireCreateButton();
    });

    function loadMyArticles() {
        const currentUser = BitraAPI.getCurrentUser();

        BitraAPI.get('/blog/articles/')
            .then(function (data) {
                const all = Array.isArray(data) ? data : (data.results || []);
                myArticles = all.filter(function (a) {
                    return !currentUser || a.author_name === currentUser.username;
                });
                renderStats();
                renderPublishedTable();
                renderDrafts();
            })
            .catch(function (err) {
                BitraNotify.error(BitraAPI.extractErrorMessage(err));
            });
    }

    function renderStats() {
        const grid = document.getElementById('authorStatsGrid');
        const published = myArticles.filter(function (a) { return a.status === 'REVIEWED'; });
        const submitted = myArticles.filter(function (a) { return a.status === 'SUBMITTED'; });
        const totalViews = myArticles.reduce(function (s, a) { return s + (a.views || 0); }, 0);
        const totalLikes = myArticles.reduce(function (s, a) { return s + (a.likes || 0); }, 0);

        grid.innerHTML = `
            <div class="author-stat-card">
                <div class="stat-icon stat-icon-blue">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                    </svg>
                </div>
                <div class="stat-info">
                    <span class="stat-number">${published.length}</span>
                    <span class="stat-label">Published Articles</span>
                </div>
            </div>
            <div class="author-stat-card">
                <div class="stat-icon stat-icon-purple">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </div>
                <div class="stat-info">
                    <span class="stat-number">${formatCompact(totalViews)}</span>
                    <span class="stat-label">Total Views</span>
                </div>
            </div>
            <div class="author-stat-card">
                <div class="stat-icon stat-icon-green">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                </div>
                <div class="stat-info">
                    <span class="stat-number">${formatCompact(totalLikes)}</span>
                    <span class="stat-label">Total Likes</span>
                </div>
            </div>
            <div class="author-stat-card">
                <div class="stat-icon stat-icon-orange">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 8v4M12 16h.01"/>
                    </svg>
                </div>
                <div class="stat-info">
                    <span class="stat-number">${submitted.length}</span>
                    <span class="stat-label">Awaiting Review</span>
                </div>
            </div>`;
    }

    function renderPublishedTable() {
        const body = document.getElementById('publishedArticlesTableBody');
        const published = myArticles
            .filter(function (a) { return a.status === 'REVIEWED'; })
            .sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });

        if (!published.length) {
            body.innerHTML = '<p class="empty-text" style="padding: var(--space-md);">No published articles yet.</p>';
            return;
        }

        body.innerHTML = published.map(function (a) {
            return `
            <div class="table-row">
                <span class="table-col table-col-title"><a href="/articles/${a.id}/" style="color:inherit;">${BitraRender.escapeHtml(a.title)}</a></span>
                <span class="table-col table-col-views">${formatCompact(a.views || 0)}</span>
                <span class="table-col table-col-likes">${formatCompact(a.likes || 0)}</span>
                <span class="table-col table-col-date">${BitraRender.formatDate(a.created_at)}</span>
            </div>`;
        }).join('');
    }

    function renderDrafts() {
        const list = document.getElementById('draftArticlesList');
        const drafts = myArticles
            .filter(function (a) { return a.status === 'DRAFT' || a.status === 'REJECTED'; })
            .sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });

        if (!drafts.length) {
            list.innerHTML = '<p class="empty-text">No drafts right now.</p>';
            return;
        }

        list.innerHTML = drafts.map(function (a) {
            const label = a.status === 'REJECTED' ? 'Rejected &mdash; edit and resubmit' : 'Draft';
            return `
            <div class="draft-item">
                <div class="draft-info">
                    <h4 class="draft-title">${BitraRender.escapeHtml(a.title)}</h4>
                    <span class="draft-date">${label} &middot; ${BitraRender.formatDate(a.created_at)}</span>
                </div>
                <div class="draft-actions">
                    <button class="btn btn-primary btn-sm" data-submit-article="${a.id}">Submit for Review</button>
                </div>
            </div>`;
        }).join('');

        list.querySelectorAll('[data-submit-article]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const id = btn.dataset.submitArticle;
                btn.disabled = true;
                btn.textContent = 'Submitting...';
                BitraAPI.patch(`/blog/articles/${id}/`, { status: 'SUBMITTED' })
                    .then(function () {
                        BitraNotify.success('Article submitted for review.');
                        loadMyArticles();
                    })
                    .catch(function (err) {
                        BitraNotify.error(BitraAPI.extractErrorMessage(err));
                        btn.disabled = false;
                        btn.textContent = 'Submit for Review';
                    });
            });
        });
    }

    function wireCreateButton() {
        const btn = document.getElementById('createArticleBtn');
        if (!btn) return;

        btn.addEventListener('click', function () {
            const title = window.prompt('Article title:');
            if (!title) return;
            const summary = window.prompt('Short summary:') || '';
            const content = window.prompt('Article content:') || '';

            BitraAPI.post('/blog/articles/', { title, summary, content, status: 'DRAFT' })
                .then(function () {
                    BitraNotify.success('Draft created! Find it under Draft Articles.');
                    loadMyArticles();
                })
                .catch(function (err) {
                    BitraNotify.error(BitraAPI.extractErrorMessage(err));
                });
        });
    }

    function formatCompact(n) {
        if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        return String(n);
    }
})();
