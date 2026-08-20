from django.views.generic import TemplateView


class PasswordResetRequestView(TemplateView):
    """Renders the forgot-password page shell (request handled by the API)."""
    template_name = "accounts/forgot_password.html"


class VerifyCodeView(TemplateView):
    """Renders the verify-code page shell (verification handled by the API)."""
    template_name = "accounts/verify-code.html"


class ResetPasswordView(TemplateView):
    """Renders the reset-password page shell (reset handled by the API)."""
    template_name = "accounts/reset-password.html"
