/* ============================================================================
   Saved / Liked collections. One controller, driven by [data-collection].
   The like/bookmark list rows only carry an `article` id, so we join them
   against the full articles list to render real story rows.
   ========================================================================= */
(function () {
  "use strict";
  var API = window.BitraAPI, UI = window.UI, el = UI.el;

  var host = document.querySelector("[data-collection]");
  if (!host) return;
  var kind = host.getAttribute("data-collection"); // "bookmarks" | "likes"

  var COPY = {
    bookmarks: {
      fetch: API.myBookmarks,
      emptyTitle: "Nothing saved yet.",
      emptyLine: "Stories you save with the ribbon will wait for you here.",
      remove: API.toggleBookmark,
      removed: "Removed from your saved stories.",
      action: "Remove",
    },
    likes: {
      fetch: API.myLikes,
      emptyTitle: "No likes yet.",
      emptyLine: "Stories you like will be collected here for easy return.",
      remove: API.toggleLike,
      removed: "Removed from your liked stories.",
      action: "Unlike",
    },
  }[kind];

  function row(article, entry, idx) {
    var cat = article.category && article.category.name ? article.category.name : "Dispatch";
    var aside = el("div", { class: "index__aside" }, [
      el("div", { class: "wire", text: UI.num(article.views) + " views" }),
      el("button", {
        class: "linkbtn", type: "button", text: COPY.action,
        onclick: function (e) {
          var btn = e.currentTarget;
          btn.disabled = true; btn.textContent = "…";
          COPY.remove(article.id).then(function () {
            UI.toast(COPY.removed);
            var node = btn.closest(".index__row");
            if (node) node.remove();
            bump(-1);
          }).catch(function () {
            btn.disabled = false; btn.textContent = COPY.action;
            UI.toast("Could not update. Try again.");
          });
        },
      }),
    ]);

    return el("div", { class: "index__row reveal" }, [
      el("div", { class: "index__num", text: String(idx + 1).padStart(2, "0") }),
      el("div", {}, [
        el("div", { class: "kicker", text: cat }),
        el("h3", { class: "index__hl", style: "margin-top:.35rem" }, [
          el("a", { href: UI.Routes.article(article.id), text: article.title }),
        ]),
        article.summary ? el("p", { class: "index__sum", text: UI.excerpt(article.summary, 180) }) : null,
        el("div", { class: "index__meta" }, [
          UI.authorLink(article.author_name, article.author_slug, null, article.author_name),
          el("span", { class: "wire", text: " · " + UI.dateline(article.created_at) }),
        ]),
      ]),
      aside,
    ]);
  }

  var countEl = document.querySelector("[data-count]");
  var total = 0;
  function bump(delta) {
    total += delta;
    if (countEl) countEl.textContent = total ? (total + (total === 1 ? " story" : " stories")) : "";
    if (total <= 0) window.Dash.empty(host, COPY.emptyTitle, COPY.emptyLine, UI.Routes.articles, "Browse stories");
  }

  Promise.all([COPY.fetch(), API.articles()]).then(function (res) {
    var entries = res[0] || [];
    var articles = res[1] || [];
    var byId = {};
    articles.forEach(function (a) { byId[a.id] = a; });

    // Newest saved/liked first if the row carries a timestamp.
    entries.sort(function (a, b) { return new Date(b.created_at || 0) - new Date(a.created_at || 0); });

    var resolved = entries
      .map(function (entry) { return { entry: entry, article: byId[entry.article] }; })
      .filter(function (x) { return x.article; }); // article may be unpublished/removed

    if (!resolved.length) {
      window.Dash.empty(host, COPY.emptyTitle, COPY.emptyLine, UI.Routes.articles, "Browse stories");
      return;
    }

    UI.clear(host);
    var list = el("div", { class: "index" });
    resolved.forEach(function (x, i) { list.appendChild(row(x.article, x.entry, i)); });
    host.appendChild(list);
    total = resolved.length;
    if (countEl) countEl.textContent = total + (total === 1 ? " story" : " stories");
    UI.initReveals();
  }).catch(function (err) { window.Dash.fail(host, err); });
})();
