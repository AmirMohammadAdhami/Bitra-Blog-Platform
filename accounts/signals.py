from django.contrib.auth import get_user_model
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils.text import slugify
import uuid
from accounts.models import Profile, AuthorRequest

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


@receiver(post_save, sender=AuthorRequest)
def update_user_author_status(sender, instance, created, **kwargs):
    if instance.status == AuthorRequest.Status.APPROVED:
        if not instance.user.is_author:
            instance.user.is_author = True
            instance.user.save(update_fields=['is_author'])


    else:
        if instance.user.is_author:
            instance.user.is_author = False
            instance.user.save(update_fields=['is_author'])