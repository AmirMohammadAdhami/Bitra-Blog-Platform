from django.conf import settings
from django.core.mail import send_mail


def send_password_reset_email(user, otp):
    subject = "Bitra Password Reset"

    message = (
        f"Hello {user.full_name},\n\n"
        f"Your password reset verification code is:\n\n"
        f"{otp}\n\n"
        f"This code will expire in 10 minutes.\n\n"
        f"If you did not request a password reset, please ignore this email."
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )