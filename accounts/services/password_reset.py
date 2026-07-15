from datetime import timedelta
from django.utils import timezone
from accounts.models import PasswordResetCode
from accounts.services.email import send_password_reset_email
from accounts.services.otp import generate_otp, hash_otp


def create_password_reset(user):
    # Delete previous unused codes
    PasswordResetCode.objects.filter(
        user=user,
        is_used=False
    ).delete()

    # Generate OTP
    otp = generate_otp()

    # Save hashed OTP
    PasswordResetCode.objects.create(
        user=user,
        code=hash_otp(otp),
        expires_at=timezone.now() + timedelta(minutes=10),
    )

    # Send Email
    send_password_reset_email(user, otp)