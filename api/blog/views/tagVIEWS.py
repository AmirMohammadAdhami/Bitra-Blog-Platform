from rest_framework import viewsets
from ..permissions import IsAuthorOrReadOnly
from api.blog.serializers.tagSZR import TagSerializer
from blog.models import Tag


class TagViewSet(viewsets.ModelViewSet):
    """Tags: public reads, author-managed writes."""
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    lookup_field = "slug"
    permission_classes = [IsAuthorOrReadOnly]