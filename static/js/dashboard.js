/**
 * static/js/dashboard.js
 * ------------------------------------------------------------------
 * Powers templates/dashboard/dashboard.html.
 *
 * API MAPPING:
 *  - GET/PATCH /api/accounts/profiles/me/        profile (city, country, bio)
 *  - GET       /api/accounts/social-platforms/   list of available platforms (id, name, icon, base_url)
 *  - GET       /api/accounts/social-links/       current user's saved links
 *  - POST      /api/accounts/social-links/       create a link { platform, username }
 *  - PATCH     /api/accounts/social-links/{id}/  update a link's username
 *  - DELETE    /api/accounts/social-links/{id}/  remove a link (username cleared)
 *
 * NOTE: SocialPlatform is a DB-driven list, not a fixed 4-item enum, so
 * the 4 buttons in the template (Instagram/GitHub/LinkedIn/Twitter) are
 * matched against whatever platforms actually exist in the database by
 * name (case-insensitive). If a platform isn't seeded in the DB yet,
 * its button is disabled with an explanatory tooltip.
 *
 * NOTE: profile_image is an ImageField requiring multipart/form-data
 * uploads; there is no upload control in the original static template,
 * so avatar upload is left out of scope here (still shows a placeholder).
 */

(function () {
    // A reasonably complete ISO-3166-1 country list (code -> name), used
    // only for the client-side <select> since there's no country-list API.
    const COUNTRIES = [
        ['US', 'United States'], ['GB', 'United Kingdom'], ['CA', 'Canada'], ['AU', 'Australia'],
        ['DE', 'Germany'], ['FR', 'France'], ['ES', 'Spain'], ['IT', 'Italy'], ['NL', 'Netherlands'],
        ['SE', 'Sweden'], ['NO', 'Norway'], ['DK', 'Denmark'], ['FI', 'Finland'], ['PL', 'Poland'],
        ['PT', 'Portugal'], ['IE', 'Ireland'], ['CH', 'Switzerland'], ['AT', 'Austria'], ['BE', 'Belgium'],
        ['GR', 'Greece'], ['TR', 'Turkey'], ['RU', 'Russia'], ['UA', 'Ukraine'], ['IN', 'India'],
        ['CN', 'China'], ['JP', 'Japan'], ['KR', 'South Korea'], ['SG', 'Singapore'], ['MY', 'Malaysia'],
        ['ID', 'Indonesia'], ['TH', 'Thailand'], ['VN', 'Vietnam'], ['PH', 'Philippines'],
        ['PK', 'Pakistan'], ['BD', 'Bangladesh'], ['AE', 'United Arab Emirates'], ['SA', 'Saudi Arabia'],
        ['IL', 'Israel'], ['EG', 'Egypt'], ['ZA', 'South Africa'], ['NG', 'Nigeria'], ['KE', 'Kenya'],
        ['GH', 'Ghana'], ['BR', 'Brazil'], ['MX', 'Mexico'], ['AR', 'Argentina'], ['CL', 'Chile'],
        ['CO', 'Colombia'], ['PE', 'Peru'], ['NZ', 'New Zealand'],
    ];

    let socialPlatforms = []; // [{id, name, icon, base_url}]
    let socialLinks = [];     // [{id, platform, platform_detail, username, url}]

    document.addEventListener('DOMContentLoaded', function () {
        populateCountrySelect();
        wireCountryDropdown();
        wireSocialToggleButtons();
        loadProfile();
        loadSocialData();
        wireFormSubmit();
    });

    function loadProfile() {
        BitraAPI.get('/accounts/profiles/me/')
            .then(function (profile) {
                renderProfile(profile);
            })
            .catch(function (err) {
                if (err && err.status === 401) return; // sidebar.js already redirects
                BitraNotify.error(BitraAPI.extractErrorMessage(err));
            });
    }

    function renderProfile(profile) {
        const user = profile.user || {};
        document.getElementById('profileFullName').textContent = user.full_name || user.username || '';
        document.getElementById('profileUsername').textContent = user.username ? `@${user.username}` : '';
        document.getElementById('profileFullNameInput').value = user.full_name || '';
        document.getElementById('profileUsernameInput').value = user.username || '';
        document.getElementById('profileEmailInput').value = user.email || '';
        document.getElementById('profileCityInput').value = profile.city || '';
        document.getElementById('profileBioInput').value = profile.bio || '';
        document.getElementById('profileJoinedDate').textContent = BitraRender.formatDate(profile.created_at);

        if (profile.profile_image) {
            document.getElementById('profileAvatarPlaceholder').innerHTML =
                `<img src="${profile.profile_image}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        }

        const countrySelect = document.getElementById('profileCountrySelect');
        const countryValueEl = document.querySelector('[data-country-value]');
        if (profile.country && countrySelect) {
            countrySelect.value = profile.country;
            if (countryValueEl && profile.country_name) countryValueEl.textContent = profile.country_name;
        }
    }

    function populateCountrySelect() {
        const select = document.getElementById('profileCountrySelect');
        const optionsList = document.querySelector('[data-country-options]');
        if (!select || !optionsList) return;

        select.innerHTML = '<option value="">Select your country</option>' +
            COUNTRIES.map(function ([code, name]) { return `<option value="${code}">${name}</option>`; }).join('');

        optionsList.innerHTML = COUNTRIES.map(function ([code, name]) {
            return `<li class="country-option" data-code="${code}" data-name="${name}">${name}</li>`;
        }).join('');

        optionsList.querySelectorAll('.country-option').forEach(function (li) {
            li.addEventListener('click', function () {
                select.value = li.dataset.code;
                const valueEl = document.querySelector('[data-country-value]');
                if (valueEl) valueEl.textContent = li.dataset.name;
                document.querySelector('[data-country-dropdown]').classList.remove('open');
            });
        });
    }

    function wireCountryDropdown() {
        const trigger = document.querySelector('[data-country-trigger]');
        const dropdown = document.querySelector('[data-country-dropdown]');
        const search = document.querySelector('[data-country-search]');
        if (!trigger || !dropdown) return;

        trigger.addEventListener('click', function () {
            dropdown.classList.toggle('open');
        });

        document.addEventListener('click', function (e) {
            if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        });

        if (search) {
            search.addEventListener('input', function () {
                const q = search.value.toLowerCase();
                document.querySelectorAll('[data-country-options] .country-option').forEach(function (li) {
                    li.style.display = li.dataset.name.toLowerCase().includes(q) ? '' : 'none';
                });
            });
        }
    }

    function wireSocialToggleButtons() {
        document.querySelectorAll('.social-platform-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const key = btn.dataset.platform;
                const wrapper = document.querySelector(`[data-input-id="${key}-input"]`);
                if (wrapper) wrapper.classList.toggle('open');
            });
        });
    }

    function loadSocialData() {
        Promise.all([
            BitraAPI.get('/accounts/social-platforms/'),
            BitraAPI.get('/accounts/social-links/'),
        ]).then(function ([platforms, links]) {
            socialPlatforms = Array.isArray(platforms) ? platforms : (platforms.results || []);
            socialLinks = Array.isArray(links) ? links : (links.results || []);
            applySocialLinksToInputs();
        }).catch(function (err) {
            if (err && err.status === 401) return;
            // Non-fatal: leave the social inputs blank if this fails.
        });
    }

    function applySocialLinksToInputs() {
        document.querySelectorAll('[data-social]').forEach(function (input) {
            const key = input.dataset.social; // instagram | github | linkedin | twitter
            const platform = findPlatformByName(key);
            const btn = document.querySelector(`.social-platform-btn[data-platform="${key}"]`);

            if (!platform) {
                if (btn) {
                    btn.disabled = true;
                    btn.title = `"${key}" is not configured on the server yet`;
                }
                return;
            }

            const existingLink = socialLinks.find(function (l) { return l.platform === platform.id; });
            if (existingLink) {
                input.value = existingLink.username || '';
                input.dataset.linkId = existingLink.id;
            }
        });
    }

    function findPlatformByName(key) {
        return socialPlatforms.find(function (p) {
            return p.name && p.name.toLowerCase().includes(key.toLowerCase());
        });
    }

    function wireFormSubmit() {
        const form = document.getElementById('profileEditForm');
        const saveBtn = document.getElementById('profileSaveBtn');

        form.addEventListener('submit', function (e) {
            e.preventDefault();

            saveBtn.disabled = true;
            const originalHtml = saveBtn.innerHTML;
            saveBtn.textContent = 'Saving...';

            const payload = {
                city: document.getElementById('profileCityInput').value.trim(),
                country: document.getElementById('profileCountrySelect').value,
                bio: document.getElementById('profileBioInput').value.trim(),
            };

            BitraAPI.patch('/accounts/profiles/me/', payload)
                .then(function () {
                    return saveSocialLinks();
                })
                .then(function () {
                    BitraNotify.success('Profile updated successfully.');
                })
                .catch(function (err) {
                    BitraNotify.error(BitraAPI.extractErrorMessage(err));
                })
                .finally(function () {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalHtml;
                });
        });
    }

    function saveSocialLinks() {
        const inputs = Array.from(document.querySelectorAll('[data-social]'));
        const ops = inputs.map(function (input) {
            const key = input.dataset.social;
            const platform = findPlatformByName(key);
            if (!platform) return Promise.resolve();

            const username = input.value.trim();
            const linkId = input.dataset.linkId;

            if (!username) return Promise.resolve(); // nothing to save/clear for this one
            if (linkId) {
                return BitraAPI.patch(`/accounts/social-links/${linkId}/`, { username });
            }
            return BitraAPI.post('/accounts/social-links/', { platform: platform.id, username });
        });
        return Promise.all(ops);
    }
})();
