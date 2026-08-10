from django.urls import path
from django.views.generic import TemplateView
from .views.HomeTemplateView import HomeTemplateView

app_name = 'blog'
urlpatterns = [
    path('', HomeTemplateView.as_view(), name='home'),
    path('articles/', TemplateView.as_view(template_name='blog/article_list.html'), name='article_list'),
    path('articles/<int:pk>/', TemplateView.as_view(template_name='blog/article_detail.html'), name='article_detail'),

    # Public profile
    path('profile/<str:slug>/', TemplateView.as_view(template_name='accounts/public_profile.html'), name='public_profile'),

    # API-driven auth pages (JWT). Kept at /auth/* so they don't collide with
    # the session-based server views under /accounts/*.
    path('auth/login/', TemplateView.as_view(template_name='accounts/login.html'), name='auth_login'),
    path('auth/register/', TemplateView.as_view(template_name='accounts/register.html'), name='auth_register'),
]
