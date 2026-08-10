/* ============================================================================
   The Index — filterable / searchable / sortable list of all stories.
   Category chips are built from the articles themselves; sort is driven by
   the ?sort= query param (views | likes | date).
   ========================================================================= */
(function () {
  "use strict";
  var API = window.BitraAPI, UI = window.UI, el = UI.el;

  var indexHost = document.querySelector("[data-index]");
  var chipHost = document.querySelector("[data-chips]");
  var searchInput = document.querySelector("[data-search]");
  if (!indexHost) return;

  var state = {
    all: [],
    cat: "",
    q: "",
    sort: new URLSearchParams(location.search).get("sort") || "date",
  };

  function isPublic(a) { return !a.status || a.status === "REVIEWED"; }

  function sorter(a, b) {
    if (state.sort === "views") return (b.views || 0) - (a.views || 0);
    if (state.sort === "likes") return (b.likes || 0) - (a.likes || 0);
    return new Date(b.created_at) - new Date(a.created_at);
  }

  function apply() {
    var q = state.q.trim().toLowerCase();
    var list = state.all.filter(function (a) {
      if (state.cat && !(a.category && a.category.name === state.cat)) return false;
      if (q) {
        var hay = (a.title + " " + (a.summary || "") + " " + (a.author_name || "")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    }).sort(sorter);
    renderList(list);
  }

  function row(a, i) {
    var cat = a.category && a.category.name ? a.category.name : "Dispatch";
    return el("div", { class: "index__row reveal" }, [
      el("span", { class: "index__num", text: String(i + 1).padStart(2, "0") }),
      el("div", {}, [
        el("div", { class: "kicker", text: cat }),
        el("h2", { class: "index__hl" }, [ el("a", { href: UI.Routes.article(a.id), text: a.title }) ]),
        a.summary ? el("p", { class: "index__sum", text: UI.excerpt(a.summary, 180) }) : null,
        el("div", { class: "index__meta" }, [
          UI.authorLink(a.author_name, a.author_slug, null, a.author_name),
          el("span", { class: "wire", text: " · " + UI.dateline(a.created_at) + " · " + UI.readTime(a) }),
        ]),
      ]),
      el("div", { class: "index__aside" }, [
        el("div", { class: "wire", text: UI.num(a.views) + " views" }),
        el("div", { class: "wire", text: UI.num(a.likes) + " likes" }),
      ]),
    ]);
  }

  function renderList(list) {
    UI.clear(indexHost);
    if (!list.length) {
      indexHost.appendChild(el("div", { class: "note-block" }, [
        el("h2", { text: "No stories match." }),
        el("p", { text: state.q ? "Try a different search term." : "This section is empty for now." }),
      ]));
      return;
    }
    var wrap = el("div", { class: "index" }, list.map(row));
    indexHost.appendChild(wrap);
    UI.initReveals();
  }

  function buildChips() {
    var names = {};
    state.all.forEach(function (a) { if (a.category && a.category.name) names[a.category.name] = true; });
    Object.keys(names).sort().forEach(function (name) {
      chipHost.appendChild(el("button", { class: "chip", "data-cat": name, "aria-pressed": "false", text: name }));
    });
    chipHost.addEventListener("click", function (e) {
      var btn = e.target.closest(".chip"); if (!btn) return;
      state.cat = btn.dataset.cat || "";
      UI.qsa(".chip", chipHost).forEach(function (c) { c.setAttribute("aria-pressed", c === btn ? "true" : "false"); });
      apply();
    });
  }

  function initSearch() {
    if (!searchInput) return;
    var t;
    searchInput.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () { state.q = searchInput.value; apply(); }, 160);
    });
  }

  function fail(err) {
    UI.clear(indexHost);
    indexHost.appendChild(el("div", { class: "note-block" }, [
      el("h2", { text: "Stop the presses." }),
      el("p", { text: "Could not load stories from the API." + (err && err.status ? " (" + err.status + ")" : "") }),
    ]));
  }

  API.articles().then(function (list) {
    state.all = list.filter(isPublic);
    if (!state.all.length) state.all = list;
    buildChips();
    initSearch();
    apply();
  }).catch(fail);
})();
