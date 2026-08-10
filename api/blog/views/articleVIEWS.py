from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ipware import get_client_ip
from api.blog.serializers.articleSZR import (
    ArticleListSerializer, ArticleDetailSerializer, ArticleWriteSerializer,
)
from api.blog.permissions import IsAuthorOwnerOrReadOnly
from blog.models import Article, ArticleView
from accounts.models import Like, Bookmark
from django.db.models import F, Q, Sum, Count
from rest_framework.decorators import action


class ArticleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthorOwnerOrReadOnly]

    # An author may keep editing only before an editor takes over.
    EDITABLE_STATUSES = {Article.Status.DRAFT, Article.Status.REJECTED}

    # Single-object actions that only ever touch the caller's own story.
    WRITE_OWN_ACTIONS = {'update', 'partial_update', 'destroy', 'submit', 'withdraw'}

    def get_queryset(self):
        base = Article.objects.select_related('category', 'author', 'author__profile').prefetch_related('tags')
        user = self.request.user

        # The author's own desk — every status they own.
        if self.action == 'mine':
            if not user.is_authenticated:
                return base.none()
            return base.filter(author=user).order_by('-updated_at')

        # Owner-only writes (edit / delete / submit / withdraw): scope the
        # lookup to the caller's own stories at any status, so get_object() can
        # actually find a draft. Without this these actions fall through to the
        # published-only filter below and 404 on every unpublished piece.
        if self.action in self.WRITE_OWN_ACTIONS and user.is_authenticated:
            return base.filter(author=user)

        # A signed-in reader may also open their own unpublished piece by id.
        if self.action == 'retrieve' and user.is_authenticated:
            return base.filter(Q(status=Article.Status.REVIEWED) | Q(author=user))

        # Public surface: only published (REVIEWED) stories. This closes the
        # prior leak where drafts/submissions were returned by the API and
        # only hidden client-side.
        qs = base.filter(status=Article.Status.REVIEWED)
        author_name = self.request.query_params.get('author_name')
        if author_name:
            qs = qs.filter(author__username=author_name)
        return qs

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ArticleWriteSerializer
        if self.action == 'retrieve':
            return ArticleDetailSerializer
        return ArticleListSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status not in self.EDITABLE_STATUSES:
            return Response(
                {'detail': 'This story is with the editors and can’t be edited. '
                           'Withdraw it first to keep working on it.'},
                status=status.HTTP_409_CONFLICT,
            )
        return super().update(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Only count a public read as a view — not an author previewing a draft.
        if instance.status == Article.Status.REVIEWED:
            ip_address, is_routable = get_client_ip(request)
            ArticleView.objects.create(article=instance, ip_address=ip_address)
            Article.objects.filter(pk=instance.pk).update(views=F('views') + 1)
        return super().retrieve(request, *args, **kwargs)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def mine(self, request):
        """The contributor's own stories across every status, newest edit
        first — powers the writers' desk."""
        articles = self.get_queryset()
        serializer = ArticleListSerializer(articles, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def submit(self, request, pk=None):
        """Author hands a draft to the editors: DRAFT/REJECTED → SUBMITTED."""
        article = self.get_object()
        if article.status not in self.EDITABLE_STATUSES:
            return Response({'detail': 'This story has already been submitted.'},
                            status=status.HTTP_409_CONFLICT)
        article.status = Article.Status.SUBMITTED
        article.save(update_fields=['status', 'updated_at'])
        return Response({'status': article.status})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def withdraw(self, request, pk=None):
        """Author pulls a pending story back to keep editing: SUBMITTED → DRAFT."""
        article = self.get_object()
        if article.status != Article.Status.SUBMITTED:
            return Response({'detail': 'Only a submitted story can be withdrawn.'},
                            status=status.HTTP_409_CONFLICT)
        article.status = Article.Status.DRAFT
        article.save(update_fields=['status', 'updated_at'])
        return Response({'status': article.status})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        """Toggle a like on a published story. Uses the Like model for
        per-user dedup so one reader can't inflate the counter.
        Any signed-in reader may like any published story; the class-level
        owner check is overridden here."""
        article = self.get_object()
        if article.status != Article.Status.REVIEWED:
            return Response(
                {'detail': 'You can only like published stories.'},
                status=status.HTTP_409_CONFLICT,
            )
        like_obj, created = Like.objects.get_or_create(
            user=request.user, article=article,
        )
        if not created:
            like_obj.delete()
            Article.objects.filter(pk=article.pk, likes__gt=0).update(likes=F('likes') - 1)
            article.refresh_from_db()
            return Response(
                {'status': 'unliked', 'likes': article.likes},
                status=status.HTTP_200_OK,
            )
        Article.objects.filter(pk=article.pk).update(likes=F('likes') + 1)
        article.refresh_from_db()
        return Response(
            {'status': 'liked', 'likes': article.likes},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def author_stats(self, request):
        """Aggregate stats for the current author's articles:
        total articles, published count, total likes, total views,
        and total bookmarks across all their articles."""
        user = request.user
        articles = Article.objects.filter(author=user)
        published = articles.filter(status=Article.Status.REVIEWED)
        
        totals = articles.aggregate(
            total_likes=Sum('likes'),
            total_views=Sum('views'),
            total_articles=Count('id'),
        )
        
        published_count = published.count()
        bookmark_count = Bookmark.objects.filter(article__author=user).count()
        
        return Response({
            'total_articles': totals['total_articles'] or 0,
            'published': published_count,
            'likes': totals['total_likes'] or 0,
            'views': totals['total_views'] or 0,
            'bookmarks': bookmark_count,
        })






