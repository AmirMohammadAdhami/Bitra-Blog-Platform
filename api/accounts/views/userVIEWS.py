from rest_framework import generics
from rest_framework.permissions import AllowAny

from accounts.models import User
from api.accounts.serializers.userSZR import UserRegisterSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [AllowAny]

