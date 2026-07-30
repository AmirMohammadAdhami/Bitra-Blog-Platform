from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from api.blog.serializers.tagSZR import TagSerializer
from blog.models import Tag


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    lookup_field = "slug"