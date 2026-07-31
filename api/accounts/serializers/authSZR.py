from django.contrib.auth import authenticate
from rest_framework import serializers

from .userSZR import UserMinimalSerializer


class LoginSerializer(serializers.Serializer):
    """
    Authenticates a user by email + password.
    The custom User model uses USERNAME_FIELD = 'email', so we authenticate
    against that field directly.
    """
    email = serializers.EmailField()
    password = serializers.CharField(style={'input_type': 'password'}, write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        user = authenticate(
            request=self.context.get('request'),
            username=email,
            password=password,
        )

        if not user:
            raise serializers.ValidationError(
                {'detail': 'No active account found with the given credentials.'}
            )

        if not user.is_active:
            raise serializers.ValidationError({'detail': 'This account is inactive.'})

        attrs['user'] = user
        return attrs


class LoginResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserMinimalSerializer()
