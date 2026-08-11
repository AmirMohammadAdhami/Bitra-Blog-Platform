/* ============================================================================
   Auth controller — drives both the sign-in and subscribe coupons.
   On success: stores JWT (handled by BitraAPI) and returns the reader to
   ?next= or the front page.
   ========================================================================= */
(function () {
  "use strict";
  var API = window.BitraAPI, UI = window.UI;

  function nextUrl() {
    var n = new URLSearchParams(location.search).get("next");
    // only allow same-site relative redirects
    if (n && /^\/(?!\/)/.test(n)) return n;
    return UI.Routes.home;
  }

  function showNote(note, kind, msg) {
    note.className = "form-note " + (kind === "ok" ? "is-ok" : "is-error");
    note.textContent = msg;
  }

  // If already signed in, bounce away from auth pages.
  if (API.Session.isAuthed) {
    UI.toast("You’re already signed in.");
    setTimeout(function () { location.href = nextUrl(); }, 600);
  }

  /* ------------------------------------------------------------- sign in */
  var loginForm = document.querySelector("[data-login]");
  if (loginForm) {
    var lNote = loginForm.querySelector("[data-note]");
    var lBtn = loginForm.querySelector("[data-submit]");
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      lNote.className = "form-note";
      var email = loginForm.email.value.trim();
      var password = loginForm.password.value;
      if (!email || !password) { showNote(lNote, "err", "Enter your email and password."); return; }
      lBtn.disabled = true; lBtn.textContent = "Signing in…";
      API.login(email, password).then(function (user) {
        UI.toast("Welcome back, " + (user.username || "reader") + ".");
        location.href = nextUrl();
      }).catch(function (err) {
        showNote(lNote, "err", err.status === 401 || err.status === 400
          ? "Those credentials didn’t match. Try again."
          : (err.message || "Could not sign in."));
        lBtn.disabled = false; lBtn.textContent = "Sign in";
        if (window.BitraCAPTCHA) BitraCAPTCHA.reset();
      });
    });
  }

  /* ------------------------------------------------------------ register */
  var regForm = document.querySelector("[data-register]");
  if (regForm) {
    var rNote = regForm.querySelector("[data-note]");
    var rBtn = regForm.querySelector("[data-submit]");
    regForm.addEventListener("submit", function (e) {
      e.preventDefault();
      rNote.className = "form-note";
      var payload = {
        full_name: regForm.full_name.value.trim(),
        username: regForm.username.value.trim(),
        email: regForm.email.value.trim(),
        password: regForm.password.value,
      };
      if (!payload.full_name || !payload.username || !payload.email || !payload.password) {
        showNote(rNote, "err", "Please fill in every field."); return;
      }
      if (payload.password.length < 8) { showNote(rNote, "err", "Use at least 8 characters for your password."); return; }
      rBtn.disabled = true; rBtn.textContent = "Creating…";
      API.register(payload).then(function () {
        // Registration doesn't return tokens — sign in immediately.
        return API.login(payload.email, payload.password);
      }).then(function (user) {
        UI.toast("Account created. Welcome, " + (user.username || "reader") + ".");
        location.href = nextUrl();
      }).catch(function (err) {
        showNote(rNote, "err", err.message || "Could not create your account.");
        rBtn.disabled = false; rBtn.textContent = "Create account";
        if (window.BitraCAPTCHA) BitraCAPTCHA.reset();
      });
    });
  }
})();
