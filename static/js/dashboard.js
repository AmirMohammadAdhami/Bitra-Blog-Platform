/* ============================================================================
   Dashboard shell controller — shared by every /dashboard/* page.
   - Enforces auth (JWT). No token → bounce to sign-in with ?next=.
   - Paints the subscriber identity card.
   - Marks the active account-nav link.
   ========================================================================= */
(function () {
  "use strict";
  var API = window.BitraAPI, UI = window.UI;

  // ---- auth gate -----------------------------------------------------------
  if (!API.isAuthenticated()) {
    var here = location.pathname + location.search;
    location.replace(UI.Routes.login + "?next=" + encodeURIComponent(here));
    return;
  }

  // ---- subscriber card -----------------------------------------------------
  function initials(user) {
    var src = (user.full_name || user.username || user.email || "").trim();
    if (!src) return "·";
    var parts = src.split(/\s+/);
    var a = parts[0][0] || "";
    var b = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (a + b).toUpperCase();
  }

  function fillIdentity() {
    var host = UI.qs("[data-dash-id]");
    if (!host) return;
    var user = API.Session.user || {};
    UI.clear(host);

    host.appendChild(UI.el("div", { class: "dash__avatar", text: initials(user) }));

    var right = UI.el("div", {}, [
      UI.el("div", { class: "dash__name", text: user.full_name || user.username || "Reader" }),
      user.email ? UI.el("div", { class: "dash__mail", text: user.email }) : null,
    ]);
    if (user.is_author) {
      right.appendChild(UI.el("div", { class: "dash__role" }, [
        UI.el("span", { class: "flag", text: "Contributor" }),
      ]));
    }
    host.appendChild(right);
  }

  // ---- active nav ----------------------------------------------------------
  function markNav() {
    var user = API.Session.user || {};
    UI.qsa(".dash__link").forEach(function (a) {
      // Show/hide author-only and reader-only links.
      if (a.hasAttribute("data-author-only")) a.hidden = !user.is_author;
      if (a.hasAttribute("data-reader-only")) a.hidden = !!user.is_author;

      var href = a.getAttribute("href");
      if (href && location.pathname.indexOf(href) === 0) a.setAttribute("aria-current", "page");
    });
  }

  fillIdentity();
  markNav();

  // Expose a tiny shared helper for page controllers.
  window.Dash = {
    // Render a standard empty state into a container.
    empty: function (container, title, line, ctaHref, ctaText) {
      UI.clear(container);
      var block = UI.el("div", { class: "note-block" }, [
        UI.el("h2", { text: title }),
        UI.el("p", { text: line }),
      ]);
      if (ctaHref) {
        block.appendChild(UI.el("div", { style: "margin-top:1.1rem" }, [
          UI.el("a", { class: "btn btn--sm btn--ink", href: ctaHref, text: ctaText || "Browse" }),
        ]));
      }
      container.appendChild(block);
    },
    fail: function (container, err) {
      UI.clear(container);
      container.appendChild(UI.el("div", { class: "note-block" }, [
        UI.el("h2", { text: "Stop the presses." }),
        UI.el("p", { text: (err && err.message) ? err.message : "Could not reach the newsroom API." }),
      ]));
    },
  };
})();
