/**
 * static/js/author_request.js
 * ------------------------------------------------------------------
 * Powers templates/dashboard/author-request.html.
 *
 * API MAPPING:
 *  - GET  /api/accounts/author-requests/   list of the current user's own requests
 *  - POST /api/accounts/author-requests/   create a new request (no body needed/used;
 *          AuthorRequest has no free-text fields — see note in the template)
 *
 * STATE LOGIC:
 *  - is_author === true on the cached user           -> "Already an Author" banner
 *  - a request exists with status === 'PENDING'       -> "Pending Review" banner
 *  - the most recent request has status === 'REJECTED' (and none pending) -> rejected banner + form
 *  - otherwise                                        -> show the application form
 */

document.addEventListener('DOMContentLoaded', function () {
    loadAuthorRequestState();
    wireForm();
});

function loadAuthorRequestState() {
    const currentUser = BitraAPI.getCurrentUser();

    if (currentUser && currentUser.is_author) {
        showState('approved');
        return;
    }

    BitraAPI.get('/accounts/author-requests/')
        .then(function (data) {
            const requests = Array.isArray(data) ? data : (data.results || []);
            const pending = requests.find(function (r) { return r.status === 'PENDING'; });
            if (pending) {
                showState('pending');
                return;
            }

            const sorted = [...requests].sort(function (a, b) {
                return new Date(b.created_at) - new Date(a.created_at);
            });
            const mostRecent = sorted[0];

            if (mostRecent && mostRecent.status === 'APPROVED') {
                showState('approved');
            } else if (mostRecent && mostRecent.status === 'REJECTED') {
                showState('rejected');
            } else {
                showState('form');
            }
        })
        .catch(function (err) {
            if (err && err.status === 401) return;
            showState('form');
        });
}

function showState(state) {
    const map = {
        form: 'authorRequestFormCard',
        pending: 'authorRequestPendingBanner',
        approved: 'authorRequestApprovedBanner',
        rejected: 'authorRequestRejectedBanner',
    };
    Object.values(map).forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    const target = document.getElementById(map[state]);
    if (target) target.style.display = state === 'form' ? 'block' : 'flex';

    if (state === 'rejected') {
        const formCard = document.getElementById('authorRequestFormCard');
        if (formCard) formCard.style.display = 'block';
    }
}

function wireForm() {
    const form = document.getElementById('authorRequestForm');
    const submitBtn = document.getElementById('authorRequestSubmitBtn');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        // AuthorRequestSerializer accepts no writable fields, so we POST
        // with an empty body; the view creates the request from
        // request.user automatically.
        BitraAPI.post('/accounts/author-requests/', {})
            .then(function () {
                BitraNotify.success('Application submitted! We will review it shortly.');
                showState('pending');
            })
            .catch(function (err) {
                BitraNotify.error(BitraAPI.extractErrorMessage(err));
            })
            .finally(function () {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                    </svg>
                    Submit Application`;
            });
    });
}
