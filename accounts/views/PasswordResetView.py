from accounts.forms import PasswordResetRequestForm
from accounts.services.password_reset import create_password_reset
from accounts.models import User, PasswordResetCode
from django.contrib.auth.forms import SetPasswordForm
from django.contrib.auth import login
from django.contrib.auth.views import FormView
from accounts.forms import VerifyCodeForm
from django.contrib import messages
from django.shortcuts import redirect
from django.utils import timezone
from accounts.services.otp import check_password


class PasswordResetRequestView(FormView):
    template_name = "accounts/forgot_password.html"
    form_class = PasswordResetRequestForm
    success_url = "/accounts/verify-code/"

    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            messages.info(request, "You are already logged in.")
            return redirect("blog:home")
        return super().dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        email = form.cleaned_data["email"]
        try:
            user = User.objects.get(email=email)
            create_password_reset(user)
            self.request.session["reset_email"] = email
        except User.DoesNotExist:
            pass

        messages.success(
            self.request,
            "If an account with this email exists, a verification code has been sent."
        )
        return super().form_valid(form)


class VerifyCodeView(FormView):
    template_name = "accounts/verify-code.html"
    form_class = VerifyCodeForm
    success_url = "/accounts/reset-password/"

    def dispatch(self, request, *args, **kwargs):
        if not request.session.get("reset_email"):
            messages.error(request, "Please request a password reset first.")
            return redirect("accounts:forgot-password")
        return super().dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        code = form.cleaned_data["code"]
        email = self.request.session.get("reset_email")

        try:
            reset_code = PasswordResetCode.objects.filter(
                user__email=email,
                is_used=False
            ).latest("created_at")

        except PasswordResetCode.DoesNotExist:
            messages.error(self.request, "Invalid verification code.")
            return self.form_invalid(form)


        if reset_code.expires_at < timezone.now():
            messages.error(self.request, "Verification code has expired.")
            return self.form_invalid(form)


        if not check_password(code, reset_code.code):
            reset_code.attempts += 1
            reset_code.save()
            messages.error(self.request, "Invalid verification code.")
            return self.form_invalid(form)


        self.request.session["password_reset_user"] = reset_code.user.id


        self.request.session.pop("reset_email", None)

        messages.success(self.request, "Verification successful.")
        return super().form_valid(form)


class ResetPasswordView(FormView):
    template_name = "accounts/reset-password.html"
    success_url = "/"

    def dispatch(self, request, *args, **kwargs):
        user_id = request.session.get("password_reset_user")
        if not user_id:
            messages.error(request, "Please verify your code first.")
            return redirect("accounts:forgot-password")
        return super().dispatch(request, *args, **kwargs)

    def get_form(self, form_class=None):
        user_id = self.request.session.get("password_reset_user")
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            self.request.session.pop("password_reset_user", None)
            return redirect("accounts:forgot-password")

        return SetPasswordForm(
            user=user,
            data=self.request.POST or None
        )

    def form_valid(self, form):
        user = form.user
        form.save()

        PasswordResetCode.objects.filter(
            user=user,
            is_used=False
        ).update(is_used=True)

        self.request.session.pop("password_reset_user", None)

        login(self.request, user)

        messages.success(self.request, "Your password has been changed successfully.")
        return super().form_valid(form)
