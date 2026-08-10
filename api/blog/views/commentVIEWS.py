from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from ..permissions import IsCommentAuthorOrReadOnly
from api.blog.serializers.commentSZR import CommentSerializer
from blog.models import Comment, CommentLike




class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.filter(status=Comment.Status.APPROVED)
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated, IsCommentAuthorOrReadOnly]

    def perform_create(self, serializer):
        """Force the author to the requesting user — prevents spoofing."""
        serializer.save(author=self.request.user)

    @action(detail=False, methods=['get'])
    def mine(self, request):
        """The signed-in reader's own comments across every status, newest
        first — so they can see what's live and what's still awaiting
        approval. Read-only; the default queryset (APPROVED only) that the
        public article pages rely on is left untouched."""
        comments = (Comment.objects
                    .filter(author=request.user)
                    .select_related('article')
                    .order_by('-created_at'))
        serializer = self.get_serializer(comments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def likes(self, request, pk=None):
        comment = self.get_object()
        user = request.user

        like_obj, created = CommentLike.objects.get_or_create(user=user, comment=comment)

        if not created:
            like_obj.delete()
            return Response({'status':'unliked'}, status=status.HTTP_200_OK)

        return Response({'status':'liked'}, status=status.HTTP_200_OK)