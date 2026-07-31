/**
 * static/js/reset_password.js
 * API: POST /api/accounts/password-reset/confirm/  { email, code, new_password }
 * Reads email + code from sessionStorage (set by the previous two steps).
 */

document.addEventListener('DOMContentLoaded', function () {
    const email = sessionStorage.getItem('bitra_reset_email');
    const code = sessionStorage.getItem('bitra_reset_code');

    if (!email || !code) {
        BitraNotify.error('Please start the password reset process again.');
        setTimeout(function () { window.location.href = '/accounts/forgot-password/'; }, 1200);
        return;
    }

    const form = document.getElementById('resetPasswordForm');
    const submitBtn = document.getElementById('resetSubmitBtn');

    document.querySelectorAll('.password-toggle').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const input = btn.parentElement.querySelector('input');
            if (input) input.type = input.type === 'password' ? 'text' : 'password';
        });
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const password1 = document.getElementById('new_password').value;
        const password2 = document.getElementById('confirm_password').value;

        if (password1.length < 8) {
            BitraNotify.error('Password must be at least 8 characters.');
            return;
        }
        if (password1 !== password2) {
            BitraNotify.error('Passwords do not match.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Resetting...';

        BitraAPI.post('/accounts/password-reset/confirm/', {
            email: email,
            code: code,
            new_password: password1,
        }, { auth: false })
            .then(function (data) {
                sessionStorage.removeItem('bitra_reset_email');
                sessionStorage.removeItem('bitra_reset_code');
                BitraNotify.success(data.detail || 'Your password has been reset. Please log in.');
                setTimeout(function () { window.location.href = '/accounts/login/'; }, 900);
            })
            .catch(function (err) {
                BitraNotify.error(BitraAPI.extractErrorMessage(err));
            })
            .finally(function () {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Reset Password';
            });
    });
});
