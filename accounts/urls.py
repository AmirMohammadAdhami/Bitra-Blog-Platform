from django.contrib.auth.views import LoginView
from django.urls import path
from .views import RegisterCreateView, logout_view, LoginUserView

app_name = 'accounts'
urlpatterns = [
    path('register/', RegisterCreateView.as_view(), name='register'),
    path('logout/', logout_view, name='logout'),
    path('login/', LoginUserView.as_view(), name='login'),
]