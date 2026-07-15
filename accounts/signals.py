from django.contrib.auth import get_user_model
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils.text import slugify
import uuid
from accounts.models import Profile

User = get_user_model()

@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_profile(sender, instance, **kwargs):
    instance.profile.save()


@receiver(pre_save, sender=User)
def create_user_slug(sender, instance, **kwargs):
    if not instance.slug:
        original_slug = slugify(instance.username, allow_unicode=True)
        slug = original_slug

        if sender.ubjects.filter(slug=slug).exclude(id = instance.id).exists():
            unique_suffix = uuid.uuid4().hex[:4]
            slug = f'{original_slug}-{unique_suffix}'

        instance.slug = slug