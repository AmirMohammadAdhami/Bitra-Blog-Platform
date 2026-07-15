from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.views import LogoutView
from django.shortcuts import redirect
from django.views.generic import CreateView
from .forms import RegisterForm
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
