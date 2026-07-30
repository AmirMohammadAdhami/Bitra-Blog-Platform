from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.models import Profile, AuthorRequest

from api.accounts.serializers.profileSZR import ProfileSerializer, AuthorRequestSerializer


class ProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Profile.objects.filter(user=self.request.user)


    @action(detail=False ,methods=['get', 'put', 'patch'])
    def me(self, request):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        if request.method == 'GET':
            serializer = self.get_serializer(profile)
            return Response(serializer.data)

        serializer = self.get_serializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AuthorRequestViewSet(viewsets.ModelViewSet):
    serializer_class = AuthorRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return AuthorRequest.objects.all()
        return AuthorRequest.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        if AuthorRequest.objects.filter(user=self.request.user,status=AuthorRequest.Status.PENDING).exists():
            return Response({'detail':'You have a request btw please wait'},
                            status=status.HTTP_400_BAD_REQUEST)
        author_request = AuthorRequest.objects.create(user=self.request.user)
        serializer = self.get_serializer(author_request)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        author_req = self.get_object()
        author_req.status = AuthorRequest.Status.APPROVED
        author_req.reviewed_by = request.user
        author_req.reviewed_at = timezone.now()
        author_req.save()

        author_req.user.is_author = True
        author_req.user.save()

        return Response({'status':'you are approved'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def decline(self, request, pk=None):
        author_req = self.get_object()
        author_req.status = AuthorRequest.Status.REJECTED
        author_req.reviewed_by = request.user
        author_req.reviewed_at = timezone.now()
        author_req.save()

        return Response({'status':'you are declined'})

