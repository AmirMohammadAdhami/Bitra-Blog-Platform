from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils.translation import gettext_lazy as _
from django_countries.fields import CountryField


# Base User Model and Base User Manager --------------- 1 ---------------
class UserManager(BaseUserManager):
    def create_user(self, email, username, password=None, **extra_fields):
        if not username:
            raise ValueError(_('Users must have username'))
        if not email:
            raise ValueError(_('Users must have email'))

        user = self.model(email=self.normalize_email(email),username=username,  **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self.create_user(email, username, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=30, unique=True, db_index=True)
    email = models.EmailField(unique=True, db_index=True)
    full_name = models.CharField(max_length=100)
    is_author = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_verify = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    objects = UserManager()

    def __str__(self):
        return self.username


# Profile Model
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    profile_image = models.ImageField(upload_to='profile_images', null=True, blank=True)
    city = models.CharField(max_length=50, null=True, blank=True)
    country = CountryField(blank_label='Select your country', null=True, blank=True)
    bio = models.TextField(null=True, blank=True)
    slug = models.SlugField(max_length=100, unique=True, null=True, blank=True, allow_unicode=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return self.user.username


# SocialPlatform Model
class SocialPlatform(models.Model):
    name = models.CharField(max_length=50)
    icon = models.ImageField(upload_to='social_platform')
    base_url = models.URLField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


# ProfileSocialLink model
class ProfileSocialLink(models.Model):
    profile = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name='social_links'
    )

    platform = models.ForeignKey(
        SocialPlatform,
        on_delete=models.CASCADE
    )

    username = models.CharField(max_length=100)

    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def url(self):
        return f"{self.platform.base_url}{self.username}"

    def __str__(self):
        return f"{self.profile.user.username} - {self.platform.name}"


# dashboard request model
class AuthorRequest(models.Model):

    class Status(models.TextChoices):
        PENDING = "PENDING", 'Pending'
        APPROVED = "APPROVED", 'Approved'
        REJECTED = "REJECTED", 'Rejected'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='author_request')
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )
    reviewed_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_requests',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    def __str__(self):
        return self.user.username


class Like(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    article = models.ForeignKey(
        'blog.Article',
        on_delete=models.CASCADE
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'article'],
                name='unique_article_like'
            )
        ]


class Bookmark(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    article = models.ForeignKey('blog.Article', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'article'],
                name='unique_article_bookmark'
            )
        ]


class PasswordResetCode(models.Model):
    MAX_ATTEMPTS = 5

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='password_reset_codes'
    )

    code = models.CharField(
        max_length=6
    )

    attempts = models.PositiveSmallIntegerField(default=0)

    is_used = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    expires_at = models.DateTimeField()

    @property
    def is_locked(self):
        return self.attempts >= self.MAX_ATTEMPTS

    def __str__(self):
        return f"{self.user.email} - {self.code}"