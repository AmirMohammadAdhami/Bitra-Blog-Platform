from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from api.accounts.serializers.userSZR import UserRegisterSerializer, UserMinimalSerializer
from .captchaVIEWS import validate_captcha_token


class RegisterView(generics.CreateAPIView):
    """Register a new account; returns a JWT pair on success."""
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        if not validate_captcha_token(request):
            return Response(
                {'detail': 'CAPTCHA verification required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Return JWT tokens directly (same shape as login) so the client
        # doesn't need a second CAPTCHA solve right after registering.
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserMinimalSerializer(user).data,
        }, status=status.HTTP_201_CREATED)

