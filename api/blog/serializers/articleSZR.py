from blog.models import Article
from rest_framework import serializers
from .categorySZR import CategorySerializer
from .tagSZR import TagSerializer
from blog.models import Comment
from .commentSZR import CommentSerializer

class ArticleListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    author_name = serializers.ReadOnlyField(source='author.username')

    class Meta:
        model = Article
        fields = ['id', 'title', 'summary', 'category', 'tags', 'author_name','status', 'likes', 'views', 'created_at']



class ArticleDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    author_name = serializers.ReadOnlyField(source='author.username')
    approved_comments = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Article
        fields = ['id', 'title', 'summary','content', 'category', 'tags', 'author_name','status', 'likes', 'views','approved_comments', 'created_at', 'updated_at']

    def get_approved_comments(self, obj):
        comments = obj.comment_set.filter(status=Comment.Status.APPROVED, parent__isnull=True)
        return CommentSerializer(comments, many=True).data
