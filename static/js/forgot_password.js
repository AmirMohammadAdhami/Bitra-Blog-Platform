/* ============================================================================
   Forgot password — Step 1: request a reset code.
   POST /api/accounts/password-reset/request/
   On success the email is saved to sessionStorage and we advance to the
   verify-code step.  The server always returns 200 with the same message
   regardless of whether the account exists (no user enumeration).
   ========================================================================= */
(function () {
  "use strict";
  var API = window.BitraAPI, UI = window.UI, LS_KEY = "bitra.reset_email";

  // If we're on this page but the session already has a fresh reset going,
  // allow it — otherwise redirect to the start.
  var form = document.querySelector("[data-forgot]");
  if (!form) return;

  var note  = form.querySelector("[data-note]");
  var btn   = form.querySelector("[data-submit]");

  function showNote(kind, msg) {
    note.className = "form-note " + (kind === "ok" ? "is-ok" : "is-error");
    note.textContent = msg;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    note.className = "form-note";
    var email = form.email.value.trim();
    if (!email) { showNote("err", "Enter your email address."); return; }

    btn.disabled = true; btn.textContent = "Sending…";

    API.requestPasswordReset(email).then(function () {
      // Persist the email across the three steps (sessionStorage clears on tab close).
      sessionStorage.setItem(LS_KEY, email);
      UI.toast("Verification code sent.");
      location.href = "/accounts/verify-code/";
    }).catch(function (err) {
      // Server always returns 200, so a non-200 means network / CORS / 500.
      showNote("err", (err && err.message) || "Could not send the code. Try again.");
      btn.disabled = false; btn.textContent = "Send verification code";
      if (window.BitraCAPTCHA) BitraCAPTCHA.reset();
    });
  });
})();
