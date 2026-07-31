/**
 * static/js/forgot_password.js
 * API: POST /api/accounts/password-reset/request/  { email }
 * Passes email to the next step (verify-code) via sessionStorage.
 */

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('forgotPasswordForm');
    const submitBtn = document.getElementById('forgotSubmitBtn');

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        if (!email) {
            BitraNotify.error('Please enter your email address.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        BitraAPI.post('/accounts/password-reset/request/', { email }, { auth: false })
            .then(function (data) {
                sessionStorage.setItem('bitra_reset_email', email);
                BitraNotify.success(data.detail || 'If an account exists, a reset code has been sent.');
                setTimeout(function () { window.location.href = '/accounts/verify-code/'; }, 900);
            })
            .catch(function (err) {
                BitraNotify.error(BitraAPI.extractErrorMessage(err));
            })
            .finally(function () {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Reset Code';
            });
    });
});
