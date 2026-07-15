/* ==========================================
   BITRA - Main JavaScript
   ========================================== */

document.addEventListener('DOMContentLoaded', function () {

    // ==========================================
    // Navbar Scroll Effect
    // ==========================================
    const navbar = document.getElementById('navbar');
    if (navbar) {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        };
        window.addEventListener('scroll', handleScroll);
        handleScroll();
    }

    // ==========================================
    // Mobile Menu Toggle
    // ==========================================
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function () {
            this.classList.toggle('active');
            navMenu.classList.toggle('active');
            document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
        });

        // Close menu when clicking nav links
        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function () {
                if (window.innerWidth <= 1024) {
                    navToggle.classList.remove('active');
                    navMenu.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });

        // Mobile dropdown toggle
        navMenu.querySelectorAll('.dropdown-toggle').forEach(toggle => {
            toggle.addEventListener('click', function (e) {
                if (window.innerWidth <= 1024) {
                    e.preventDefault();
                    this.closest('.nav-dropdown').classList.toggle('active');
                }
            });
        });
    }

    // ==========================================
    // Search Toggle
    // ==========================================
    const searchToggle = document.getElementById('searchToggle');
    const searchOverlay = document.getElementById('searchOverlay');
    const searchClose = document.getElementById('searchClose');
    const searchInput = searchOverlay ? searchOverlay.querySelector('.search-input') : null;

    if (searchToggle && searchOverlay) {
        searchToggle.addEventListener('click', function () {
            searchOverlay.classList.add('active');
            if (searchInput) searchInput.focus();
        });

        if (searchClose) {
            searchClose.addEventListener('click', function () {
                searchOverlay.classList.remove('active');
            });
        }

        searchOverlay.addEventListener('click', function (e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && searchOverlay.classList.contains('active')) {
                searchOverlay.classList.remove('active');
            }
        });
    }

    // ==========================================
    // Bitra Notifications
    // ==========================================
    const notificationsContainer = document.getElementById('bitraNotifications');
    const NOTIFICATION_DURATION = 5000;
    const NOTIFICATION_EXIT_MS = 260;

    function dismissNotify(el) {
        if (el.classList.contains('bitra-notify--dismissing')) return;
        el.classList.remove('bitra-notify--visible');
        el.classList.add('bitra-notify--dismissing');
        setTimeout(() => el.remove(), NOTIFICATION_EXIT_MS);
    }

    if (notificationsContainer) {
        const notifications = notificationsContainer.querySelectorAll('.bitra-notify');

        notifications.forEach(function (notify) {
            // Animate in after paint
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    notify.classList.add('bitra-notify--visible');
                });
            });

            // Close button
            var closeBtn = notify.querySelector('.bitra-notify__close');
            if (closeBtn) {
                closeBtn.addEventListener('click', function () {
                    dismissNotify(notify);
                });
            }

            // Auto dismiss via timer bar
            var duration = NOTIFICATION_DURATION;
            if (notify.classList.contains('bitra-notify--error')) {
                duration = 6000;
            }

            setTimeout(function () {
                dismissNotify(notify);
            }, duration);
        });
    }

    // ==========================================
    // Sidebar Toggle (Dashboard)
    // ==========================================
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function () {
            sidebarLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // ==========================================
    // Dashboard Tabs
    // ==========================================
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // ==========================================
    // Filter Buttons
    // ==========================================
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // ==========================================
    // Analytics Period Buttons
    // ==========================================
    const periodBtns = document.querySelectorAll('.period-btn');
    periodBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            periodBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // ==========================================
    // Back to Top Button
    // ==========================================
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
        backToTop.addEventListener('click', function () {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // ==========================================
    // Password Toggle
    // ==========================================
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function () {
            const input = this.closest('.input-wrapper').querySelector('input');
            if (input) {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                this.innerHTML = isPassword
                    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
                    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
            }
        });
    });

    // ==========================================
    // Follow Button Toggle
    // ==========================================
    document.querySelectorAll('.btn-follow').forEach(btn => {
        btn.addEventListener('click', function () {
            if (this.classList.contains('following')) {
                this.classList.remove('following');
                this.textContent = 'Follow';
                this.classList.remove('btn-primary');
                this.classList.add('btn-outline');
            } else {
                this.classList.add('following');
                this.textContent = 'Following';
                this.classList.remove('btn-outline');
                this.classList.add('btn-primary');
            }
        });
    });

    // ==========================================
    // Smooth Scroll for Anchor Links
    // ==========================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ==========================================
    // Comment Reply Button
    // ==========================================
    document.querySelectorAll('.reply-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const commentSection = document.querySelector('.comment-form');
            if (commentSection) {
                commentSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
                const textarea = commentSection.querySelector('.comment-textarea');
                if (textarea) {
                    textarea.focus();
                }
            }
        });
    });

    // ==========================================
    // Form Validation Errors
    // ==========================================
    document.querySelectorAll('.form-error').forEach(function (errorEl) {
        var formGroup = errorEl.closest('.form-group');
        if (formGroup) {
            var input = formGroup.querySelector('.form-input');
            if (input) {
                input.addEventListener('input', function () {
                    if (errorEl.parentNode) {
                        errorEl.style.animation = 'none';
                        errorEl.offsetHeight;
                        errorEl.style.animation = '';
                    }
                });
            }
        }
    });

});
