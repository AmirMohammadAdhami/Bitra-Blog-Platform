/* ============================================================================
   Bitra Slider CAPTCHA
   ─────────────────────
   Self-contained slider verification component.  Renders a native-looking
   slider into every [data-captcha] container found in the DOM.

   Security:
   • The "challenge" is a server-generated, session-bound token — no secrets
     in JavaScript.
   • Elapsed time is measured server-side (challenge creation → verify); the
     client never reports timing, so a script cannot fake a slow drag.
   • A signed, HMAC-SHA256 token with a single-use nonce is returned on success.
   • The token is exposed as BitraCAPTCHA.token for auth forms to include in
     their requests.

   Accessibility:
   • Keyboard: Arrow keys (Left / Right), Home, End move the thumb.
   • ARIA: role="slider", aria-valuemin / aria-valuemax / aria-valuenow.
   • prefers-reduced-motion: disables transition animations.
   ========================================================================= */
(function (global) {
  "use strict";

  var REDUCED_MOTION = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------ state */
  var token = null;       // signed captcha_token after successful verify
  var challengeId = null; // current challenge id
  var active = null;      // { el, track, thumb, fill, text, label } of the live instance

  /* ------------------------------------------------------------------ API */
  var API_BASE = "/api/accounts/captcha";

  function fetchChallenge() {
    return fetch(API_BASE + "/challenge/", {
      method: "POST",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    }).then(function (r) { return r.json(); });
  }

  function fetchVerify(challengeToken) {
    return fetch(API_BASE + "/verify/", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: challengeToken }),
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw new Error(data.detail || "Verification failed");
        return data;
      });
    });
  }

  /* ------------------------------------------------------------------ build */
  function build() {
    var wrap = document.createElement("div");
    wrap.className = "captcha";
    wrap.setAttribute("data-captcha", "");

    // Label: HUMAN VERIFICATION
    var label = document.createElement("span");
    label.className = "captcha__label";
    label.textContent = "HUMAN VERIFICATION";
    wrap.appendChild(label);

    // Track
    var track = document.createElement("div");
    track.className = "captcha__track";

    // Fill (coloured bar that grows behind the thumb)
    var fill = document.createElement("div");
    fill.className = "captcha__fill";
    track.appendChild(fill);

    // Text: SLIDE TO VERIFY
    var text = document.createElement("span");
    text.className = "captcha__text";
    text.textContent = "SLIDE TO VERIFY";
    track.appendChild(text);

    // Thumb
    var thumb = document.createElement("div");
    thumb.className = "captcha__thumb";
    thumb.setAttribute("tabindex", "0");
    thumb.setAttribute("role", "slider");
    thumb.setAttribute("aria-label", "Slide to verify you are human");
    thumb.setAttribute("aria-valuemin", "0");
    thumb.setAttribute("aria-valuemax", "100");
    thumb.setAttribute("aria-valuenow", "0");
    thumb.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
    track.appendChild(thumb);

    wrap.appendChild(track);

    return { wrap: wrap, track: track, thumb: thumb, fill: fill, text: text, label: label };
  }

  /* ----------------------------------------------------------- drag logic */
  function initDrag(parts) {
    var track = parts.track;
    var thumb = parts.thumb;
    var fill  = parts.fill;
    var text  = parts.text;

    var dragging = false;
    var startX = 0;
    var thumbLeft = 0;
    var trackWidth = 0;
    var thumbWidth = 0;
    var maxDrag = 0;

    function getTrackWidth() {
      return track.getBoundingClientRect().width;
    }

    function getThumbWidth() {
      return thumb.getBoundingClientRect().width;
    }

    function setThumbPos(px) {
      // Clamp
      if (px < 0) px = 0;
      if (px > maxDrag) px = maxDrag;

      var pct = maxDrag > 0 ? (px / maxDrag) * 100 : 0;
      thumb.style.left = px + "px";
      fill.style.width = (px + thumbWidth) + "px";
      thumb.setAttribute("aria-valuenow", Math.round(pct));

      // Update text opacity as user drags
      text.style.opacity = String(1 - pct / 80);
    }

    function onPointerDown(e) {
      if (thumb.classList.contains("captcha__thumb--done")) return;
      e.preventDefault();
      dragging = true;
      trackWidth = getTrackWidth();
      thumbWidth = getThumbWidth();
      maxDrag = trackWidth - thumbWidth;
      startX = (e.clientX || (e.touches && e.touches[0].clientX) || 0);
      thumbLeft = parseFloat(thumb.style.left) || 0;
      thumb.classList.add("captcha__thumb--dragging");
      track.classList.add("captcha__track--dragging");

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    }

    function onPointerMove(e) {
      if (!dragging) return;
      e.preventDefault();
      var clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      var dx = clientX - startX;
      setThumbPos(thumbLeft + dx);
    }

    function onPointerUp(e) {
      if (!dragging) return;
      dragging = false;
      thumb.classList.remove("captcha__thumb--dragging");
      track.classList.remove("captcha__track--dragging");

      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);

      var currentLeft = parseFloat(thumb.style.left) || 0;

      // If not at the end → reset
      if (currentLeft < maxDrag - 4) {
        resetThumb(parts);
        return;
      }

      // Reached the end — verify with server (drag time is measured server-side)
      showVerifying(parts);
      var myChallengeId = challengeId;

      fetchVerify(myChallengeId).then(function (data) {
        token = data.captcha_token;
        showSuccess(parts);
      }).catch(function (err) {
        resetThumb(parts);
        showTemporaryError(parts, err.message || "Verification failed. Try again.");
      });
    }

    // Mouse events (as fallback alongside pointer events)
    thumb.addEventListener("pointerdown", onPointerDown);
    // Touch events for broader compatibility
    thumb.addEventListener("touchstart", function (e) {
      if (thumb.classList.contains("captcha__thumb--done")) return;
      var touch = e.touches[0];
      onPointerDown({ preventDefault: function () { e.preventDefault(); }, clientX: touch.clientX });
    }, { passive: false });

    // Keyboard support
    thumb.addEventListener("keydown", function (e) {
      if (thumb.classList.contains("captcha__thumb--done")) return;
      trackWidth = getTrackWidth();
      thumbWidth = getThumbWidth();
      maxDrag = trackWidth - thumbWidth;
      var current = parseFloat(thumb.style.left) || 0;
      var step = trackWidth * 0.08; // 8% per arrow press
      var handled = true;

      switch (e.key) {
        case "ArrowRight":
          setThumbPos(current + step);
          break;
        case "ArrowLeft":
          setThumbPos(current - step);
          break;
        case "Home":
          setThumbPos(0);
          break;
        case "End":
          setThumbPos(maxDrag);
          break;
        default:
          handled = false;
      }

      if (handled) {
        e.preventDefault();
        // If at end on ArrowRight or End, auto-verify
        var pos = parseFloat(thumb.style.left) || 0;
        if (pos >= maxDrag - 4 && (e.key === "ArrowRight" || e.key === "End")) {
          onPointerUp({ clientX: 0 });
        }
      }
    });
  }

  /* ------------------------------------------------------------- states */
  function resetThumb(parts) {
    // prefers-reduced-motion → snap back instantly, no animation.
    var animThumb = REDUCED_MOTION ? "none" : "left .3s cubic-bezier(.4,0,.2,1)";
    var animFill = REDUCED_MOTION ? "none" : "width .3s cubic-bezier(.4,0,.2,1)";
    parts.thumb.style.transition = animThumb;
    parts.fill.style.transition = animFill;
    parts.thumb.style.left = "0px";
    parts.fill.style.width = "0px";
    parts.thumb.setAttribute("aria-valuenow", "0");
    parts.text.style.opacity = "1";
    parts.thumb.classList.remove("captcha__thumb--error", "captcha__thumb--done");
    parts.track.classList.remove("captcha__track--verifying");

    setTimeout(function () {
      parts.thumb.style.transition = "";
      parts.fill.style.transition = "";
    }, REDUCED_MOTION ? 0 : 350);
  }

  function showVerifying(parts) {
    parts.thumb.classList.add("captcha__thumb--done");
    parts.track.classList.add("captcha__track--verifying");
    parts.thumb.setAttribute("aria-label", "Verifying…");
    parts.text.textContent = "VERIFYING…";
    parts.text.style.opacity = "1";
  }

  function showSuccess(parts) {
    var track = parts.track;
    var thumb = parts.thumb;
    var wrap  = parts.wrap;
    var text  = parts.text;

    track.classList.remove("captcha__track--verifying");
    track.classList.add("captcha__track--verified");
    thumb.classList.add("captcha__thumb--verified");
    thumb.setAttribute("aria-label", "Verified");
    text.textContent = "\u2713 VERIFIED";
    text.className = "captcha__text captcha__text--verified";
    wrap.classList.add("captcha--verified");

    // Update aria
    thumb.setAttribute("aria-valuenow", "100");
  }

  function showTemporaryError(parts, msg) {
    parts.thumb.classList.add("captcha__thumb--error");
    parts.text.textContent = msg;
    parts.text.style.opacity = "1";
    parts.text.classList.add("captcha__text--error");

    setTimeout(function () {
      parts.thumb.classList.remove("captcha__thumb--error");
      parts.text.classList.remove("captcha__text--error");
      parts.text.textContent = "SLIDE TO VERIFY";
    }, 2500);
  }

  /* ----------------------------------------------------------- init captcha */
  function initCaptcha(container) {
    var parts = build();
    // Clear container and append
    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(parts.wrap);

    initDrag(parts);

    // Fetch challenge from server
    fetchChallenge().then(function (data) {
      challengeId = data.id;
    }).catch(function () {
      parts.text.textContent = "TEMPORARY ERROR — RETRY";
    });

    active = parts;
  }

  /* -------------------------------------------------------------- public API */
  var BitraCAPTCHA = {
    /** The signed captcha_token — null until verified. */
    get token() { return token; },
    /** Force-reset the captcha (e.g. after a failed auth attempt). */
    reset: function () {
      token = null;
      challengeId = null;
      if (active) {
        resetThumb(active);
        active.wrap.classList.remove("captcha--verified");
        active.track.classList.remove("captcha__track--verified", "captcha__track--verifying");
        active.thumb.classList.remove("captcha__thumb--done", "captcha__thumb--verified");
        active.thumb.setAttribute("aria-label", "Slide to verify you are human");
        active.text.textContent = "SLIDE TO VERIFY";
        active.text.className = "captcha__text";
        // Re-fetch challenge
        fetchChallenge().then(function (data) {
          challengeId = data.id;
        });
      }
    },
  };

  global.BitraCAPTCHA = BitraCAPTCHA;

  /* --------------------------------------------------- auto-init on DOMContentLoaded */
  function boot() {
    var containers = document.querySelectorAll("[data-captcha]");
    for (var i = 0; i < containers.length; i++) {
      initCaptcha(containers[i]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})(window);
