from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from ..permissions import IsOwnerOrReadOnly
from accounts.models import Profile
from ..serializers.profile_image_SZR import ProfileImageSerializer


class ProfileImageViewSet(viewsets.ModelViewSet):
    """Upload or manage the caller's profile image."""
    queryset = Profile.objects.all()
    serializer_class = ProfileImageSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        return Profile.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
