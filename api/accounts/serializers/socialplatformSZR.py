from rest_framework import serializers
from django.db import IntegrityError

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

    def validate(self, attrs):
        profile = getattr(self.context['request'].user, 'profile', None)
        if not profile:
            return attrs
        platform = attrs.get('platform')
        instance = getattr(self, 'instance', None)

        qs = ProfileSocialLink.objects.filter(profile=profile, platform=platform)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                {'platform': 'You already have a link for this platform.'}
            )
        return attrs

