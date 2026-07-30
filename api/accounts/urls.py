from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.profileVIEWS import ProfileViewSet, AuthorRequestViewSet
from .views.userVIEWS import RegisterView
from .views.passwordVIEWS import PasswordResetRequestAPIView,PasswordResetVerifyAPIView,PasswordResetConfirmAPIView
from .views.likebookmarkVIEWS import LikeViewSet,BookmarkViewSet
from .views.socialplatformVIEWS import SocialPlatformViewSet,SocialPlatformLinkViewSet

router = DefaultRouter()
router.register(r'profiles', ProfileViewSet, basename='profile')
router.register(r'social-platforms', SocialPlatformViewSet, basename='socialplatform')
router.register(r'social-links', SocialPlatformLinkViewSet, basename='sociallink')
router.register(r'author-requests', AuthorRequestViewSet, basename='authorrequest')
router.register(r'likes', LikeViewSet, basename='like')
router.register(r'bookmarks', BookmarkViewSet, basename='bookmark')
# router.register(r'register', RegisterView, basename='register')

urlpatterns = [
    path('password-reset/request/', PasswordResetRequestAPIView.as_view(), name='api_password_reset_request'),
    path('password-reset/verify/', PasswordResetVerifyAPIView.as_view(), name='api_password_reset_verify'),
    path('password-reset/confirm/', PasswordResetConfirmAPIView.as_view(), name='api_password_reset_confirm'),
    path('register/', RegisterView.as_view(), name='api_register'),
    path('', include(router.urls)),
]
