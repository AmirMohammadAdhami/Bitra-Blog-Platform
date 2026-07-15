from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.forms.models import ModelForm
from django.contrib.auth.forms import AuthenticationForm
from .models import User


class RegisterForm(UserCreationForm):
    class Meta:
        model = User
        fields = [
            'full_name',
            'username',
            'email',
        ]

class LoginForm(AuthenticationForm):
    username = forms.EmailField(
        label = 'Email',
        widget = forms.EmailInput(attrs={'class':'form-input', 'placeholder':'Enter your Email Address'}),
    )