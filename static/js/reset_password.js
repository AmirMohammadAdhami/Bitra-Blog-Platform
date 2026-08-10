/* ============================================================================
   Reset password — Step 3: set a new password.
   POST /api/accounts/password-reset/confirm/
   Reads email + code from sessionStorage (set by previous steps).
   On success clears session storage and redirects to sign-in.
   ========================================================================= */
(function () {
  "use strict";
  var API = window.BitraAPI, UI = window.UI;

  var form = document.querySelector("[data-reset]");
  if (!form) return;

  var email = sessionStorage.getItem("bitra.reset_email");
  var code  = sessionStorage.getItem("bitra.reset_code");

  if (!email || !code) {
    location.href = "/accounts/forgot-password/";
    return;
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

    var pw  = form.new_password.value;
    var pw2 = form.confirm_password.value;

    if (!pw || pw.length < 8) {
      showNote("err", "Use at least 8 characters for your password.");
      return;
    }
    if (pw !== pw2) {
      showNote("err", "The two passwords don't match.");
      return;
    }

    btn.disabled = true; btn.textContent = "Resetting…";

    API.confirmPasswordReset(email, code, pw).then(function () {
      // Clean up the reset flow state.
      sessionStorage.removeItem("bitra.reset_email");
      sessionStorage.removeItem("bitra.reset_code");
      showNote("ok", "Password reset. Redirecting to sign-in…");
      UI.toast("Password reset successfully.");
      setTimeout(function () { location.href = "/accounts/login/"; }, 1200);
    }).catch(function (err) {
      showNote("err", (err && err.message) || "Could not reset your password. The code may have expired.");
      btn.disabled = false; btn.textContent = "Reset password";
    });
  });
})();
