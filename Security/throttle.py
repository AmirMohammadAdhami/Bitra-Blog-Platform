from rest_framework.throttling import AnonRateThrottle

class LoginThrottle(AnonRateThrottle):
    scope = "login"

class PasswordResetThrottle(AnonRateThrottle):
    scope = "passwordreset"

class CaptchaThrottle(AnonRateThrottle):
    scope = "captcha"
