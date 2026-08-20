from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ReadOnlyModelViewSet, ModelViewSet

from accounts.models import SocialPlatform, ProfileSocialLink, Profile
from ..serializers.socialplatformSZR import SocialPlatformSerializer, SocialPlatformLinkSerializer


class SocialPlatformViewSet(ReadOnlyModelViewSet):
    """Read-only list of available social platforms."""
    queryset = SocialPlatform.objects.all()
    serializer_class = SocialPlatformSerializer
    permission_classes = [IsAuthenticated]


class SocialPlatformLinkViewSet(ModelViewSet):
    """Manage the caller's social links."""
    serializer_class = SocialPlatformLinkSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ProfileSocialLink.objects.filter(profile__user=self.request.user)

    def perform_create(self,serializer):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        serializer.save(profile=profile)

