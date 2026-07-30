from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ipware import get_client_ip
from api.blog.serializers.articleSZR import ArticleListSerializer, ArticleDetailSerializer
from blog.models import Article, ArticleView
from django.db.models import F
from rest_framework.decorators import action


class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.select_related('category', 'author').prefetch_related('tags')
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ArticleDetailSerializer
        return ArticleListSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        ip_address, is_routable = get_client_ip(request)

        ArticleView.objects.create(article=instance, ip_address=ip_address)

        Article.objects.filter(pk=instance.pk).update(views=F('views') + 1)

        return super().retrieve(request, *args, **kwargs)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self,request,pk=None):
        article = self.get_object()
        Article.objects.filter(pk=article.pk).update(likes=F('likes') + 1)
        article.refresh_from_db()
        return Response({'status':'article liked', 'likes':article.likes}, status=status.HTTP_200_OK)






