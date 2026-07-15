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