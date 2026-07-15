from django.urls import path
from .views import RegisterCreateView, logout_view, LoginUserView, PasswordResetRequestView,VerifyCodeView,ResetPasswordView

app_name = 'accounts'
urlpatterns = [
    path('register/', RegisterCreateView.as_view(), name='register'),
    path('logout/', logout_view, name='logout'),
    path('login/', LoginUserView.as_view(), name='login'),
    path('forgot-password/', PasswordResetRequestView.as_view(), name='forgot_password'),
    path('verify-code/', VerifyCodeView.as_view(), name='verify_code' ),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),
]