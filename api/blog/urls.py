from rest_framework.routers import DefaultRouter
from api.blog.views import (articleVIEWS)

router = DefaultRouter()
router.register('articles', articleVIEWS.ArticleViewSet, basename='articles')

urlpatterns = router.urls