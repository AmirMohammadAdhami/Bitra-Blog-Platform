/**
 * static/js/register.js
 * API: POST /api/accounts/register/  { username, email, full_name, password }
 *
 * NOTE: UserRegisterSerializer only accepts a single `password` field
 * (no password confirmation server-side), so password-match checking is
 * done client-side before submission, then only `password` is sent.
 * On success we log the user in automatically via /api/accounts/login/
 * since register does not itself return tokens.
 */

document.addEventListener('DOMContentLoaded', function () {
    if (BitraAPI.isAuthenticated()) {
        window.location.href = '/dashboard/profile/';
        return;
    }

    const form = document.getElementById('registerForm');
    const submitBtn = document.getElementById('registerSubmitBtn');
    const passwordToggle = document.querySelector('.password-toggle');
    const passwordInput = document.getElementById('password');

    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', function () {
            passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
        });
    }

    const strengthBars = document.querySelectorAll('.password-strength .strength-bar');
    if (passwordInput && strengthBars.length) {
        passwordInput.addEventListener('input', function () {
            const score = passwordStrengthScore(passwordInput.value);
            strengthBars.forEach(function (bar, i) {
                bar.style.opacity = i < score ? '1' : '0.25';
            });
        });
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        clearErrors();

        const fullName = document.getElementById('full_name').value.trim();
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password1 = document.getElementById('password').value;
        const password2 = document.getElementById('confirm_password').value;
        const agreed = document.getElementById('agreeTerms').checked;

        let hasError = false;
        if (!fullName) { showError('fullName', 'Full name is required.'); hasError = true; }
        if (!username) { showError('username', 'Username is required.'); hasError = true; }
        if (!email) { showError('email', 'Email is required.'); hasError = true; }
        if (!password1) { showError('password1', 'Password is required.'); hasError = true; }
        if (password1 !== password2) { showError('password2', 'Passwords do not match.'); hasError = true; }
        if (!agreed) { BitraNotify.error('Please agree to the Terms of Service and Privacy Policy.'); hasError = true; }

        if (hasError) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';

        BitraAPI.post('/accounts/register/', {
            username: username,
            email: email,
            full_name: fullName,
            password: password1,
        }, { auth: false })
            .then(function () {
                BitraNotify.success('Account created! Signing you in...');
                return BitraAPI.post('/accounts/login/', { email, password: password1 }, { auth: false });
            })
            .then(function (data) {
                BitraAPI.setTokens({ access: data.access, refresh: data.refresh });
                BitraAPI.setCurrentUser(data.user);
                setTimeout(function () { window.location.href = '/dashboard/profile/'; }, 500);
            })
            .catch(function (err) {
                applyServerErrors(err);
            })
            .finally(function () {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Account';
            });
    });

    function passwordStrengthScore(pw) {
        let score = 0;
        if (pw.length >= 8) score++;
        if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
        if (/\d/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        return score;
    }

    function showError(fieldKey, message) {
        const group = document.getElementById(`${fieldKey}Group`);
        const errorBox = document.getElementById(`${fieldKey}Error`);
        if (!errorBox) return;
        errorBox.style.display = 'flex';
        errorBox.querySelector('span').textContent = message;
        if (group) group.classList.add('form-group--error');
    }

    function clearErrors() {
        ['fullName', 'username', 'email', 'password1', 'password2'].forEach(function (key) {
            const errorBox = document.getElementById(`${key}Error`);
            const group = document.getElementById(`${key}Group`);
            if (errorBox) errorBox.style.display = 'none';
            if (group) group.classList.remove('form-group--error');
        });
    }

    function applyServerErrors(err) {
        const data = err && err.data;
        if (data && typeof data === 'object') {
            const fieldMap = { username: 'username', email: 'email', full_name: 'fullName', password: 'password1' };
            let matched = false;
            Object.keys(fieldMap).forEach(function (apiField) {
                if (data[apiField]) {
                    const msg = Array.isArray(data[apiField]) ? data[apiField][0] : data[apiField];
                    showError(fieldMap[apiField], msg);
                    matched = true;
                }
            });
            if (matched) return;
        }
        BitraNotify.error(BitraAPI.extractErrorMessage(err));
    }
});
