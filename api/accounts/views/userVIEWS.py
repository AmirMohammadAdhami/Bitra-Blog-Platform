from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.models import User
from api.accounts.serializers.userSZR import UserRegisterSerializer
from .captchaVIEWS import validate_captcha_token


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        if not validate_captcha_token(request):
            return Response(
                {'detail': 'CAPTCHA verification required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request, *args, **kwargs)

