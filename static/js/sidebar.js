/**
 * static/js/sidebar.js
 * ------------------------------------------------------------------
 * Populates templates/dashboard/includes/_sidebar.html, which is
 * {% include %}'d on every dashboard page. Loaded globally via
 * base.html and no-ops if the sidebar isn't present on the page.
 *
 * API: GET /api/accounts/profiles/me/  -> { user: {...}, bio, city, country, profile_image }
 * Also uses BitraAPI.getCurrentUser() (cached at login) to decide whether
 * to show the "Author Dashboard" link (user.is_author).
 */

document.addEventListener('DOMContentLoaded', function () {
    const nav = document.getElementById('sidebarNav');
    if (!nav) return; // not a dashboard page

    if (!BitraAPI.isAuthenticated()) {
        BitraNotify.info('Please log in to view your dashboard.');
        setTimeout(function () { window.location.href = '/accounts/login/'; }, 700);
        return;
    }

    highlightActiveLink();
    loadSidebarProfile();
});

function highlightActiveLink() {
    const path = window.location.pathname;
    document.querySelectorAll('#sidebarNav .sidebar-link').forEach(function (link) {
        if (link.dataset.navPath === path) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

function loadSidebarProfile() {
    const usernameEl = document.getElementById('sidebarUsername');
    const emailEl = document.getElementById('sidebarEmail');
    const avatarPlaceholder = document.getElementById('sidebarAvatarPlaceholder');
    const authorLink = document.getElementById('sidebarAuthorLink');
    const authorRequestLink = document.getElementById('sidebarAuthorRequestLink');

    const cachedUser = BitraAPI.getCurrentUser();
    if (cachedUser) {
        if (usernameEl) usernameEl.textContent = cachedUser.full_name || cachedUser.username;
        if (emailEl) emailEl.textContent = cachedUser.email;
        toggleAuthorLinks(cachedUser.is_author);
    }

    BitraAPI.get('/accounts/profiles/me/')
        .then(function (profile) {
            if (usernameEl && profile.user) {
                usernameEl.textContent = profile.user.full_name || profile.user.username;
            }
            if (emailEl && profile.user) {
                emailEl.textContent = profile.user.email;
            }
            if (profile.user) {
                BitraAPI.setCurrentUser(profile.user);
                toggleAuthorLinks(profile.user.is_author);
            }
            if (profile.profile_image && avatarPlaceholder) {
                avatarPlaceholder.innerHTML = `<img src="${profile.profile_image}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            }
        })
        .catch(function (err) {
            if (err && err.status === 401) {
                BitraAPI.clearSession();
                window.location.href = '/accounts/login/';
            }
        });

    function toggleAuthorLinks(isAuthor) {
        if (authorLink) authorLink.style.display = isAuthor ? '' : 'none';
        if (authorRequestLink) authorRequestLink.style.display = isAuthor ? 'none' : '';
    }
}
