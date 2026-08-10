from rest_framework import serializers

from blog.models import Comment


class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.ReadOnlyField(source='author.username')
    article_title = serializers.ReadOnlyField(source='article.title')
    likes_count = serializers.IntegerField(source='likes.count', read_only=True)
    children = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'author', 'article', 'article_title', 'author_name', 'content', 'status', 'parent', 'children', 'likes_count', 'created_at']

    def get_children(self, obj):
        approved_children = obj.children.filter(status=Comment.Status.APPROVED)
        return CommentSerializer(approved_children, many=True).data

