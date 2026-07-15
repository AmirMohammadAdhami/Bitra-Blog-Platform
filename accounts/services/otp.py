# accounts/services/otp.py
import secrets
from django.contrib.auth.hashers import (
    make_password,
    check_password,
)
def generate_otp(length=6):
    """
    Generate a cryptographically secure numeric OTP.

    Default:
        6 digits

    Returns:
        str
    """

    if length <= 0:
        raise ValueError("OTP length must be greater than zero.")

    minimum = 10 ** (length - 1)
    maximum = (10 ** length) - minimum

    return str(secrets.randbelow(maximum) + minimum)


def hash_otp(otp):
    """
    Hash an OTP before storing it in the database.

    Args:
        otp (str)

    Returns:
        str
    """

    return make_password(otp)


def verify_otp(raw_otp, hashed_otp):
    """
    Verify an entered OTP against its hashed version.

    Args:
        raw_otp (str)
        hashed_otp (str)

    Returns:
        bool
    """

    return check_password(raw_otp, hashed_otp)