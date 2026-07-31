/**
 * static/js/login.js
 * API: POST /api/accounts/login/  { email, password } -> { access, refresh, user }
 */

document.addEventListener('DOMContentLoaded', function () {
    // If already logged in, skip the login page.
    if (BitraAPI.isAuthenticated()) {
        window.location.href = '/dashboard/profile/';
        return;
    }

    const form = document.getElementById('loginForm');
    const submitBtn = document.getElementById('loginSubmitBtn');
    const passwordToggle = document.querySelector('.password-toggle');
    const passwordInput = document.getElementById('password');

    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', function () {
            passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
        });
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            BitraNotify.error('Please enter your email and password.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing In...';

        BitraAPI.post('/accounts/login/', { email, password }, { auth: false })
            .then(function (data) {
                BitraAPI.setTokens({ access: data.access, refresh: data.refresh });
                BitraAPI.setCurrentUser(data.user);
                BitraNotify.success('Welcome back!');
                setTimeout(function () { window.location.href = '/dashboard/profile/'; }, 500);
            })
            .catch(function (err) {
                BitraNotify.error(BitraAPI.extractErrorMessage(err));
            })
            .finally(function () {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign In';
            });
    });
});
