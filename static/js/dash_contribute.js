/* ============================================================================
   Contributor access — request to write for Bitra.
   GET/POST /accounts/author-requests/.
   AuthorRequest is one-per-user (OneToOne), and the API only creates a new
   row when none exists, so we only show the request button in that case.
   ========================================================================= */
(function () {
  "use strict";
  var API = window.BitraAPI, UI = window.UI, el = UI.el;

  var host = document.querySelector("[data-contribute]");
  if (!host) return;

  function card(word, lines, extra) {
    UI.clear(host);
    host.appendChild(el("div", { class: "statusword", text: word }));
    (Array.isArray(lines) ? lines : [lines]).forEach(function (t) {
      if (t) host.appendChild(el("p", { text: t }));
    });
    if (extra) host.appendChild(extra);
  }

  function showContributor() {
    card("You’re a contributor.", "Your byline is live. Head to the writers’ desk to draft and submit stories.",
      el("div", { class: "dash__aside-actions", style: "margin-top:.4rem" }, [
        el("a", { class: "btn btn--sm btn--ink", href: "/dashboard/author/", text: "Go to the desk →" }),
      ]));
  }

  function showPending(req) {
    var when = req && req.created_at ? " (sent " + UI.dateline(req.created_at) + ")" : "";
    card("Request under review.", "An editor is reading your request" + when + ". We’ll be in touch once it’s decided.");
  }

  function showRejected() {
    card("Not this time.",
      ["Your contributor request wasn’t approved. Keep reading and writing letters to the editor — the desk revisits decisions periodically.",
       "To follow up, reply to the decision email and an editor will take another look."]);
  }

  function showInvite() {
    var btn = el("button", { class: "btn btn--ink", type: "button", text: "Request contributor access" });
    var wrap = el("div", { class: "dash__aside-actions", style: "margin-top:.4rem" }, [btn]);
    btn.addEventListener("click", function () {
      btn.disabled = true; btn.textContent = "Sending…";
      API.requestAuthor().then(function (req) {
        UI.toast("Request sent to the desk.");
        showPending(req);
      }).catch(function (err) {
        // 400 = a request already exists / is pending.
        if (err && err.status === 400) { showPending(null); return; }
        btn.disabled = false; btn.textContent = "Request contributor access";
        UI.toast(err && err.message ? err.message : "Could not send your request.");
      });
    });
    card("Write for Bitra.",
      "Bitra is reader-funded and reader-written. Request contributor access and, once an editor approves you, you’ll be able to draft and submit stories from the writers’ desk.",
      wrap);
  }

  // Already a contributor? Short-circuit.
  var user = API.Session.user || {};
  if (user.is_author) { showContributor(); return; }

  API.authorRequests().then(function (rows) {
    var req = (rows || [])[0]; // one-per-user
    if (!req) { showInvite(); return; }
    var s = (req.status || "").toUpperCase();
    if (s === "APPROVED") showContributor();
    else if (s === "REJECTED") showRejected();
    else showPending(req);
  }).catch(function (err) { window.Dash.fail(host, err); });
})();
