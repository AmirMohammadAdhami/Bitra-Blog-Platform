from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from api.blog.serializers.articleSZR import ArticleListSerializer, ArticleDetailSerializer
from blog.models import Article


class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.all()
    serializer_class = ArticleListSerializer
    permission_classes = (IsAuthenticatedOrReadOnly, )

    def list(self, request, *args, **kwargs):
        queryset = self.queryset
        serializer = ArticleListSerializer(queryset, many=True)
        return Response(serializer.data)


