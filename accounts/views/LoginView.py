from django.contrib.auth.views import LoginView
from accounts.forms import LoginForm
from django.contrib import messages
from django.shortcuts import redirect


class LoginUserView(LoginView):
    template_name = 'accounts/login.html'
    form_class = LoginForm
    next_page = 'blog:home'

    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            messages.error(request, 'You are already logged in.')
            return redirect('blog:home')
        return super(LoginUserView, self).dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        messages.success(self.request, f'You are now logged in.')
        return super().form_valid(form)
