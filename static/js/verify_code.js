/* ============================================================================
   Verify code — Step 2: confirm the 6-digit OTP.
   POST /api/accounts/password-reset/verify/
   Reads the email from sessionStorage (set by forgot_password.js).
   On success advances to the reset-password step.
   ========================================================================= */
(function () {
  "use strict";
  var API = window.BitraAPI, UI = window.UI, LS_KEY = "bitra.reset_email";

  var form = document.querySelector("[data-verify]");
  if (!form) return;

  var email = sessionStorage.getItem(LS_KEY);

  if (!email) {
    // No email in the session — user jumped here directly.  Send them back.
    location.href = "/accounts/forgot-password/";
    return;
  }

  // Show the masked email so the user knows where the code was sent.
  var display = document.querySelector("[data-email-display]");
  if (display) {
    var parts = email.split("@");
    var masked = parts[0].charAt(0) + "***" + (parts[0].length > 1 ? parts[0].charAt(parts[0].length - 1) : "");
    display.textContent = masked + "@" + (parts[1] || "…");
  }

  var note = form.querySelector("[data-note]");
  var btn  = form.querySelector("[data-submit]");

  function showNote(kind, msg) {
    note.className = "form-note " + (kind === "ok" ? "is-ok" : "is-error");
    note.textContent = msg;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    note.className = "form-note";
    var code = form.code.value.trim();
    if (!code || code.length !== 6) { showNote("err", "Enter the 6-digit code."); return; }

    btn.disabled = true; btn.textContent = "Verifying…";

    API.verifyPasswordReset(email, code).then(function () {
      // Persist the code for the final reset step.
      sessionStorage.setItem("bitra.reset_code", code);
      UI.toast("Code verified.");
      location.href = "/accounts/reset-password/";
    }).catch(function (err) {
      showNote("err", (err && err.message) || "Invalid or expired code. Try again.");
      btn.disabled = false; btn.textContent = "Verify code";
    });
  });

  // Resend code button.
  var resendBtn = document.querySelector("[data-resend]");
  if (resendBtn) {
    resendBtn.addEventListener("click", function () {
      resendBtn.disabled = true; resendBtn.textContent = "Sending…";
      API.requestPasswordReset(email).then(function () {
        UI.toast("New code sent.");
        resendBtn.textContent = "Resent ✓";
        setTimeout(function () { resendBtn.disabled = false; resendBtn.textContent = "Resend code"; }, 3000);
      }).catch(function () {
        showNote("err", "Could not resend the code.");
        resendBtn.disabled = false; resendBtn.textContent = "Resend code";
      });
    });
  }
})();
