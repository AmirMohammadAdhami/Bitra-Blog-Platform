from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser
from api.blog.serializers.categorySZR import CategorySerializer
from blog.models import Category


class CategoryViewSet(viewsets.ModelViewSet):
    """Categories: admin-managed taxonomy."""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_field = 'slug'
    permission_classes = [IsAdminUser]