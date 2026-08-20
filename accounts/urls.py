from django.urls import path
from .views.LogoutView import *
from .views.RegisterView import *
from .views.PasswordResetView import *
from .views.LoginView import *
from .views.ProfileView import *

app_name = 'accounts'
urlpatterns = [
    # the authentications Templates and views
    path('register/', RegisterCreateView.as_view(), name='register'),
    path('logout/', logout_view, name='logout'),
    path('login/', LoginUserView.as_view(), name='login'),

    # forgot password templates and views with email
    path('forgot-password/', PasswordResetRequestView.as_view(), name='forgot_password'),
    path('verify-code/', VerifyCodeView.as_view(), name='verify_code' ),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),

    # profile urls
    path('profile/<str:slug>/', UserProfileEdit.as_view(), name='profile-edit'),
    path('dashboard/profile/', UserProfileEdit.as_view(), name='dashboard_profile'),
    path('dashboard/likes/', TemplateView.as_view(template_name='dashboard/likes.html'), name='dashboard_likes'),
    path('dashboard/bookmarks/', TemplateView.as_view(template_name='dashboard/bookmarks.html'),
         name='dashboard_bookmarks'),
    path('dashboard/comments/', TemplateView.as_view(template_name='dashboard/my-comments.html'),
         name='dashboard_comments'),
    path('dashboard/author-request/', TemplateView.as_view(template_name='dashboard/author-request.html'),
         name='dashboard_author_request'),
    path('dashboard/author/', TemplateView.as_view(template_name='dashboard/author_dashboard.html'),
         name='dashboard_author'),
    path('dashboard/write/', TemplateView.as_view(template_name='dashboard/article-editor.html'),
         name='dashboard_write'),
    path('dashboard/write/<int:pk>/', TemplateView.as_view(template_name='dashboard/article-editor.html'),
         name='dashboard_edit'),
]