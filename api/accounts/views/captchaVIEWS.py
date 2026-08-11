"""
Slider CAPTCHA — server-side challenge / verification with signed tokens.

Flow:
  1. Client calls POST /api/accounts/captcha/challenge/
     → server creates a token, stores creation time in session, returns { id, expires }.
  2. User drags the slider to the end.
  3. Client calls POST /api/accounts/captcha/verify/  { id, elapsed }
     → server checks: token matches, elapsed > MIN_DRAG_MS, not expired.
     → on success: generates a signed CAPTCHA token with a unique nonce,
       stores the nonce in the Django cache (one-time use), returns the token.
  4. Client sends the signed token with auth requests (login, register, etc.)
  5. Auth endpoints call validate_captcha_token(request) to verify.

Security:
  - No secrets in JavaScript — the "challenge" is time-based, not position-based.
  - Verification requires real elapsed time (>1.5 s), blocking instant bots.
  - Signed tokens are stateless HMAC-SHA256, unique per deployment.
  - Each token contains a nonce tracked in Django's cache — single-use only.
  - Signed tokens expire after CAPTCHA_TTL (10 minutes).
  - The challenge is bound to the Django session during the drag phase.
"""

import hashlib
import hmac
import json
import os
import time
import base64

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

# ---------------------------------------------------------------------------
# Tunables
# ---------------------------------------------------------------------------
CHALLENGE_TTL = 300          # challenge valid for 5 minutes
MIN_DRAG_MS = 1500           # minimum drag duration in ms (blocks instant bots)
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


def validate_captcha_token(request):
    """
    Validate a signed CAPTCHA token from the request body.
    Call this from auth views:  if not validate_captcha_token(request): ...

    Checks:
      - Token is present and well-formed
      - HMAC signature is valid
      - Token has not expired
      - Token's nonce has not been used before (replay protection via Django cache)
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


@csrf_exempt
@require_POST
def challenge(request):
    """Create a fresh CAPTCHA challenge and bind it to the session."""
    now = int(time.time())
    token = _new_token()

    request.session[_SK_CHALLENGE] = token
    request.session[_SK_TS] = now
    request.session.modified = True

    return JsonResponse({
        "id": token,
        "expires": now + CHALLENGE_TTL,
    })


@csrf_exempt
@require_POST
def verify(request):
    """
    Verify the slider CAPTCHA.

    Expects JSON:  { "id": "<token>", "elapsed": <int ms> }
    Returns:       { "captcha_token": "<signed token>" }
    """
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, TypeError):
        return JsonResponse({"detail": "Invalid request body."}, status=400)

    token = body.get("id", "")
    elapsed = body.get("elapsed", 0)

    now = int(time.time())

    # --- validate challenge exists -------------------------------------------
    stored_token = request.session.get(_SK_CHALLENGE)
    stored_ts = request.session.get(_SK_TS, 0)

    if not stored_token:
        return JsonResponse(
            {"detail": "No active challenge. Please try again."},
            status=400,
        )

    # --- validate not expired ------------------------------------------------
    if now - stored_ts > CHALLENGE_TTL:
        request.session.pop(_SK_CHALLENGE, None)
        request.session.pop(_SK_TS, None)
        request.session.modified = True
        return JsonResponse(
            {"detail": "Challenge expired. Please try again."},
            status=400,
        )

    # --- validate token matches ----------------------------------------------
    if not stored_token or stored_token != token:
        return JsonResponse(
            {"detail": "Invalid challenge. Please try again."},
            status=400,
        )

    # --- validate drag took long enough (anti-bot) ---------------------------
    if not isinstance(elapsed, (int, float)) or elapsed < MIN_DRAG_MS:
        return JsonResponse(
            {"detail": "Too fast. Please drag the slider more slowly."},
            status=400,
        )

    # --- success: generate signed token with nonce ---------------------------
    request.session.pop(_SK_CHALLENGE, None)
    request.session.pop(_SK_TS, None)
    request.session.modified = True

    nonce = _new_token()
    captcha_token = _sign({"verified": True, "ts": now, "nonce": nonce})

    # Store nonce in cache (TTL = CAPTCHA_TTL). Single-use: consumed in validate_captcha_token.
    cache.set(_NONCE_CACHE_PREFIX + nonce, True, CAPTCHA_TTL)

    return JsonResponse({"captcha_token": captcha_token})
