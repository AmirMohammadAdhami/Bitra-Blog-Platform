from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

# Root API router.
#
# Blog endpoints  ->  /api/blog/...      (articles, categories, tags, comments)
# Account endpoints -> /api/accounts/... (login, register, likes, bookmarks, ...)
#
# NOTE: previously this file was an accidental duplicate of
# api/accounts/urls.py, which meant the blog endpoints were never reachable.
urlpatterns = [
    path('accounts/', include('api.accounts.urls')),
    path('blog/', include('api.blog.urls')),
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    # Optional UI:
    path('schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
