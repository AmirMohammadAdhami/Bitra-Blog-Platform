from django.contrib import admin

from .models import (
    Category,
    Tag,
    Article,
    ArticleView,
    Comment,
    CommentLike,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'slug',
    )

    search_fields = (
        'name',
    )


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'slug',
    )

    search_fields = (
        'name',
    )


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):

    list_display = (
        'title',
        'author',
        'category',
        'status',
        'created_at',
    )

    list_filter = (
        'status',
        'category',
    )

    search_fields = (
        'title',
        'author__username',
        'content',
    )

    filter_horizontal = (
        'tags',
    )

    readonly_fields = (
        'likes',
        'views',
    )


@admin.register(ArticleView)
class ArticleViewAdmin(admin.ModelAdmin):

    list_display = (
        'article',
        'ip_address',
        'created_at',
    )

    search_fields = (
        'article__title',
        'ip_address',
    )


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):

    list_display = (
        'article',
        'author',
        'status',
        'parent',
        'created_at',
    )

    list_filter = (
        'status',
    )

    list_editable = ['status']

    search_fields = (
        'content',
        'author__username',
        'article__title',
    )


@admin.register(CommentLike)
class CommentLikeAdmin(admin.ModelAdmin):

    list_display = (
        'user',
        'comment',
        'created_at',
    )

    search_fields = (
        'user__username',
        'comment__content',
    )