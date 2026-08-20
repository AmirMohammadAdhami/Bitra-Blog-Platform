from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from django.views.generic import TemplateView
import accounts.urls as accounts_urls
from blog.views.custom_404 import custom_404
from blog.sitemaps import ArticleSitemap
from django.contrib.sitemaps.views import sitemap
from Security.ckeditor import check_image_file

sitemaps = {
    'articles': ArticleSitemap,
}

handler404 = custom_404

urlpatterns = [

    # ADMIN PAGE , jet is a custom ui for admin page
    path('jet/', include('jet.urls', 'jet')),
    path('jet/dashboard/', include('jet.dashboard.urls', 'jet-dashboard')),
    path('admin/', admin.site.urls),

    # Blog Urls, with these pages:
    # Home
    # Articles List
    # Article Detail
    # Public Profile
    # JWT Token login and register
    path('', include('blog.urls')),

    # Account Urls, with these pages:
    # login
    # resister
    # logout
    # Profile Edit
    path('accounts/', include(accounts_urls)),

    # API Urls
    path('api/', include('api.urls')),

    # Ckeditor(A text editor) url
    path("ckeditor/", include("ckeditor_uploader.urls")),
    path("ckeditor/upload/", check_image_file),

    # Sitemap and robots.txt urls
    path('sitemap.xml',
         sitemap,
         {"sitemaps": sitemaps},
         name="django-sitemap"),
    path('robots.txt', TemplateView.as_view(template_name='robots.txt', content_type='text/plain'), name='robots'),
]

# Serve uploaded media (article covers, avatars) during development.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
