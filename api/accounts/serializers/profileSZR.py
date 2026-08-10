from rest_framework import serializers

from accounts.models import Profile, AuthorRequest
from .userSZR import UserMinimalSerializer
from .socialplatformSZR import SocialPlatformLinkSerializer


class ProfileSerializer(serializers.ModelSerializer):
    user = UserMinimalSerializer(read_only=True)
    # Model related_name is `social_links`; expose it under the `social_link`
    # key the API already advertises (without `source` this raised AttributeError).
    social_link = SocialPlatformLinkSerializer(source='social_links', many=True, read_only=True)
    country_name = serializers.CharField(source='country.name', read_only=True)

    class Meta:
        model = Profile
        fields = ['id', 'user', 'profile_image', 'city', 'country', 'country_name', 'bio', 'slug', 'social_link', 'created_at']
        read_only_fields = ['slug', 'created_at']


class AuthorRequestSerializer(serializers.ModelSerializer):
    user = UserMinimalSerializer(read_only=True)
    reviewed_by = UserMinimalSerializer(read_only=True)
    class Meta:
        model = AuthorRequest
        fields = ['id', 'user', 'status', 'reviewed_by', 'reviewed_at', 'created_at']
        read_only_fields = ['status','reviewed_by','created_at', 'reviewed_at']