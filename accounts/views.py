from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.views import LoginView, FormView
from django.shortcuts import redirect
from django.views.generic import CreateView
from .forms import RegisterForm, LoginForm, PasswordResetRequestForm, VerifyCodeForm
from .models import User, PasswordResetCode
from .services.password_reset import create_password_reset
from .services.otp import check_password
from django.utils import timezone
from django.contrib.auth.forms import SetPasswordForm




# Create your views here.
class RegisterCreateView(CreateView):
    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            messages.error(request, 'You are already registered.')
            return redirect('blog:home')
        return super(RegisterCreateView, self).dispatch(request, *args, **kwargs)
    form_class = RegisterForm
    model = User
    template_name = 'accounts/register.html'
    success_url = '/'
    def form_valid(self, form):
        response = super().form_valid(form)
        print(self.object)
        print(type(self.object))
        login(self.request, self.object)
        messages.success(
            self.request,
            "Your account has been created successfully."
        )
        return response

    def form_invalid(self, form):
        messages.error(
            self.request,
            "Please fix the errors below."
        )
        return super().form_invalid(form)

def logout_view(request):
    if request.user.is_authenticated:
        logout(request)
        messages.success(request, 'You are now logged out.')
        return redirect('blog:home')
    else:
        messages.error(request, 'You are not logged in.')
        return redirect('accounts:login')


class LoginUserView(LoginView):
    template_name = 'accounts/login.html'
    form_class = LoginForm
    next_page = 'blog:home'
    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            messages.error(request, 'You are already logged in.')
            return redirect('blog:home')
        return super(LoginUserView, self).dispatch(request, *args, **kwargs)

    def form_valid(self ,form):
        messages.success(self.request, f'You are now logged in.')
        return super().form_valid(form)


class PasswordResetRequestView(FormView):
    template_name = "accounts/forgot_password.html"
    form_class = PasswordResetRequestForm
    success_url = "/accounts/verify-code/"


    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            messages.info(
                request,
                "You are already logged in."
            )
            return redirect("blog:home")

        return super().dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        print("FORM VALID")

        email = form.cleaned_data["email"]
        print(email)
        try:
            user = User.objects.get(email=email)

            create_password_reset(user)

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

    def form_valid(self, form):
        code = form.cleaned_data["code"]

        try:
            reset_code = PasswordResetCode.objects.filter(
                is_used=False
            ).latest("created_at")

        except PasswordResetCode.DoesNotExist:
            messages.error(
                self.request,
                "Invalid verification code."
            )
            return redirect("accounts:verify-code")

        # Check expiration
        if reset_code.expires_at < timezone.now():
            messages.error(
                self.request,
                "Verification code has expired."
            )
            return redirect("accounts:verify-code")

        # Check OTP
        if not check_password(code, reset_code.code):
            reset_code.attempts += 1
            reset_code.save()

            messages.error(
                self.request,
                "Invalid verification code."
            )

            return redirect("accounts:verify-code")


        # Save user in session
        self.request.session["password_reset_user"] = reset_code.user.id


        messages.success(
            self.request,
            "Verification successful."
        )

        return super().form_valid(form)


class ResetPasswordView(FormView):
    template_name = "accounts/reset-password.html"
    success_url = "/"

    def dispatch(self, request, *args, **kwargs):
        user_id = request.session.get("password_reset_user")

        if not user_id:
            messages.error(
                request,
                "Please verify your code first."
            )
            return redirect("accounts:forgot-password")

        return super().dispatch(request, *args, **kwargs)


    def get_form(self, form_class=None):
        user_id = self.request.session.get(
            "password_reset_user"
        )

        user = User.objects.get(id=user_id)

        return SetPasswordForm(
            user=user,
            data=self.request.POST or None
        )


    def form_valid(self, form):
        user = form.user

        form.save()

        # Mark OTP as used
        PasswordResetCode.objects.filter(
            user=user,
            is_used=False
        ).update(
            is_used=True
        )

        # Remove session
        self.request.session.pop(
            "password_reset_user",
            None
        )

        # Login user after password change
        login(
            self.request,
            user
        )

        messages.success(
            self.request,
            "Your password has been changed successfully."
        )

        return super().form_valid(form)