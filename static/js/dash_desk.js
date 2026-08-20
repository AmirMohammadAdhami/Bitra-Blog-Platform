/* ============================================================================
   Writers’ desk. Lists the contributor’s own stories, grouped by where each
   one sits in the editorial flow: Drafts → With the editors → Published, plus
   Sent back. Actions match what the API allows at each stage.
     DRAFT / REJECTED : Edit, Submit, Delete   (editable, owner-only)
     SUBMITTED        : Preview, Withdraw        (locked while under review)
     REVIEWED         : View                     (live)
   Source: GET /blog/articles/mine/  (author-owned, newest edit first).
   ========================================================================= */
(function () {
  "use strict";
  var API = window.BitraAPI, UI = window.UI, el = UI.el;

  var host = document.querySelector("[data-desk]");
  if (!host) return;
  var countEl = document.querySelector("[data-count]");
  var newBtn = document.querySelector("[data-new]");

  // Display order + copy for each stage. Order encodes the writer’s workflow:
  // what needs your hand first (drafts, sent-back) sits above what’s waiting.
  var GROUPS = [
    { key: "DRAFT", flag: "Drafts", blurb: "Yours to keep working on." },
    { key: "REJECTED", flag: "Sent back", blurb: "An editor returned these — revise and resubmit." },
    { key: "SUBMITTED", flag: "With the editors", blurb: "Awaiting a decision. Withdraw to keep editing." },
    { key: "REVIEWED", flag: "Published", blurb: "Live on Bitra." },
  ];

  // ---- one story row -------------------------------------------------------
  function actions(a) {
    var wrap = el("div", { class: "desk__actions" });

    function btn(label, cls, handler) {
      return el("button", { class: "linkbtn" + (cls ? " " + cls : ""), type: "button", text: label, onclick: handler });
    }
    function link(label, href, cls) {
      return el("a", { class: "linkbtn" + (cls ? " " + cls : ""), href: href, text: label });
    }

    var s = a.status;
    if (s === "DRAFT" || s === "REJECTED") {
      wrap.appendChild(link("Edit", UI.Routes.edit(a.id)));
      wrap.appendChild(btn("Submit", "linkbtn--go", function (e) { doSubmit(a, e.currentTarget); }));
      wrap.appendChild(btn("Delete", "linkbtn--quiet", function (e) { confirmDelete(a, e.currentTarget); }));
    } else if (s === "SUBMITTED") {
      wrap.appendChild(link("Preview", UI.Routes.article(a.id)));
      wrap.appendChild(btn("Withdraw", null, function (e) { doWithdraw(a, e.currentTarget); }));
    } else if (s === "REVIEWED") {
      wrap.appendChild(link("View", UI.Routes.article(a.id), "linkbtn--go"));
    }
    return wrap;
  }

  function row(a) {
    var cat = a.category && a.category.name ? a.category.name : "Dispatch";
    var stats = [];
    if (a.status === "REVIEWED") {
      stats.push(UI.num(a.views) + " views");
      if (Number(a.likes) > 0) stats.push(UI.num(a.likes) + " likes");
    }

    return el("div", { class: "desk__item reveal" }, [
      el("div", { class: "desk__body" }, [
        el("div", { class: "kicker", text: cat }),
        el("h3", { class: "desk__hl" }, [el("span", { text: a.title || "Untitled" })]),
        a.summary ? el("p", { class: "desk__sum", text: UI.excerpt(a.summary, 170) }) : null,
        el("div", { class: "desk__meta wire" }, [
          el("span", { text: UI.dateline(a.created_at) }),
          stats.length ? el("span", { text: " · " + stats.join(" · ") }) : null,
        ]),
      ]),
      actions(a),
    ]);
  }

  function section(group, items) {
    var wrap = el("section", { class: "desk__group desk__group--" + group.key.toLowerCase() }, [
      el("div", { class: "desk__grouphd" }, [
        el("span", { class: "flag", text: group.flag }),
        el("span", { class: "wire", text: items.length + (items.length === 1 ? " story" : " stories") }),
      ]),
      el("p", { class: "desk__blurb wire", text: group.blurb }),
    ]);
    items.forEach(function (a) { wrap.appendChild(row(a)); });
    return wrap;
  }

  // ---- actions -------------------------------------------------------------
  function lock(btn, label) { if (btn) { btn.disabled = true; btn.dataset.was = btn.textContent; btn.textContent = label || "…"; } }
  function unlock(btn) { if (btn) { btn.disabled = false; if (btn.dataset.was) btn.textContent = btn.dataset.was; } }

  function doSubmit(a, btn) {
    lock(btn, "Sending…");
    API.submitArticle(a.id).then(function () {
      UI.toast("Sent to the editors.");
      load();
    }).catch(function (err) { unlock(btn); UI.toast(msg(err, "Could not submit.")); });
  }

  function doWithdraw(a, btn) {
    lock(btn, "Pulling…");
    API.withdrawArticle(a.id).then(function () {
      UI.toast("Back in your drafts.");
      load();
    }).catch(function (err) { unlock(btn); UI.toast(msg(err, "Could not withdraw.")); });
  }

  // Two-step delete: the button turns into an explicit confirm/keep pair so a
  // stray click never destroys a draft.
  function confirmDelete(a, btn) {
    var cluster = btn.parentNode;
    var confirm = el("span", { class: "desk__confirm" }, [
      el("span", { class: "wire", text: "Delete for good?" }),
      el("button", {
        class: "linkbtn linkbtn--danger", type: "button", text: "Delete",
        onclick: function (e) {
          var go = e.currentTarget; lock(go, "Deleting…");
          API.deleteArticle(a.id).then(function () {
            UI.toast("Story deleted.");
            load();
          }).catch(function (err) { unlock(go); UI.toast(msg(err, "Could not delete.")); });
        },
      }),
      el("button", { class: "linkbtn linkbtn--quiet", type: "button", text: "Keep", onclick: function () { cluster.replaceChild(btn, confirm); } }),
    ]);
    cluster.replaceChild(confirm, btn);
  }

  function msg(err, fallback) { return (err && err.message) ? err.message : fallback; }

  // ---- load / render -------------------------------------------------------
  function paint(rows) {
    rows = rows || [];
    if (countEl) countEl.textContent = rows.length ? (rows.length + (rows.length === 1 ? " story" : " stories")) : "";

    if (!rows.length) {
      window.Dash.empty(
        host,
        "A blank front page.",
        "Nothing written yet. Start a story and it’ll live here through every draft and edition.",
        UI.Routes.write,
        "Start a story"
      );
      return;
    }

    var byStatus = {};
    rows.forEach(function (a) {
      var s = (a.status || "DRAFT").toUpperCase();
      (byStatus[s] || (byStatus[s] = [])).push(a);
    });

    UI.clear(host);
    GROUPS.forEach(function (g) {
      var items = byStatus[g.key];
      if (items && items.length) host.appendChild(section(g, items));
    });
    UI.initReveals();
  }

  function load() {
    return API.myArticles().then(paint).catch(function (err) { window.Dash.fail(host, err); });
  }

  // ---- stat cards ----------------------------------------------------------
  function loadStats() {
    var statsHost = document.querySelector("[data-desk-stats]");
    if (!statsHost) return;

    API.authorStats().then(function (s) {
      var map = [
        ["data-stat-articles", s.total_articles],
        ["data-stat-published", s.published],
        ["data-stat-views", s.views],
        ["data-stat-likes", s.likes],
        ["data-stat-bookmarks", s.bookmarks],
      ];
      map.forEach(function (pair) {
        var node = statsHost.querySelector("[" + pair[0] + "]");
        if (node) node.textContent = UI.num(pair[1]);
      });
      statsHost.classList.add("desk-stats--loaded");
    }).catch(function () {
      /* Show zeroed stats as fallback so the cards are never invisible */
      var fallback = ["data-stat-articles", "data-stat-published", "data-stat-views", "data-stat-likes", "data-stat-bookmarks"];
      fallback.forEach(function (attr) {
        var node = statsHost.querySelector("[" + attr + "]");
        if (node) node.textContent = "0";
      });
      statsHost.classList.add("desk-stats--loaded");
    });
  }

  // ---- boot ----------------------------------------------------------------
  // `is_author` flips server-side when an editor approves a contributor
  // request, but the cached Session.user only refreshes at login — so confirm
  // with the server before refusing a contributor the desk.
  API.refreshUser().catch(function () { return null; }).then(function (fresh) {
    var user = fresh || API.Session.user || {};
    if (!user.is_author) {
      // Signed in but not yet a contributor — point them at the request page.
      window.Dash.empty(
        host,
        "The desk is for contributors.",
        "Ask for a contributor seat and, once an editor says yes, you can write and submit your own stories here.",
        "/accounts/dashboard/author-request/",
        "Ask to contribute"
      );
      if (countEl) countEl.textContent = "";
      return;
    }

    if (newBtn) newBtn.hidden = false;
    load();
    loadStats();
  });
})();
