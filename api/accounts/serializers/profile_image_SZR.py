from rest_framework import serializers
from accounts.models import Profile
from Security.image_process import validate_type_image,validate_volume_image, process_avatar



class ProfileImageSerializer(serializers.ModelSerializer):
    profile_image = serializers.ImageField(validators=[validate_type_image,validate_volume_image])


    class Meta:
        model = Profile
        fields = ['id', 'user', 'profile_image']
        read_only_fields = ['id', 'user']

    def validate_profile_image(self, profile_image):
        return process_avatar(profile_image)



