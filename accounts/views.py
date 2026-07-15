from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.views import LoginView
from django.shortcuts import redirect
from django.views.generic import CreateView
from .forms import RegisterForm, LoginForm
from .models import User

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


