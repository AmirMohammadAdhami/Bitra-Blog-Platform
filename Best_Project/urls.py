"""
URL configuration for Best_Project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from django.views.generic import TemplateView
import accounts.urls as accounts_urls
from accounts.views.ProfileView import UserProfileEdit

urlpatterns = [
    path('jet/', include('jet.urls', 'jet')),
    path('jet/dashboard/', include('jet.dashboard.urls', 'jet-dashboard')),
    path('admin/', admin.site.urls),
    path('', include('blog.urls')),
    path('accounts/', include(accounts_urls)),
    path('api/', include('api.urls')),

    path('dashboard/profile/', UserProfileEdit.as_view(), name='dashboard_profile'),
    path('dashboard/likes/', TemplateView.as_view(template_name='dashboard/likes.html'), name='dashboard_likes'),
    path('dashboard/bookmarks/', TemplateView.as_view(template_name='dashboard/bookmarks.html'), name='dashboard_bookmarks'),
    path('dashboard/comments/', TemplateView.as_view(template_name='dashboard/my-comments.html'), name='dashboard_comments'),
    path('dashboard/author-request/', TemplateView.as_view(template_name='dashboard/author-request.html'), name='dashboard_author_request'),
    path('dashboard/author/', TemplateView.as_view(template_name='dashboard/author_dashboard.html'), name='dashboard_author'),

    # Writers' desk editor — compose (no id) and edit (with id). The template
    # reads the id from the URL; auth + is_author are enforced client-side by
    # dash_editor.js and server-side by the Article API.
    path('dashboard/write/', TemplateView.as_view(template_name='dashboard/article-editor.html'), name='dashboard_write'),
    path('dashboard/write/<int:pk>/', TemplateView.as_view(template_name='dashboard/article-editor.html'), name='dashboard_edit'),

    path("ckeditor/", include("ckeditor_uploader.urls")),
]

# Serve uploaded media (article covers, avatars) during development.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
