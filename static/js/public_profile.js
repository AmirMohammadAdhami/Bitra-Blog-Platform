/* ========================================================================
   Public Profile — /profile/<slug>/
   Fetches profile data via API, renders info + author articles with filters.
   ======================================================================== */
(function () {
  "use strict";
  var API = window.BitraAPI, UI = window.UI, el = UI.el;

  /* — DOM references — */
  var host       = document.querySelector("[data-pubprof]");
  if (!host) return;

  // When the server already rendered the profile (SSR), skip the full
  // rebuild and only enhance (sort articles, load interactive features).
  var ssrRendered = host.hasAttribute("data-ssr");
  var loading    = host.querySelector(".pubprof__loading");
  var card       = host.querySelector(".pubprof__card");
  var errorEl    = host.querySelector(".pubprof__error");

  var imgEl      = host.querySelector("[data-pubprof-img]");
  var nameEl     = host.querySelector("[data-pubprof-name]");
  var locationEl = host.querySelector("[data-pubprof-location]");
  var bioEl      = host.querySelector("[data-pubprof-bio]");
  var metaEl     = host.querySelector("[data-pubprof-meta]");
  var socialsEl  = host.querySelector("[data-pubprof-socials]");

  var statsEl    = host.querySelector("[data-pubprof-stats]");
  var statArticles = host.querySelector("[data-pubprof-articles]");
  var statLikes    = host.querySelector("[data-pubprof-likes]");
  var statViews    = host.querySelector("[data-pubprof-views]");

  var articlesSection = host.querySelector("[data-pubprof-articles-section]");
  var filterHost      = host.querySelector("[data-pubprof-filters]");
  var listHost        = host.querySelector("[data-pubprof-article-list]");

  /* — Extract slug from URL: /profile/<slug>/ — */
  var pathParts = location.pathname.replace(/\/+$/, "").split("/");
  var slug = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
  if (!slug) { showError(); return; }

  /* — State — */
  var profile = null;
  var articles = [];
  var PAGE_SIZE = 10;
  var sortMode = "date";
  var currentPage = 1;

  /* — Helpers — */
  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }

  function showError() {
    hide(loading); hide(card);
    show(errorEl);
  }

  function sorter(mode) {
    if (mode === "oldest") return function (a, b) { return new Date(a.created_at) - new Date(b.created_at); };
    if (mode === "likes")  return function (a, b) { return (b.likes || 0) - (a.likes || 0); };
    if (mode === "views")  return function (a, b) { return (b.views || 0) - (a.views || 0); };
    return function (a, b) { return new Date(b.created_at) - new Date(a.created_at); };
  }

  /* — Render profile — */
  function renderProfile(p) {
    profile = p;
    var user = p.user || {};

    // Avatar
    if (imgEl) {
      if (p.profile_image) {
        imgEl.src = p.profile_image;
        imgEl.alt = (user.username || "Author") + " avatar";
      } else {
        imgEl.src = "";
        imgEl.alt = "";
        imgEl.style.display = "none";
      }
    }

    // Name & info
    if (nameEl) nameEl.textContent = user.full_name || user.username || "Reader";
    document.title = (user.username || "Profile") + " — Bitra";

    // Location
    if (locationEl) {
      var loc = [p.city, p.country_name].filter(Boolean).join(", ");
      locationEl.textContent = loc || "";
      hide(locationEl);
    }

    // Bio
    if (bioEl) {
      if (p.bio) {
        bioEl.textContent = p.bio;
      } else {
        hide(bioEl);
      }
    }

    // Member since
    if (metaEl) metaEl.textContent = "Member since " + UI.dateline(p.created_at);

    // Social links
    var links = p.social_link || [];
    if (socialsEl && links.length) {
      show(socialsEl);
      links.forEach(function (link) {
        var detail = link.platform_detail || {};
        var platName = detail.name || "Link";
        var platIcon = detail.icon || "";
        var href = link.url || "#";

        var iconNode = platIcon
          ? el("img", { src: platIcon, alt: platName, class: "pubprof__social-icon", onerror: function () { this.style.display = "none"; } })
          : el("span", { class: "pubprof__social-icon pubprof__social-icon--text", text: platName.charAt(0).toUpperCase() });

        socialsEl.appendChild(
          el("a", { class: "pubprof__social", href: href, target: "_blank", rel: "noopener noreferrer", title: platName }, [
            iconNode,
            el("span", { class: "pubprof__social-name", text: platName }),
          ])
        );
      });
    }

    // Author sections
    if (user.is_author && p.author_stats) {
      var stats = p.author_stats;
      if (statArticles) statArticles.textContent = UI.num(stats.total_articles);
      if (statLikes) statLikes.textContent    = UI.num(stats.likes);
      if (statViews) statViews.textContent    = UI.num(stats.views);
      show(statsEl);
      show(articlesSection);
      loadArticles(user.username);
    }
  }

  /* — Pager DOM refs — */
  var pagerHost   = host.querySelector("[data-pubprof-pager]");
  var pagerPrev   = host.querySelector("[data-pubprof-prev]");
  var pagerNext   = host.querySelector("[data-pubprof-next]");
  var pagerInfo   = host.querySelector("[data-pubprof-pager-info]");

  /* — Render article list (paginated) — */
  function renderArticles() {
    if (!listHost) return;
    UI.clear(listHost);
    var sorted = articles.slice().sort(sorter(sortMode));
    var total = sorted.length;
    var pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > pages) currentPage = pages;

    var start = (currentPage - 1) * PAGE_SIZE;
    var slice = sorted.slice(start, start + PAGE_SIZE);

    if (!total) {
      listHost.appendChild(el("div", { class: "note-block" }, [
        el("p", { text: "No published stories yet." }),
      ]));
    } else {
      var wrap = el("div", { class: "index" }, slice.map(function (a, i) {
        var cat = a.category && a.category.name ? a.category.name : "Dispatch";
        return el("div", { class: "index__row reveal" }, [
          el("span", { class: "index__num", text: String(start + i + 1).padStart(2, "0") }),
          el("div", {}, [
            el("div", { class: "kicker", text: cat }),
            el("h2", { class: "index__hl" }, [
              el("a", { href: UI.Routes.article(a.id), text: a.title }),
            ]),
            a.summary ? el("p", { class: "index__sum", text: UI.excerpt(a.summary, 180) }) : null,
            el("div", { class: "index__meta" }, [
              el("span", { class: "wire", text: UI.dateline(a.created_at) + " · " + UI.readTime(a) }),
            ]),
          ]),
          el("div", { class: "index__aside" }, [
            el("div", { class: "wire", text: UI.num(a.views) + " views" }),
            el("div", { class: "wire", text: UI.num(a.likes) + " likes" }),
          ]),
        ]);
      }));
      listHost.appendChild(wrap);
      UI.initReveals();
    }

    renderPager(total, pages);
  }

  function renderPager(total, pages) {
    if (!pagerHost) return;
    if (pages <= 1) { pagerHost.style.display = "none"; return; }
    pagerHost.style.display = "";
    pagerInfo.textContent = "Page " + currentPage + " of " + pages + "  ·  " + total + " stories";
    pagerPrev.disabled = currentPage <= 1;
    pagerNext.disabled = currentPage >= pages;
  }

  function goPage(p) {
    currentPage = p;
    renderArticles();
    listHost.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* — Fetch all pages — */
  function loadArticles(username) {
    var merged = [];
    function fetchPage(page) {
      return API.authorArticles(username, page, PAGE_SIZE).then(function (res) {
        var items = (res && Array.isArray(res.results)) ? res.results : [];
        merged = merged.concat(items);
        if (res && res.next) return fetchPage(page + 1);
        return merged;
      });
    }
    fetchPage(1).then(function (list) {
      articles = list;
      renderArticles();
    }).catch(function () {
      articles = [];
      renderArticles();
    });
  }

  /* — Filter chips — */
  if (filterHost) {
    filterHost.addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn) return;
      sortMode = btn.dataset.sort || "date";
      currentPage = 1;
      UI.qsa(".chip", filterHost).forEach(function (c) {
        c.setAttribute("aria-pressed", c === btn ? "true" : "false");
      });
      renderArticles();
    });
  }

  /* — Pager buttons — */
  var totalPages = function () { return Math.max(1, Math.ceil(articles.length / PAGE_SIZE)); };
  if (pagerPrev) pagerPrev.addEventListener("click", function () { if (currentPage > 1) goPage(currentPage - 1); });
  if (pagerNext) pagerNext.addEventListener("click", function () { if (currentPage < totalPages()) goPage(currentPage + 1); });

  /* — Boot — try slug first, then username fallback — */
  API.publicProfile(slug).then(function (p) {
    if (ssrRendered) {
      // Content is already visible — just update document title and
      // wire up filter chips + pager (article list is already in DOM)
      var user = p.user || {};
      document.title = (user.username || "Profile") + " — Bitra";
      // Store articles from API for client-side sorting/filtering
      if (user.is_author && p.author_stats) {
        API.authorArticles(user.username, 1, 100).then(function (res) {
          articles = (res && Array.isArray(res.results)) ? res.results : [];
        }).catch(function () {});
      }
    } else {
      hide(loading);
      show(card);
      renderProfile(p);
    }
  }).catch(function () {
    if (ssrRendered) return; // Don't show error if SSR content is visible
    // If slug lookup failed, try as username
    API.publicProfileByUsername(slug).then(function (p) {
      hide(loading);
      show(card);
      renderProfile(p);
    }).catch(showError);
  });
})();
