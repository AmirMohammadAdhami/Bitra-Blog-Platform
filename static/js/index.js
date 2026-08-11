/* ============================================================================
   The Index — filterable / searchable / sortable list of all stories.
   Category chips are built from the articles themselves; sort is driven by
   the ?sort= query param (views | likes | date).

   Pagination is client-side: we fetch every page from the DRF paginated API
   at load time, merge them into one array, then slice for the current page.
   ========================================================================= */
(function () {
  "use strict";
  var API = window.BitraAPI, UI = window.UI, el = UI.el;

  var indexHost = document.querySelector("[data-index]");
  var chipHost = document.querySelector("[data-chips]");
  var searchInput = document.querySelector("[data-search]");
  var pagerHost = document.querySelector("[data-pager]");
  var pagerPrev = document.querySelector("[data-pager-prev]");
  var pagerNext = document.querySelector("[data-pager-next]");
  var pagerInfo = document.querySelector("[data-pager-info]");
  if (!indexHost) return;

  var PAGE_SIZE = 10;

  var state = {
    all: [],          // every published article (all pages merged)
    filtered: [],     // after category + search filter
    sort: new URLSearchParams(location.search).get("sort") || "date",
    cat: "",
    q: "",
    page: 1,
  };

  function isPublic(a) { return !a.status || a.status === "REVIEWED"; }

  function sorter(a, b) {
    if (state.sort === "views") return (b.views || 0) - (a.views || 0);
    if (state.sort === "likes") return (b.likes || 0) - (a.likes || 0);
    return new Date(b.created_at) - new Date(a.created_at);
  }

  /* ---------- filtering + sorting ---------- */
  function apply() {
    var q = state.q.trim().toLowerCase();
    state.filtered = state.all.filter(function (a) {
      if (state.cat && !(a.category && a.category.name === state.cat)) return false;
      if (q) {
        var hay = (a.title + " " + (a.summary || "") + " " + (a.author_name || "")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    }).sort(sorter);

    // Reset to page 1 when filters change
    state.page = 1;
    renderPage();
  }

  /* ---------- row rendering ---------- */
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

  /* ---------- pagination ---------- */
  function totalPages() {
    return Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
  }

  function renderPage() {
    var total = state.filtered.length;
    var pages = totalPages();
    if (state.page > pages) state.page = pages;

    var start = (state.page - 1) * PAGE_SIZE;
    var slice = state.filtered.slice(start, start + PAGE_SIZE);

    UI.clear(indexHost);
    if (!total) {
      indexHost.appendChild(el("div", { class: "note-block" }, [
        el("h2", { text: "No stories match." }),
        el("p", { text: state.q ? "Try a different search term." : "This section is empty for now." }),
      ]));
    } else {
      var wrap = el("div", { class: "index" }, slice.map(function (a, i) {
        return row(a, start + i);
      }));
      indexHost.appendChild(wrap);
      UI.initReveals();
    }

    renderPager(total, pages);
  }

  function renderPager(total, pages) {
    if (!pagerHost) return;
    if (pages <= 1) {
      pagerHost.style.display = "none";
      return;
    }
    pagerHost.style.display = "";

    pagerInfo.textContent = "Page " + state.page + " of " + pages + "  ·  " + total + " stories";
    pagerPrev.disabled = state.page <= 1;
    pagerNext.disabled = state.page >= pages;
  }

  function goPage(p) {
    state.page = p;
    renderPage();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- category chips ---------- */
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

  /* ---------- search ---------- */
  function initSearch() {
    if (!searchInput) return;
    var t;
    searchInput.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () { state.q = searchInput.value; apply(); }, 160);
    });
  }

  /* ---------- error state ---------- */
  function fail(err) {
    UI.clear(indexHost);
    indexHost.appendChild(el("div", { class: "note-block" }, [
      el("h2", { text: "Stop the presses." }),
      el("p", { text: "Could not load stories from the API." + (err && err.status ? " (" + err.status + ")" : "") }),
    ]));
  }

  /* ---------- fetch all pages ---------- */
  function fetchAll() {
    var merged = [];

    function fetchPage(page) {
      return API.articles(page, PAGE_SIZE).then(function (res) {
        var items = (res && Array.isArray(res.results)) ? res.results : [];
        merged = merged.concat(items);

        if (res && res.next) {
          return fetchPage(page + 1);
        }
        return merged;
      });
    }

    return fetchPage(1);
  }

  /* ---------- init ---------- */
  fetchAll().then(function (list) {
    state.all = list.filter(isPublic);
    if (!state.all.length) state.all = list;
    buildChips();
    initSearch();
    apply();
  }).catch(fail);

  /* ---------- pager button handlers ---------- */
  if (pagerPrev) {
    pagerPrev.addEventListener("click", function () {
      if (state.page > 1) goPage(state.page - 1);
    });
  }
  if (pagerNext) {
    pagerNext.addEventListener("click", function () {
      if (state.page < totalPages()) goPage(state.page + 1);
    });
  }
})();
