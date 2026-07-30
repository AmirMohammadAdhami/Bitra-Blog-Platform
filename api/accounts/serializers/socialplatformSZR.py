from rest_framework import serializers

from accounts.models import SocialPlatform, ProfileSocialLink


class SocialPlatformSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialPlatform
        fields = ['id', 'name', 'icon', 'base_url']


class SocialPlatformLinkSerializer(serializers.ModelSerializer):
    platform_detail = SocialPlatformSerializer(source='platform', read_only=True)
    url = serializers.ReadOnlyField()

    class Meta:
        model = ProfileSocialLink
        fields = ['id', 'platform', 'platform_detail', 'username', 'url']

