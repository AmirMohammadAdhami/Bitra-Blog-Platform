from blog.models import Article, Comment, Tag
from rest_framework import serializers
from django.utils.text import slugify
from .categorySZR import CategorySerializer
from .tagSZR import TagSerializer
from .commentSZR import CommentSerializer
from Security.image_process import validate_type_image, validate_volume_image, process_post_banner
from Security.sanitizer import sanitize

class ArticleListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    author_name = serializers.ReadOnlyField(source='author.username')
    author_slug = serializers.SerializerMethodField()

    def get_author_slug(self, obj):
        profile = getattr(obj.author, 'profile', None)
        return profile.slug if profile else None

    class Meta:
        model = Article
        fields = ['id', 'title', 'summary', 'cover_image', 'category', 'tags', 'author_name', 'author_slug', 'status',
                  'likes', 'views', 'created_at']


class ArticleDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    author_name = serializers.ReadOnlyField(source='author.username')
    author_slug = serializers.SerializerMethodField()
    approved_comments = serializers.SerializerMethodField(read_only=True)

    def get_author_slug(self, obj):
        profile = getattr(obj.author, 'profile', None)
        return profile.slug if profile else None

    class Meta:
        model = Article
        fields = ['id', 'title', 'summary', 'content', 'cover_image', 'category', 'tags', 'author_name', 'author_slug',
                  'status', 'likes', 'views', 'approved_comments', 'created_at', 'updated_at']

    def get_approved_comments(self, obj):
        comments = obj.comment_set.filter(status=Comment.Status.APPROVED, parent__isnull=True)
        return CommentSerializer(comments, many=True).data


class ArticleWriteSerializer(serializers.ModelSerializer):
    """For create/update — author can write title, body, category, tags, and
    cover. Status is managed separately via submit/withdraw actions and the
    admin; the author can't publish directly."""

    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        write_only=True,
    )
    cover_image = serializers.ImageField(validators=[validate_volume_image, validate_type_image])

    class Meta:
        model = Article
        fields = ['id', 'title', 'summary', 'content', 'category', 'tags',
                  'cover_image', 'status', 'author', 'likes', 'views',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'status', 'author', 'likes', 'views',
                            'created_at', 'updated_at']

    def validate_cover_image(self, file):
        return process_post_banner(file)

    def _resolve_tags(self, tag_names):
        """Turn a list of tag name strings into Tag instances, creating any
        that don't exist yet."""
        tags = []
        for name in tag_names:
            name = name.strip()
            if not name:
                continue
            slug = slugify(name, allow_unicode=True)
            tag, _ = Tag.objects.get_or_create(slug=slug, defaults={'name': name})
            tags.append(tag)
        return tags

    def create(self, validated_data):
        tag_names = validated_data.pop('tags', [])
        article = Article.objects.create(**validated_data)
        article.tags.set(self._resolve_tags(tag_names))
        return article

    def update(self, instance, validated_data):
        tag_names = validated_data.pop('tags', [])
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        instance.tags.set(self._resolve_tags(tag_names))
        return instance

    def validate_content(self, value):
        return sanitize(value)