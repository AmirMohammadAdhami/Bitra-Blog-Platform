/* ============================================================================
   Bitra UI helpers — shared across every page.
   DOM building, formatting, toasts, header auth state, nav, scroll reveals.
   ========================================================================= */
(function (global) {
  "use strict";

  var API = global.BitraAPI;

  /* ------------------------------------------------------------- DOM utils */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k === "html") node.innerHTML = v;
        else if (k === "dataset") Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
        else if (k.slice(0, 2) === "on" && typeof v === "function") node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? "" : v);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null || c === false) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; }

  /* -------------------------------------------------------------- format */
  var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function parseDate(s) { var d = new Date(s); return isNaN(d) ? null : d; }

  function dateline(s) {
    var d = parseDate(s); if (!d) return "";
    return MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
  }
  function longDate(d) {
    d = d || new Date();
    var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return days[d.getDay()] + ", " + months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
  }
  function timeAgo(s) {
    var d = parseDate(s); if (!d) return "";
    var secs = Math.floor((Date.now() - d.getTime()) / 1000);
    if (secs < 60) return "just now";
    var mins = Math.floor(secs / 60); if (mins < 60) return mins + "m ago";
    var hrs = Math.floor(mins / 60); if (hrs < 24) return hrs + "h ago";
    var days = Math.floor(hrs / 24); if (days < 7) return days + "d ago";
    return dateline(s);
  }
  function num(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  }
  // Estimated read time from summary+content length.
  function readTime(article) {
    var words = ((article.content || "") + " " + (article.summary || "")).trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / 200)) + " min read";
  }
  function excerpt(s, n) {
    s = (s || "").replace(/\s+/g, " ").trim();
    if (s.length <= n) return s;
    return s.slice(0, n).replace(/\s+\S*$/, "") + "…";
  }

  /* --------------------------------------------------------------- toast */
  function toast(msg) {
    var host = qs(".toast-host");
    if (!host) { host = el("div", { class: "toast-host" }); document.body.appendChild(host); }
    var t = el("div", { class: "toast", role: "status", text: msg });
    host.appendChild(t);
    setTimeout(function () {
      t.style.transition = "opacity .3s ease, transform .3s ease";
      t.style.opacity = "0"; t.style.transform = "translateY(6px)";
      setTimeout(function () { t.remove(); }, 320);
    }, 3200);
  }

  /* -------------------------------------------------------- links / route */
  var Routes = {
    home: "/",
    articles: "/articles/",
    article: function (id) { return "/articles/" + id + "/"; },
    login: "/auth/login/",
    register: "/auth/register/",
    desk: "/accounts/dashboard/author/",
    write: "/accounts/dashboard/write/",
    edit: function (id) { return "/accounts/dashboard/write/" + id + "/"; },
  };

  /* ---------------------------------------------- header / auth rendering */
  function renderAuth() {
    var host = qs("[data-auth-slot]");
    if (!host) return;
    clear(host);
    var user = API.Session.user;
    if (user) {
      host.appendChild(el("a", {
        href: "/accounts/dashboard/profile/", class: "who",
        text: "☰ " + (user.username || user.full_name || "Reader"),
      }));
      if (user.is_author) host.appendChild(el("a", { href: "/accounts/dashboard/author/", text: "Desk" }));
      host.appendChild(el("a", { href: "/accounts/dashboard/bookmarks/", text: "Saved" }));
      host.appendChild(el("button", {
        class: "util__link", type: "button", text: "Sign out",
        onclick: function () {
          API.logout().then(function () { toast("Signed out."); renderAuth(); setTimeout(function(){ location.reload(); }, 400); });
        },
      }));
    } else {
      host.appendChild(el("a", { href: Routes.login, text: "Sign in" }));
      host.appendChild(el("a", { href: Routes.register, text: "Subscribe" }));
    }
  }

  /* --------------------------------------------------------------- nav UI */
  function initNav() {
    var nav = qs(".nav");
    var toggle = qs(".nav__toggle");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("nav--open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
    // mark current section
    qsa(".nav__link").forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href) return;
      var here = location.pathname;
      if (href === "/" ? here === "/" : here.indexOf(href) === 0) a.setAttribute("aria-current", "page");
    });
  }

  /* ----------------------------------------------------------- dateline UI */
  function initDateline() {
    qsa("[data-today]").forEach(function (n) { n.textContent = longDate(); });
    // Deterministic "vol/no" flourish based on the date — pure ornament.
    qsa("[data-volno]").forEach(function (n) {
      var d = new Date();
      var start = new Date(2024, 0, 1);
      var day = Math.floor((d - start) / 86400000) + 1;
      var vol = d.getFullYear() - 2023;
      n.textContent = "Vol. " + toRoman(vol) + " · No. " + day;
    });
  }
  function toRoman(n) {
    var map = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
    var out = ""; map.forEach(function (p) { while (n >= p[0]) { out += p[1]; n -= p[0]; } }); return out || "I";
  }

  /* ------------------------------------------------------ scroll reveals */
  function initReveals() {
    var els = qsa(".reveal");
    if (!("IntersectionObserver" in window) || !els.length) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (e) { io.observe(e); });
  }

  function requireAuthCTA(message) {
    return el("div", { class: "gate" }, [
      el("p", { text: message || "Sign in to continue." }),
      el("a", { class: "btn btn--sm", href: Routes.login, text: "Sign in" }),
      el("a", { class: "btn btn--sm btn--ink", href: Routes.register, text: "Subscribe" }),
    ]);
  }

  function boot() {
    renderAuth();
    initNav();
    initDateline();
    initReveals();
    // `is_author` flips server-side when an editor approves a contributor
    // request, but the cached Session.user only refreshes at login — so re-check
    // on every page load and re-render the header once we know the truth. This
    // is what keeps the "Desk" link honest without a re-login.
    if (API.Session.user) {
      API.refreshUser().catch(function () { return null; }).then(function (fresh) {
        if (fresh && API.Session.user) renderAuth();
      });
    }
  }

  /* ---------------------------------------------------------- cover image */
  var PLACEHOLDER = "/static/images/placeholder-article.svg";

  /** Return the article cover image URL or the newspaper placeholder. */
  function coverSrc(article) {
    return (article && article.cover_image) || PLACEHOLDER;
  }

  /** Build an <img> element for the article cover, with CSS class support. */
  function coverImg(article, cls) {
    var src = coverSrc(article);
    var attrs = { src: src, alt: (article && article.title) || "", loading: "lazy" };
    if (cls) attrs.class = cls;
    return el("img", attrs);
  }

  // Create a clickable author link (→ /profile/<slug-or-username>/) or plain text fallback.
  function authorLink(name, slug, cls, username) {
    name = name || "Staff";
    var target = slug || username;
    if (target) {
      return el("a", {
        href: "/profile/" + encodeURIComponent(target) + "/",
        class: cls || "wire author-link",
        text: name,
      });
    }
    return el("span", { class: cls || "wire", text: name });
  }

  global.UI = {
    el: el, qs: qs, qsa: qsa, clear: clear,
    dateline: dateline, timeAgo: timeAgo, num: num,
    readTime: readTime, excerpt: excerpt, toast: toast,
    coverImg: coverImg,
    authorLink: authorLink,
    Routes: Routes, requireAuthCTA: requireAuthCTA,
    initReveals: initReveals,
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
