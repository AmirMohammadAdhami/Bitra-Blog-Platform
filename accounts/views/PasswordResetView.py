from django.views.generic import TemplateView


class PasswordResetRequestView(TemplateView):
    """
    Renders the "forgot password" page shell. The actual request is now
    handled client-side by static/js/forgot_password.js, which calls
    POST /api/accounts/password-reset/request/. This view no longer
    processes a Django form or touches the session — see
    api/accounts/views/passwordVIEWS.py for the real logic.
    """
    template_name = "accounts/forgot_password.html"


class VerifyCodeView(TemplateView):
    """
    Renders the "verify code" page shell. Verification is handled
    client-side by static/js/verify_code.js, which calls
    POST /api/accounts/password-reset/verify/. The email/code are passed
    between steps via sessionStorage in the browser, not the Django
    session, so this view has no server-side guard.
    """
    template_name = "accounts/verify-code.html"


class ResetPasswordView(TemplateView):
    """
    Renders the "reset password" page shell. The reset itself is handled
    client-side by static/js/reset_password.js, which calls
    POST /api/accounts/password-reset/confirm/.
    """
    template_name = "accounts/reset-password.html"
