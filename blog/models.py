from django.db import models
from django.db.models.fields import PositiveIntegerField

from accounts.models import User


# Create your models here.

# Category Model
class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)

    def __str__(self):
        return self.name


class Tag(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)

    def __str__(self):
        return self.name


class ArticleView(models.Model):
    article = models.ForeignKey(
        'Article',
        on_delete=models.CASCADE
    )

    ip_address = models.GenericIPAddressField()

    created_at = models.DateTimeField(
        auto_now_add=True
    )


class Article(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", 'Draft'
        SUBMITTED = "SUBMITTED", 'Submitted'
        REVIEWED = "REVIEWED", 'Reviewed'
        REJECTED = "REJECTED", 'Rejected'

    title = models.CharField(max_length=200)
    summary = models.TextField()
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    content = models.TextField()
    tags = models.ManyToManyField(Tag)
    category = models.ForeignKey(Category, on_delete=models.PROTECT)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    likes = PositiveIntegerField(default=0)
    views = models.PositiveIntegerField(default=0)
    bookmarks = models.PositiveIntegerField(default=0)
    comments = models.ForeignKey(None, on_delete=models.DO_NOTHING)


class Comment(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", 'Pending'
        APPROVED = "APPROVED", 'Approved'
        REJECTED = "REJECTED", 'Rejected'

    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    article = models.ForeignKey(Article, on_delete=models.CASCADE, null=True)
    content = models.TextField()
    status = models.CharField(
        max_length=25,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    likes = PositiveIntegerField(default=0)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        related_name='children',
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class CommentLike(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        related_name='likes'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'comment'],
                name='unique_comment_like'
            )
        ]
