from rest_framework import serializers

from accounts.models import Like, Bookmark


class LikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Like
        fields = ['id', 'user', 'article', 'created_at']
        read_only_fields = ['user', 'created_at']


class BookmarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bookmark
        fields = ['id', 'user', 'article', 'created_at']
        read_only_fields = ['user', 'created_at']
