/**
 * static/js/verify_code.js
 * API: POST /api/accounts/password-reset/verify/  { email, code }
 * Reads email from sessionStorage (set by forgot_password.js), and passes
 * both email + code forward to reset-password.js via sessionStorage.
 */

document.addEventListener('DOMContentLoaded', function () {
    const email = sessionStorage.getItem('bitra_reset_email');
    if (!email) {
        BitraNotify.error('Please start the password reset process again.');
        setTimeout(function () { window.location.href = '/accounts/forgot-password/'; }, 1200);
        return;
    }

    const form = document.getElementById('verifyCodeForm');
    const submitBtn = document.getElementById('verifySubmitBtn');

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const code = document.getElementById('verification_code').value.trim();
        if (!/^\d{6}$/.test(code)) {
            BitraNotify.error('Please enter the 6-digit code sent to your email.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';

        BitraAPI.post('/accounts/password-reset/verify/', { email, code }, { auth: false })
            .then(function () {
                sessionStorage.setItem('bitra_reset_code', code);
                BitraNotify.success('Code verified! Set your new password.');
                setTimeout(function () { window.location.href = '/accounts/reset-password/'; }, 700);
            })
            .catch(function (err) {
                BitraNotify.error(BitraAPI.extractErrorMessage(err));
            })
            .finally(function () {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Verify Code';
            });
    });
});
