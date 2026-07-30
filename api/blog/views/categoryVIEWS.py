from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from api.blog.serializers.categorySZR import CategorySerializer
from blog.models import Category


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_field = 'slug'