from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from accounts.models import Like, Bookmark
from ..serializers.likebookmarkSZR import LikeSerializer, BookmarkSerializer
from rest_framework.decorators import action
from rest_framework.response import Response


class LikeViewSet(viewsets.ModelViewSet):
    serializer_class = LikeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Like.objects.filter(user=self.request.user)


    @action(detail=False, methods=['post'])
    def toggle(self,request):
        article_id = request.data.get('article_id')
        if not article_id:
            return Response({'detail':'we need an article id'})

        like_obj,created = Like.objects.get_or_create(user=self.request.user,article_id=article_id)

        if not created:
            like_obj.delete()
            return Response({'status':'unliked'}, status=status.HTTP_200_OK)

        return Response({'status':'liked'}, status=status.HTTP_200_OK)


class BookmarkViewSet(viewsets.ModelViewSet):
    serializer_class = BookmarkSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Bookmark.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def toggle(self,request):
        article_id = request.data.get('article_id')
        if not article_id:
            return Response({'detail':'we need an article id'})

        bookmark_obj, created = Bookmark.objects.get_or_create(user=self.request.user,article_id=article_id)

        if not created:
            bookmark_obj.delete()
            return Response({'status':'unbookmarked'}, status=status.HTTP_200_OK)

        return Response({'status':'bookmarked'}, status=status.HTTP_200_OK)