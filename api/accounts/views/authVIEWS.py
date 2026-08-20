from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.views import TokenObtainPairView
from Security.throttle import LoginThrottle
from ..serializers.authSZR import LoginSerializer
from ..serializers.userSZR import UserMinimalSerializer
from .captchaVIEWS import validate_captcha_token


class TokenObtainCaptchaView(TokenObtainPairView):
    """JWT token-pair endpoint, hardened with CAPTCHA and rate limiting."""
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request, *args, **kwargs):
        if not validate_captcha_token(request):
            return Response(
                {'detail': 'CAPTCHA verification required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().post(request, *args, **kwargs)


class LoginAPIView(generics.GenericAPIView):
    """Login with email + password (CAPTCHA required); returns JWT pair and user."""
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        if not validate_captcha_token(request):
            return Response(
                {'detail': 'CAPTCHA verification required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserMinimalSerializer(user).data,
        }, status=status.HTTP_200_OK)


class LogoutAPIView(APIView):
    """Blacklist the given refresh token."""
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get('refresh')

        if not refresh_token:
            return Response({'detail': 'refresh token is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response({'detail': 'Invalid or expired refresh token'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'detail': 'Successfully logged out'}, status=status.HTTP_200_OK)
