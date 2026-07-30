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
    else:
        if hasattr(instance, "profile"):
            instance.profile.save()



@receiver(pre_save, sender=Profile)
def create_profile_slug(sender, instance, **kwargs):
    if not instance.slug:
        base_slug = slugify(instance.user.username, allow_unicode=True)
        if not base_slug:
            base_slug = 'user'
        slug = base_slug

        while sender.objects.filter(slug=slug).exclude(id = instance.user.id).exists():
            unique_suffix = uuid.uuid4().hex[:4]
            slug = f'{base_slug}-{unique_suffix}'

        instance.slug = slug