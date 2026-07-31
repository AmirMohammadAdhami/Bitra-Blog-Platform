/**
 * BitraNotify
 * ------------------------------------------------------------------
 * Dynamically creates notification toasts that visually match the
 * server-rendered markup in templates/includes/error_popup.html, so
 * API-driven (JS) messages and Django-messages-driven (page load)
 * messages look and behave identically.
 *
 * Usage:
 *   BitraNotify.success('Profile updated successfully');
 *   BitraNotify.error('Unable to save changes');
 *   BitraNotify.info('Check your email for a verification code');
 */

const BitraNotify = (function () {
    const DURATION = { success: 5000, info: 5000, error: 6000, warning: 6000 };
    const EXIT_MS = 260;

    const ICONS = {
        success: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>',
        error: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6"/><path d="M9 9l6 6"/></svg>',
        info: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
        default: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    };

    const TITLES = { success: 'Success', error: 'Error', info: 'Info', warning: 'Notice', default: 'Notice' };

    function getContainer() {
        let container = document.getElementById('bitraNotifications');
        if (!container) {
            container = document.createElement('div');
            container.className = 'bitra-notifications';
            container.id = 'bitraNotifications';
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-atomic', 'true');
            document.body.appendChild(container);
        }
        return container;
    }

    function dismiss(el) {
        if (!el || el.classList.contains('bitra-notify--dismissing')) return;
        el.classList.remove('bitra-notify--visible');
        el.classList.add('bitra-notify--dismissing');
        setTimeout(() => el.remove(), EXIT_MS);
    }

    function show(message, tag = 'info') {
        const type = ICONS[tag] ? tag : 'default';
        const container = getContainer();

        const el = document.createElement('div');
        el.className = `bitra-notify bitra-notify--${tag}`;
        el.setAttribute('role', 'alert');
        el.innerHTML = `
            <div class="bitra-notify__accent"></div>
            <div class="bitra-notify__icon">${ICONS[type]}</div>
            <div class="bitra-notify__body">
                <p class="bitra-notify__title">${TITLES[type]}</p>
                <p class="bitra-notify__message"></p>
            </div>
            <button class="bitra-notify__close" aria-label="Close notification">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6L6 18"/><path d="M6 6l12 12"/>
                </svg>
            </button>
            <div class="bitra-notify__timer"></div>
        `;
        // Set message via textContent to avoid any HTML/script injection from API text.
        el.querySelector('.bitra-notify__message').textContent = message;

        container.appendChild(el);

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                el.classList.add('bitra-notify--visible');
            });
        });

        const closeBtn = el.querySelector('.bitra-notify__close');
        if (closeBtn) closeBtn.addEventListener('click', () => dismiss(el));

        const duration = DURATION[tag] || DURATION.info;
        setTimeout(() => dismiss(el), duration);

        return el;
    }

    return {
        show,
        success: (msg) => show(msg, 'success'),
        error: (msg) => show(msg, 'error'),
        info: (msg) => show(msg, 'info'),
        warning: (msg) => show(msg, 'warning'),
    };
})();
