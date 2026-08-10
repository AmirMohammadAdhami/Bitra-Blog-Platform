/* ============================================================================
   Front page — builds the whole broadsheet from /api/blog/articles/.
   Lead story (drop cap) + latest rail + ranked "most read" rail,
   then category-flagged story grids below.
   ========================================================================= */
(function () {
  "use strict";
  var API = window.BitraAPI, UI = window.UI, el = UI.el;

  var root = document.querySelector("[data-front]");
  if (!root) return;

  // Only surface reviewed/published stories on the public front page.
  function isPublic(a) { return !a.status || a.status === "REVIEWED"; }

  function metaRow(a, extra) {
    var bits = [
      UI.authorLink(a.author_name, a.author_slug, null, a.author_name),
      el("span", { class: "dot", text: "·" }),
      el("span", { class: "wire", text: UI.dateline(a.created_at) }),
    ];
    if (extra) { bits.push(el("span", { class: "dot", text: "·" })); bits.push(el("span", { class: "wire", text: extra })); }
    return el("div", { class: "story__meta" }, bits);
  }

  function articleLink(a, cls, text) {
    return el("a", { href: UI.Routes.article(a.id), class: cls, text: text });
  }

  /* ------------------------------------------------------------- lead */
  function leadBlock(a) {
    var cat = a.category && a.category.name ? a.category.name : "Dispatch";
    var coverImg = a.cover_image
      ? el("div", { class: "lead__cover" }, [ el("img", { src: a.cover_image, alt: a.title, loading: "lazy" }) ])
      : null;
    return el("article", { class: "lead reveal" }, [
      coverImg,
      el("div", { class: "lead__kicker" }, [
        el("span", { class: "flag", text: cat }),
        el("span", { class: "wire", text: UI.readTime(a) }),
      ]),
      el("h2", { class: "lead__headline" }, [ articleLink(a, "", a.title) ]),
      a.summary ? el("p", { class: "lead__deck", text: UI.excerpt(a.summary, 220) }) : null,
      el("div", { class: "lead__byline" }, [ metaRow(a, UI.num(a.views) + " reading") ]),
      el("div", { style: "margin-top:1rem" }, [
        articleLink(a, "btn btn--ink btn--sm", "Read the full story →"),
      ]),
    ]);
  }
  // The list serializer has no `content`, so compose a teaser from the summary.
  function buildParas(a) {
    var text = (a.content || a.summary || "").replace(/\s+/g, " ").trim();
    if (!text) return [el("p", { text: "" })];
    var sentences = text.split(/(?<=[.!?])\s+/);
    var half = Math.ceil(sentences.length / 2);
    var p1 = sentences.slice(0, half).join(" ");
    var p2 = sentences.slice(half).join(" ");
    var out = [el("p", { text: UI.excerpt(p1, 320) })];
    if (p2) out.push(el("p", { text: UI.excerpt(p2, 300) }));
    return out;
  }

  function railItem(a) {
    return el("div", { class: "rail__item" }, [
      el("a", { href: UI.Routes.article(a.id) }, [
        el("div", { class: "rail__hl", text: a.title }),
        el("div", { class: "rail__meta" }, [ metaRow(a) ]),
      ]),
    ]);
  }

  function latestRail(list) {
    return el("aside", { class: "frontpage__left rail reveal" }, [
      el("div", { class: "rail__title" }, [ el("span", { class: "flag", text: "Latest" }) ]),
      el("div", {}, list.map(railItem)),
    ]);
  }

  function mostReadRail(list) {
    return el("aside", { class: "frontpage__right rail reveal" }, [
      el("div", { class: "rail__title" }, [ el("span", { class: "flag", text: "Most Read" }) ]),
      el("div", { class: "ranked" }, list.map(function (a) {
        return el("div", { class: "rail__item" }, [
          el("a", { href: UI.Routes.article(a.id) }, [
            el("div", { class: "rail__hl", text: a.title }),
            el("div", { class: "rail__meta" }, [
              el("span", { class: "wire", text: UI.num(a.views) + " views · " + UI.num(a.likes) + " likes" }),
            ]),
          ]),
        ]);
      })),
    ]);
  }

  /* ------------------------------------------------------- story grid */
  function storyCard(a, wide) {
    var cat = a.category && a.category.name ? a.category.name : "Dispatch";
    var coverImg = a.cover_image
      ? el("div", { class: "story__cover" }, [ el("img", { src: a.cover_image, alt: a.title, loading: "lazy" }) ])
      : null;
    return el("article", { class: "story reveal" + (wide ? " story--wide" : "") }, [
      coverImg,
      el("div", { class: "story__kicker" }, [ el("span", { class: "kicker", text: cat }) ]),
      el("h3", { class: "story__headline" }, [ articleLink(a, "", a.title) ]),
      a.summary ? el("p", { class: "story__summary", text: UI.excerpt(a.summary, wide ? 200 : 130) }) : null,
      el("div", { class: "story__foot" }, [ metaRow(a, UI.readTime(a)) ]),
    ]);
  }

  function sectionHead(label, count) {
    return el("div", { class: "section-head" }, [
      el("span", { class: "flag", text: label }),
      count ? el("span", { class: "wire", text: count + (count === 1 ? " story" : " stories") }) : null,
    ]);
  }

  function grid(list) {
    return el("div", { class: "grid" }, list.map(function (a, i) { return storyCard(a, false); }));
  }

  /* --------------------------------------------------------- assemble */
  function render(articles) {
    UI.clear(root);

    var pub = articles.filter(isPublic);
    if (!pub.length) pub = articles.slice(); // fall back to whatever exists

    if (!pub.length) {
      root.appendChild(el("div", { class: "note-block" }, [
        el("h2", { text: "The presses are warm." }),
        el("p", { text: "No stories have been published yet. Check back shortly." }),
      ]));
      return;
    }

    var byDate = pub.slice().sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    var byViews = pub.slice().sort(function (a, b) { return (b.views || 0) - (a.views || 0); });

    var lead = byViews[0] || byDate[0];
    var used = {}; used[lead.id] = true;

    var latest = byDate.filter(function (a) { return !used[a.id]; }).slice(0, 4);
    latest.forEach(function (a) { used[a.id] = true; });

    var mostRead = byViews.filter(function (a) { return a.id !== lead.id; }).slice(0, 5);

    // front hero row
    root.appendChild(el("section", { class: "frontpage", "aria-label": "Lead stories" }, [
      latestRail(latest),
      el("div", { class: "frontpage__mid" }, [ leadBlock(lead) ]),
      mostReadRail(mostRead),
    ]));

    root.appendChild(el("hr", { class: "rule", style: "margin-top:2rem" }));

    // group the rest by category → flagged sections
    var rest = byDate.filter(function (a) { return !used[a.id]; });
    var groups = {};
    var order = [];
    rest.forEach(function (a) {
      var key = a.category && a.category.name ? a.category.name : "Dispatches";
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(a);
    });

    if (!order.length) {
      // few articles — show a simple "More stories" strip from latest rail leftovers
      var more = byDate.filter(function (a) { return a.id !== lead.id; });
      if (more.length) {
        root.appendChild(sectionHead("More Stories", more.length));
        root.appendChild(grid(more.slice(0, 8)));
      }
    } else {
      order.forEach(function (key) {
        root.appendChild(sectionHead(key, groups[key].length));
        root.appendChild(grid(groups[key].slice(0, 8)));
      });
    }

    UI.initReveals();

    // Load popular authors after articles render
    loadPopularAuthors();
  }

  /* ------------------------------------------------------- popular authors */
  function loadPopularAuthors() {
    var section = document.querySelector("[data-popular-authors]");
    var grid = document.querySelector("[data-popauth-grid]");
    if (!grid || !section) return;

    API.popularAuthors(4).then(function (authors) {
      UI.clear(grid);
      if (!authors || !authors.length) {
        // No popular authors — hide the entire section silently
        section.hidden = true;
        return;
      }
      authors.forEach(function (p) {
        var user = p.user || {};
        var name = user.full_name || user.username || "Author";
        var slug = p.slug || "";
        var href = slug ? "/profile/" + slug + "/" : "#";
        var likes = p.total_likes || 0;

        var avatarInner;
        if (p.profile_image) {
          avatarInner = el("img", { src: p.profile_image, alt: name + " avatar" });
        } else {
          avatarInner = el("span", { text: (name.charAt(0) || "·").toUpperCase() });
        }

        grid.appendChild(
          el("a", { class: "popauth-card reveal", href: href }, [
            el("div", { class: "popauth-card__avatar" }, [ avatarInner ]),
            el("div", { class: "popauth-card__name", text: name }),
            user.username ? el("div", { class: "popauth-card__user wire", text: "@" + user.username }) : null,
            el("div", { class: "popauth-card__likes" }, [
              el("span", { class: "popauth-card__likes-num", text: UI.num(likes) }),
              el("span", { class: "popauth-card__likes-label", text: " likes" }),
            ]),
          ])
        );
      });
      UI.initReveals();
    }).catch(function () {
      // API error — hide the section gracefully (non-critical)
      section.hidden = true;
    });
  }

  function fail(err) {
    UI.clear(root);
    var offline = !err || err.status === 0 || err.status === undefined;
    root.appendChild(el("div", { class: "note-block" }, [
      el("h2", { text: "Stop the presses." }),
      el("p", { text: offline
        ? "Could not reach the newsroom API. Is the Django server running?"
        : ("The API responded with an error (" + (err.status || "?") + "). " + (err.message || "")) }),
    ]));
  }

  API.articles().then(render).catch(fail);
})();
