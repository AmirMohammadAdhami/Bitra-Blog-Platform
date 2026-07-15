from django.urls import path
from .views import HomeTemplateView

app_name = 'blog'
urlpatterns = [
    path('', HomeTemplateView.as_view(), name='home'),
]