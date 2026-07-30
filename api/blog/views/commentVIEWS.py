from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from api.blog.serializers.commentSZR import CommentSerializer
from blog.models import Comment, CommentLike


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.filter(status= Comment.Status.APPROVED)
    serializer_class = CommentSerializer

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def likes(self, request, pk=None):
        comment = self.get_object()
        user = request.user

        like_obj, created =CommentLike.objects.get_or_create(user=user, comment=comment)

        if not created:
            like_obj.delete()
            return Response({'status':'unliked'}, status=status.HTTP_200_OK)

        return Response({'status':'liked'}, status=status.HTTP_200_OK)