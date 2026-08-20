
from ckeditor_uploader.views import upload
from jet.utils import JsonResponse

from .image_process import validate_type_image, validate_volume_image, process_post_images


def check_image_file(request, *args, **kwargs):
    if not request.user.is_author:
        return JsonResponse({'detail':'you are not an author'},status=403)

    file_key = 'upload' if 'upload' in request.FILES else ('file' if 'file' in request.FILES else None)

    if not file_key:
        return JsonResponse({'detail':'you are not upload any files'},status=400)

    raw_file = request.FILES[file_key]

    try:
        validate_type_image(raw_file)
        validate_volume_image(raw_file)

        compressed = process_post_images(raw_file)

        request.FILES[file_key] = compressed

    except Exception as e:
        return JsonResponse({'detail':str(e)},status=400)

    return upload(request, *args, **kwargs)