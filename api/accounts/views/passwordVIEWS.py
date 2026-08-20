from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model
from Security.throttle import PasswordResetThrottle
from accounts.models import PasswordResetCode
from accounts.services.password_reset import create_password_reset
from ..serializers.passwordSZR import (
    PasswordResetRequestSerializer,
    PasswordResetVerifySerializer,
    PasswordResetConfirmSerializer
)
from .captchaVIEWS import validate_captcha_token

User = get_user_model()


class PasswordResetRequestAPIView(generics.GenericAPIView):
    """Request a password reset code for an email."""
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetThrottle]

    def post(self, request, *args, **kwargs):
        if not validate_captcha_token(request):
            return Response(
                {'detail': 'CAPTCHA verification required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']

        try:
            user = User.objects.get(email=email)
            create_password_reset(user)
        except User.DoesNotExist:
            pass

        return Response(
            {"detail": "If an account exists, the password reset code will be sent."},
            status=status.HTTP_200_OK
        )


class PasswordResetVerifyAPIView(generics.GenericAPIView):
    """Verify a password reset code."""
    serializer_class = PasswordResetVerifySerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return Response(
            {"detail": "Your code is correct."},
            status=status.HTTP_200_OK
        )


class PasswordResetConfirmAPIView(generics.GenericAPIView):
    """Confirm a reset and set a new password."""
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reset_code = serializer.validated_data['reset_code_obj']
        new_password = serializer.validated_data['new_password']

        user = reset_code.user
        user.set_password(new_password)
        user.save()

        PasswordResetCode.objects.filter(user=user, is_used=False).update(is_used=True)

        return Response(
            {"detail": "Your password has been reset."},
            status=status.HTTP_200_OK
        )
