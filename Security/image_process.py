import magic
from rest_framework import serializers
from PIL import Image
from django.core.files.base import ContentFile
import io
import uuid

ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
MAX_IMAGE_SIZE = 3 * 1024 * 1024

def validate_type_image(file):

    file_sample = file.read(512)
    file.seek(0)

    mime_type = magic.from_buffer(file_sample, mime=True)

    if mime_type not in ALLOWED_MIME_TYPES:
        raise serializers.ValidationError(
            f'Allowed types: JPEG, PNG, WebP'
        )
    return file

def validate_volume_image(file):
    if file.size > MAX_IMAGE_SIZE:
        raise serializers.ValidationError(f'Image too large. Maximum allowed size is 3 MB.')
    return file


def compress_and_resize_image(
        image_file, max_size=(800, 800), quality=80, format="WEBP"
):
    img = Image.open(image_file)


    if format.upper() == "WEBP":
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA")
    elif img.mode in ("RGBA", "P"):
        img = img.convert("RGB")


    img.thumbnail(max_size, Image.Resampling.LANCZOS)

    buffer = io.BytesIO()
    img.save(buffer, format=format, quality=quality, optimize=True)

    data = buffer.getvalue()


    filename = f"{uuid.uuid4()}.{format.lower()}"


    content_file = ContentFile(data, name=filename)
    content_file.content_type = f"image/{format.lower()}"
    content_file.size = len(data)

    return content_file



def process_avatar(image_file):
    return compress_and_resize_image(
        image_file, max_size=(512,512), quality=80
    )

def process_post_banner(image_file):
    return compress_and_resize_image(
        image_file, max_size=(1200, 675), quality=80
    )

def process_post_images(image_file):
    return compress_and_resize_image(
        image_file, max_size=(1200,1200), quality=80
    )