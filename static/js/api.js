/**
 * Bitra API Client
 * ------------------------------------------------------------------
 * Centralised fetch wrapper for talking to the DRF backend.
 * - Attaches JWT access token (Authorization: Bearer ...) when present.
 * - Attaches CSRF token for any non-GET request (defence in depth /
 *   required if SessionAuthentication is ever used alongside JWT).
 * - Auto-refreshes an expired access token once using the refresh token,
 *   then retries the original request.
 * - Normalises errors into a single shape so callers can show messages
 *   via BitraNotify without repeating try/catch boilerplate.
 */

const BitraAPI = (function () {
    const ACCESS_KEY = 'bitra_access_token';
    const REFRESH_KEY = 'bitra_refresh_token';
    const USER_KEY = 'bitra_user';

    const API_ROOT = '/api';

    // ---------------------------------------------------------------
    // Token / current-user storage helpers
    // ---------------------------------------------------------------
    function getAccessToken() {
        return localStorage.getItem(ACCESS_KEY);
    }

    function getRefreshToken() {
        return localStorage.getItem(REFRESH_KEY);
    }

    function setTokens({ access, refresh }) {
        if (access) localStorage.setItem(ACCESS_KEY, access);
        if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    }

    function setCurrentUser(user) {
        if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    function getCurrentUser() {
        try {
            const raw = localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function clearSession() {
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);
    }

    function isAuthenticated() {
        return !!getAccessToken();
    }

    // ---------------------------------------------------------------
    // CSRF helper (Django default cookie name: csrftoken)
    // ---------------------------------------------------------------
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    function getCSRFToken() {
        return getCookie('csrftoken');
    }

    // ---------------------------------------------------------------
    // Core request function
    // ---------------------------------------------------------------
    async function request(path, options = {}) {
        const {
            method = 'GET',
            body = null,
            isForm = false,
            auth = true,
            _retry = false,
        } = options;

        const url = path.startsWith('http') ? path : `${API_ROOT}${path}`;

        const headers = {};
        if (!isForm) headers['Content-Type'] = 'application/json';
        headers['Accept'] = 'application/json';

        const method_upper = method.toUpperCase();
        if (!['GET', 'HEAD', 'OPTIONS'].includes(method_upper)) {
            const csrf = getCSRFToken();
            if (csrf) headers['X-CSRFToken'] = csrf;
        }

        if (auth) {
            const token = getAccessToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;
        }

        const fetchOptions = {
            method: method_upper,
            headers,
            credentials: 'same-origin',
        };

        if (body !== null && body !== undefined) {
            fetchOptions.body = isForm ? body : JSON.stringify(body);
        }

        let response;
        try {
            response = await fetch(url, fetchOptions);
        } catch (networkErr) {
            throw { status: 0, data: { detail: 'Network error. Please check your connection.' } };
        }

        // Attempt a silent token refresh once on 401, then retry.
        if (response.status === 401 && auth && !_retry && getRefreshToken()) {
            const refreshed = await tryRefreshToken();
            if (refreshed) {
                return request(path, { ...options, _retry: true });
            }
            clearSession();
        }

        let data = null;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            data = await response.json().catch(() => null);
        } else {
            data = await response.text().catch(() => null);
        }

        if (!response.ok) {
            throw { status: response.status, data };
        }

        return data;
    }

    async function tryRefreshToken() {
        const refresh = getRefreshToken();
        if (!refresh) return false;

        try {
            const res = await fetch(`${API_ROOT}/accounts/token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh }),
            });
            if (!res.ok) return false;
            const data = await res.json();
            setTokens({ access: data.access, refresh: data.refresh || refresh });
            return true;
        } catch (e) {
            return false;
        }
    }

    // ---------------------------------------------------------------
    // Convenience verbs
    // ---------------------------------------------------------------
    const get = (path, options = {}) => request(path, { ...options, method: 'GET' });
    const post = (path, body, options = {}) => request(path, { ...options, method: 'POST', body });
    const patch = (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body });
    const put = (path, body, options = {}) => request(path, { ...options, method: 'PUT', body });
    const del = (path, options = {}) => request(path, { ...options, method: 'DELETE' });

    /**
     * Extracts a human-readable error message from a thrown API error
     * (shape: { status, data }) for display in BitraNotify.
     */
    function extractErrorMessage(err) {
        if (!err) return 'Something went wrong. Please try again.';
        const data = err.data;

        if (!data) return 'Something went wrong. Please try again.';
        if (typeof data === 'string') return data;
        if (data.detail) return data.detail;

        // DRF validation errors: { field: ["msg", ...], ... }
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
            const val = data[firstKey];
            const msg = Array.isArray(val) ? val[0] : val;
            if (typeof msg === 'string') {
                return firstKey === 'non_field_errors' ? msg : `${firstKey}: ${msg}`;
            }
        }
        return 'Something went wrong. Please try again.';
    }

    return {
        request,
        get,
        post,
        patch,
        put,
        delete: del,
        getAccessToken,
        getRefreshToken,
        setTokens,
        setCurrentUser,
        getCurrentUser,
        clearSession,
        isAuthenticated,
        getCSRFToken,
        extractErrorMessage,
    };
})();
