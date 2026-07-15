from django import forms
from django.contrib.auth.forms import UserCreationForm
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

class PasswordResetRequestForm(forms.Form):
    email = forms.EmailField(
        label='Email Address',
        widget=forms.EmailInput(
            attrs={
                'class': 'form-input',
                'placeholder': 'you@example.com'
            }
        )
    )

class VerifyCodeForm(forms.Form):
    code = forms.CharField(
        max_length=6,
        min_length=6,
        label='Verification Code',
        widget=forms.TextInput(
            attrs={
                'class': 'form-input',
                'placeholder': 'Enter verification code'
            }
        )
    )