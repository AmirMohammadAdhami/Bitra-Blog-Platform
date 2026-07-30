from rest_framework.routers import DefaultRouter
from api.blog.views import (articleVIEWS, categoryVIEWS, tagVIEWS, commentVIEWS)

router = DefaultRouter()
router.register(r'articles', articleVIEWS.ArticleViewSet, basename='article')
router.register(r'categories', categoryVIEWS.CategoryViewSet, basename='category')
router.register(r'tags', tagVIEWS.TagViewSet, basename='tag')
router.register(r'comments', commentVIEWS.CommentViewSet, basename='comment')


urlpatterns = router.urls