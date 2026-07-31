from django.urls import path
from django.views.generic import TemplateView
from .views.HomeTemplateView import HomeTemplateView

app_name = 'blog'
urlpatterns = [
    path('', HomeTemplateView.as_view(), name='home'),
    path('articles/', TemplateView.as_view(template_name='blog/article_list.html'), name='article_list'),
    path('articles/<int:pk>/', TemplateView.as_view(template_name='blog/article_detail.html'), name='article_detail'),
]