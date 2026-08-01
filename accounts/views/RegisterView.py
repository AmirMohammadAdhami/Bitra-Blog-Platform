from django.views.generic import CreateView
from django.contrib import messages
from django.shortcuts import redirect
from accounts.forms import RegisterForm
from accounts.models import User
from django.contrib.auth import login, logout


class RegisterCreateView(CreateView):
    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            if not request.user.is_superuser:
                messages.error(request, 'You are already registered.')
                return redirect('blog:home')
        return super(RegisterCreateView, self).dispatch(request, *args, **kwargs)

    form_class = RegisterForm
    model = User
    template_name = 'accounts/register.html'
    success_url = '/'
    redirect_authenticated_user = False

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
