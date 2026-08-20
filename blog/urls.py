from django.urls import path
from django.views.generic import TemplateView
from .views.HomeTemplateView import HomeTemplateView
from .views.ArticleDetailView import ArticleDetailView
from .views.ArticleListView import ArticleListView
from .views.PublicProfileView import PublicProfileView

app_name = 'blog'
urlpatterns = [
    path('', HomeTemplateView.as_view(), name='home'),
    path('articles/', ArticleListView.as_view(), name='article_list'),
    path('articles/<int:pk>/', ArticleDetailView.as_view(), name='article_detail'),
    
    path('profile/<str:slug>/', PublicProfileView.as_view(), name='public_profile'),

    # API-driven auth pages (JWT). Kept at /auth/* so they don't collide with
    # the session-based server views under /accounts/*.
    path('auth/login/', TemplateView.as_view(template_name='accounts/login.html'), name='auth_login'),
    path('auth/register/', TemplateView.as_view(template_name='accounts/register.html'), name='auth_register'),
]
