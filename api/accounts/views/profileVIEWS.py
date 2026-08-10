from django.utils import timezone
from django.db.models import Sum, Count, F, Q, Subquery, OuterRef
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication, BaseAuthentication

from accounts.models import Profile, AuthorRequest
from blog.models import Article

from api.accounts.serializers.profileSZR import ProfileSerializer, AuthorRequestSerializer


class ProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Profile.objects.filter(user=self.request.user)


    @action(detail=False, methods=['get'], permission_classes=[AllowAny],
             authentication_classes=[])
    def public(self, request):
        """Public profile lookup by slug or username."""
        slug = request.query_params.get('slug')
        username = request.query_params.get('username')
        if not slug and not username:
            return Response({'detail': 'slug or username parameter is required.'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            profile = Profile.objects.select_related('user').prefetch_related('social_links__platform')
            if slug:
                profile = profile.get(slug=slug)
            else:
                profile = profile.get(user__username=username)
        except Profile.DoesNotExist:
            return Response({'detail': 'Profile not found.'},
                            status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(profile)
        data = serializer.data

        # Strip sensitive fields from the public response
        if 'user' in data and isinstance(data['user'], dict):
            data['user'].pop('email', None)

        # Attach author stats if the user is an author
        user = profile.user
        if user.is_author:
            articles = Article.objects.filter(author=user)
            published = articles.filter(status=Article.Status.REVIEWED)
            totals = articles.aggregate(
                total_likes=Sum('likes'),
                total_views=Sum('views'),
            )
            data['author_stats'] = {
                'total_articles': published.count(),
                'likes': totals['total_likes'] or 0,
                'views': totals['total_views'] or 0,
            }
        else:
            data['author_stats'] = None

        return Response(data)


    @action(detail=False, methods=['get'],
             permission_classes=[AllowAny],
             authentication_classes=[])
    def popular_authors(self, request):
        """Top authors ranked by total article likes. Returns up to 4 authors
        with their profile data and aggregated like count."""
        limit = min(int(request.query_params.get('limit', 4)), 20)
        authors = (
            Profile.objects
            .filter(user__is_author=True)
            .select_related('user')
            .prefetch_related('social_links__platform')
        )

        # Annotate each author with total likes across their published articles
        author_likes = (
            Article.objects
            .filter(author=OuterRef('user'), status=Article.Status.REVIEWED)
            .values('author')
            .annotate(total=Sum('likes'))
            .values('total')[:1]
        )
        authors = authors.annotate(total_likes=Subquery(author_likes))
        authors = authors.filter(total_likes__isnull=False).order_by('-total_likes')[:limit]

        # Serialize using the existing ProfileSerializer
        from api.accounts.serializers.profileSZR import ProfileSerializer as PubSerializer
        serializer = PubSerializer(authors, many=True, context={'request': request})
        data = serializer.data

        # Strip emails and attach like counts
        for item in data:
            if 'user' in item and isinstance(item['user'], dict):
                item['user'].pop('email', None)

        return Response(data)


    @action(detail=False, methods=['get', 'put', 'patch'])
    def me(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
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

