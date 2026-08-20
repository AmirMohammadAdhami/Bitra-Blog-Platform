"""
Slider CAPTCHA — server-side challenge / verification with signed tokens.

Flow:
  1. Client calls POST /api/accounts/captcha/challenge/
     → server creates a token, stores creation time in session, returns { id, expires }.
  2. User drags the slider to the end.
  3. Client calls POST /api/accounts/captcha/verify/  { id }
     → server checks: token matches, not expired, and that the challenge was
       issued at least MIN_DRAG_MS ago. Elapsed time is measured by the server
       (wall-clock between challenge creation and verification) — the client
       never supplies timing data, so a bot cannot claim a slow drag it never
       performed.
     → on success: generates a signed CAPTCHA token with a unique nonce,
       stores the nonce in the Django cache (one-time use). Returns the token.
  4. Client sends the signed token with auth requests (login, register, etc.)
  5. Auth endpoints call validate_captcha_token(request) to verify.

Security:
  - No secrets in JavaScript — the "challenge" is time-based, not position-based.
  - Elapsed time is measured server-side, never accepted from the client.
  - challenge/verify are rate-limited per IP (CaptchaThrottle), so the
    challenge→verify→auth loop cannot be scripted at volume.
  - Signed tokens are stateless HMAC-SHA256, unique per deployment.
  - Each token contains a nonce tracked in Django's cache — single-use only,
    so a captured token cannot be replayed.
  - Signed tokens expire after CAPTCHA_TTL (10 minutes).
  - The challenge itself is bound to the Django session during the drag phase
    (server-measured timing); the minted token is NOT session-bound because
    the API client deliberately sends auth requests without cookies
    (credentials: "omit"), so no stable session exists at submit time.
"""

import hashlib
import hmac
import json
import os
import time
import base64

from django.conf import settings
from django.core.cache import cache
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from Security.throttle import CaptchaThrottle


CHALLENGE_TTL = 300          # challenge valid for 5 minutes
MIN_DRAG_MS = 1000           # minimum server-measured time between challenge and verify
CAPTCHA_TTL = 600            # signed token valid for 10 minutes
_NONCE_CACHE_PREFIX = "captcha_nonce:"  # prefix for nonce cache keys

# Session keys (used only during the challenge phase)
_SK_CHALLENGE = "_captcha_challenge"
_SK_TS        = "_captcha_ts"

# Signing key — derived from Django SECRET_KEY so it's unique per deployment
_SIGNING_KEY = hashlib.sha256(
    (settings.SECRET_KEY + "captcha-salt").encode()
).digest()


def _new_token():
    """Cryptographically random hex token."""
    return hashlib.sha256(os.urandom(32)).hexdigest()[:32]


def _sign(data):
    """HMAC-SHA256 sign a dict, return a base64 URL-safe token."""
    payload = json.dumps(data, separators=(",", ":"))
    sig = hmac.new(_SIGNING_KEY, payload.encode(), hashlib.sha256).hexdigest()
    raw = payload + "." + sig
    return base64.urlsafe_b64encode(raw.encode()).decode()


def _unsign(token):
    """Verify and decode a signed token. Returns the dict or None."""
    try:
        raw = base64.urlsafe_b64decode(token.encode()).decode()
        payload, sig = raw.rsplit(".", 1)
        expected = hmac.new(_SIGNING_KEY, payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        return json.loads(payload)
    except Exception:
        return None


def _clear_challenge(session):
    session.pop(_SK_CHALLENGE, None)
    session.pop(_SK_TS, None)
    session.modified = True


def validate_captcha_token(request):
    """
    Validate a signed CAPTCHA token from the request body.
    Call this from auth views:  if not validate_captcha_token(request): ...

    Checks:
      - Token is present and well-formed
      - HMAC signature is valid
      - Token has not expired
      - Token's nonce has not been used before (replay protection via Django cache)

    NOTE: The token is deliberately NOT bound to the Django session. The API
    client sends auth requests with `credentials: "omit"` (to avoid DRF
    session-auth CSRF), so every submit looks like a fresh session — a session
    check would reject every legitimate user. Replay protection comes from the
    single-use nonce instead.
    """
    token = request.data.get("captcha_token") if hasattr(request, "data") else None
    if not token:
        return False

    data = _unsign(token)
    if not data:
        return False

    # Check expiry
    now = int(time.time())
    if now - data.get("ts", 0) > CAPTCHA_TTL:
        return False

    # Check required fields
    if not data.get("verified"):
        return False

    # Check nonce (replay protection)
    nonce = data.get("nonce")
    if not nonce:
        return False

    nonce_key = _NONCE_CACHE_PREFIX + nonce
    if cache.get(nonce_key) is None:
        # Nonce already consumed or never existed — reject
        return False

    # Consume the nonce (single-use)
    cache.delete(nonce_key)

    return True


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([CaptchaThrottle])
def challenge(request):
    """Create a fresh CAPTCHA challenge and bind it to the session."""
    now = int(time.time())
    token = _new_token()

    request.session[_SK_CHALLENGE] = token
    request.session[_SK_TS] = int(time.time() * 1000)  # ms, for server-side timing
    request.session.modified = True

    return Response({
        "id": token,
        "expires": now + CHALLENGE_TTL,
    })


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([CaptchaThrottle])
def verify(request):
    """Verify a slider challenge; returns a signed, single-use captcha token."""
    token = request.data.get("id", "")
    now_ms = int(time.time() * 1000)

    # --- validate challenge exists -------------------------------------------
    stored_token = request.session.get(_SK_CHALLENGE)
    stored_ts = request.session.get(_SK_TS, 0)

    if not stored_token:
        return Response(
            {"detail": "No active challenge. Please try again."},
            status=400,
        )

    # --- validate not expired ------------------------------------------------
    if now_ms - stored_ts > CHALLENGE_TTL * 1000:
        _clear_challenge(request.session)
        return Response(
            {"detail": "Challenge expired. Please try again."},
            status=400,
        )

    # --- validate token matches ----------------------------------------------
    if stored_token != token:
        return Response(
            {"detail": "Invalid challenge. Please try again."},
            status=400,
        )

    # --- server-measured drag time (anti-bot) --------------------------------
    # The wall-clock time between challenge creation and verification is a
    # lower bound on the drag duration. A bot can wait it out, but it cannot
    # *claim* a slow drag the way it could with a client-supplied `elapsed`.
    if now_ms - stored_ts < MIN_DRAG_MS:
        return Response(
            {"detail": "Too fast. Please drag the slider more slowly."},
            status=400,
        )

    # --- success: generate signed token with nonce ---------------------------
    _clear_challenge(request.session)

    nonce = _new_token()
    captcha_token = _sign({"verified": True, "ts": int(time.time()), "nonce": nonce})

    # Store nonce in cache (TTL = CAPTCHA_TTL). Single-use: consumed in validate_captcha_token.
    cache.set(_NONCE_CACHE_PREFIX + nonce, True, CAPTCHA_TTL)

    return Response({"captcha_token": captcha_token})
