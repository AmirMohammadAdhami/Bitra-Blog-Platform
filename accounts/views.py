from django.contrib import messages
from django.views.generic import CreateView
from .forms import RegisterForm
from .models import User

# Create your views here.
class RegisterCreateView(CreateView):
    form_class = RegisterForm
    model = User
    template_name = 'accounts/register.html'
    success_url = '/'
    def form_valid(self, form):
        messages.success(
            self.request,
            "Your account has been created successfully."
        )
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(
            self.request,
            "Please fix the errors below."
        )
        return super().form_invalid(form)