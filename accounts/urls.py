
from django.urls import path
from .views import RegisterCreateView, logout_view

app_name = 'accounts'
urlpatterns = [
    path('register/', RegisterCreateView.as_view(), name='register'),
    path('logout/', logout_view, name='logout'),
]