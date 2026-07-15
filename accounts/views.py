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
            messages.info(request, "You are already logged in.")
            return redirect("blog:home")
        return super().dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        email = form.cleaned_data["email"]
        try:
            user = User.objects.get(email=email)
            create_password_reset(user)
            # ذخیره ایمیل در سشن برای مرحله بعد
            self.request.session["reset_email"] = email
        except User.DoesNotExist:
            # برای امنیت بیشتر، حتی اگر ایمیل وجود نداشت پیغام موفقیت نشان می‌دهیم
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
        # اگر ایمیلی در سشن نباشد، یعنی کاربر از مرحله اول عبور نکرده است
        if not request.session.get("reset_email"):
            messages.error(request, "Please request a password reset first.")
            return redirect("accounts:forgot-password")  # نام روت فراموشی رمز عبور خود را جایگزین کنید
        return super().dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        code = form.cleaned_data["code"]
        email = self.request.session.get("reset_email")

        try:
            # فیلتر کردن بر اساس کاربر صاحب ایمیل
            reset_code = PasswordResetCode.objects.filter(
                user__email=email,
                is_used=False
            ).latest("created_at")

        except PasswordResetCode.DoesNotExist:
            messages.error(self.request, "Invalid verification code.")
            return self.form_invalid(form)

        # بررسی منقضی شدن کد
        if reset_code.expires_at < timezone.now():
            messages.error(self.request, "Verification code has expired.")
            return self.form_invalid(form)

        # بررسی صحت OTP (استفاده از تابع کمکی خودتان)
        if not check_password(code, reset_code.code):
            reset_code.attempts += 1
            reset_code.save()
            messages.error(self.request, "Invalid verification code.")
            return self.form_invalid(form)

        # موفقیت آمیز بود: ذخیره آیدی کاربر در سشن برای مرحله نهایی
        self.request.session["password_reset_user"] = reset_code.user.id

        # پاک کردن ایمیل موقت از سشن
        self.request.session.pop("reset_email", None)

        messages.success(self.request, "Verification successful.")
        return super().form_valid(form)


class ResetPasswordView(FormView):
    template_name = "accounts/reset-password.html"
    success_url = "/" # یا صفحه لاگین

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
            # مدیریت خطای ناگهانی پاک شدن کاربر از دیتابیس
            self.request.session.pop("password_reset_user", None)
            return redirect("accounts:forgot-password")

        return SetPasswordForm(
            user=user,
            data=self.request.POST or None
        )

    def form_valid(self, form):
        user = form.user
        form.save()

        # باطل کردن تمامی کدهای قبلی این کاربر
        PasswordResetCode.objects.filter(
            user=user,
            is_used=False
        ).update(is_used=True)

        # پاک کردن سشن امنیتی
        self.request.session.pop("password_reset_user", None)

        # لاگین خودکار کاربر
        login(self.request, user)

        messages.success(self.request, "Your password has been changed successfully.")
        return super().form_valid(form)