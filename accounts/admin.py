from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin


from .models import (
    User,
    Profile,
    SocialPlatform,
    ProfileSocialLink,
    AuthorRequest,
    Like,
    Bookmark, PasswordResetCode,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        'username',
        'email',
        'full_name',
        'is_staff',
        'is_active',
    )

    list_filter = (
        'is_author',
        'is_staff',
        'is_active',
    )

    search_fields = (
        'username',
        'email',
    )

    ordering = ('username',)

    fieldsets = (
        (None, {
            'fields': (
                'username',
                'password',
            )
        }),
        ('Personal Information', {
            'fields': (
                'email',
                'full_name',
            )
        }),
        ('Permissions', {
            'fields': (
                'is_active',
                'is_staff',
                'is_superuser',
                'is_author',
                'groups',
                'user_permissions',
            )
        }),
        ('Important Dates', {
            'fields': (
                'last_login',
            )
        }),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'username',
                'email',
                'password1',
                'password2',
            )
        }),
    )


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'city',
        'country',
        'created_at',
    )

    search_fields = (
        'user__username',
        'user__email',
    )


@admin.register(SocialPlatform)
class SocialPlatformAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'base_url',
    )

    search_fields = (
        'name',
    )


@admin.register(ProfileSocialLink)
class ProfileSocialLinkAdmin(admin.ModelAdmin):
    list_display = (
        'profile',
        'platform',
        'username',
        'created_at',
    )

    list_filter = (
        'platform',
    )


@admin.register(AuthorRequest)
class AuthorRequestAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'status',
        'reviewed_by',
        'created_at',
        'reviewed_at',
    )

    list_filter = (
        'status',
    )

    search_fields = (
        'user__username',
        'user__email',
    )

    readonly_fields = (
        'created_at',
        'reviewed_at',
    )


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'article',
        'created_at',
    )

    search_fields = (
        'user__username',
        'article__title',
    )


@admin.register(Bookmark)
class BookmarkAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'article',
        'created_at',
    )

    search_fields = (
        'user__username',
        'article__title',
    )

@admin.register(PasswordResetCode)
class PasswordResetAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'code',
        'created_at',
    )
    list_filter = (
        'user',
    )