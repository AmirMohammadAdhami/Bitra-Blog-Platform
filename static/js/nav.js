/**
 * static/js/nav.js
 * ------------------------------------------------------------------
 * Runs on every page (included globally via base.html). Handles:
 *  - Toggling the "guest" vs "user" nav-auth blocks based on JWT state.
 *  - Populating the Categories dropdown from GET /api/blog/categories/.
 *  - Wiring the navbar search box to redirect to /articles/?search=...
 *  - Logout button -> POST /api/accounts/logout/ (blacklists refresh token).
 */

document.addEventListener('DOMContentLoaded', function () {
    initNavAuthState();
    loadNavCategories();
    initNavSearch();
    initNavLogout();
});

function initNavAuthState() {
    const guestBlock = document.querySelector('.nav-auth[data-auth-state="guest"]');
    const userBlock = document.querySelector('.nav-auth[data-auth-state="user"]');
    if (!guestBlock || !userBlock) return;

    if (typeof BitraAPI !== 'undefined' && BitraAPI.isAuthenticated()) {
        guestBlock.style.display = 'none';
        userBlock.style.display = '';
    } else {
        guestBlock.style.display = '';
        userBlock.style.display = 'none';
    }
}

function loadNavCategories() {
    const menu = document.querySelector('[data-categories-menu]');
    if (!menu || typeof BitraAPI === 'undefined') return;

    BitraAPI.get('/blog/categories/')
        .then(function (data) {
            const results = Array.isArray(data) ? data : (data.results || []);
            if (!results.length) return;

            menu.innerHTML = '<a href="/articles/" class="dropdown-item">All Categories</a>' +
                results.map(function (cat) {
                    return `<a href="/articles/?category=${encodeURIComponent(cat.slug)}" class="dropdown-item">${escapeHtml(cat.name)}</a>`;
                }).join('');
        })
        .catch(function () {
            // Keep the "All Categories" fallback link already in the markup.
        });
}

function initNavSearch() {
    const input = document.getElementById('navSearchInput');
    if (!input) return;

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            const q = input.value.trim();
            if (q) {
                window.location.href = `/articles/?search=${encodeURIComponent(q)}`;
            }
        }
    });
}

function initNavLogout() {
    const btn = document.getElementById('navLogoutBtn');
    if (!btn) return;

    btn.addEventListener('click', function () {
        const refresh = BitraAPI.getRefreshToken();
        BitraAPI.post('/accounts/logout/', { refresh })
            .catch(function () { /* even if blacklist fails, clear local session */ })
            .finally(function () {
                BitraAPI.clearSession();
                if (typeof BitraNotify !== 'undefined') BitraNotify.success('You have been logged out.');
                setTimeout(function () { window.location.href = '/'; }, 600);
            });
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}
