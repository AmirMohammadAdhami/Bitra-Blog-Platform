from rest_framework import serializers
from django.contrib.auth import get_user_model
from accounts.models import PasswordResetCode
from accounts.services.otp import verify_otp
from django.utils import timezone

User = get_user_model()


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6, min_length=6)

    def validate(self, attrs):
        email = attrs.get('email')
        code = attrs.get('code')

        try:
            reset_code = PasswordResetCode.objects.filter(
                user__email=email,
                is_used=False
            ).latest("created_at")
        except PasswordResetCode.DoesNotExist:
            raise serializers.ValidationError({"code": "your verification code is invalid"})

        if reset_code.is_locked:
            reset_code.is_used = True
            reset_code.save()
            raise serializers.ValidationError(
                {"code": "Your verification code has been locked"})

        if reset_code.expires_at < timezone.now():
            raise serializers.ValidationError({"code": "Your code is out of time"})

        if not verify_otp(code, reset_code.code):
            reset_code.attempts += 1
            remaining = PasswordResetCode.MAX_ATTEMPTS - reset_code.attempts

            if remaining <= 0:
                reset_code.is_used = True
                reset_code.save()
                raise serializers.ValidationError(
                    {"code": "Your verification code has been locked"})

            reset_code.save()
            raise serializers.ValidationError(
                {"code": f"{remaining} attempts remaining"})


        attrs['reset_code_obj'] = reset_code
        return attrs



class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(min_length=8, write_only=True)

    def validate(self, attrs):
        verify_serializer = PasswordResetVerifySerializer(data=attrs)
        verify_serializer.is_valid(raise_exception=True)

        attrs['reset_code_obj'] = verify_serializer.validated_data['reset_code_obj']
        return attrs
