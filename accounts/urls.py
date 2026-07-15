from django.urls import path
from .views import RegisterCreateView

app_name = 'accounts'
urlpatterns = [
    path('register/', RegisterCreateView.as_view(), name='register'),
]