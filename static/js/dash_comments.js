/* ============================================================================
   My comments. Lists the reader's own comments across every status, grouped
   under Published / Awaiting approval / Not published so they can see what's
   live and what an editor is still holding.
   Source: GET /blog/comments/mine/ (each row carries article + article_title).
   ========================================================================= */
(function () {
  "use strict";
  var API = window.BitraAPI, UI = window.UI, el = UI.el;

  var host = document.querySelector("[data-comments]");
  if (!host) return;

  // Display order + copy for each status group. Rejected sits last.
  var GROUPS = [
    { key: "APPROVED", flag: "Published", blurb: "Live on the story." },
    { key: "PENDING", flag: "Awaiting approval", blurb: "An editor is reading these before they appear." },
    { key: "REJECTED", flag: "Not published", blurb: "These weren’t approved for the thread." },
  ];

  function commentRow(c) {
    var title = c.article_title || "a story";
    var link = c.article != null ? UI.Routes.article(c.article) : null;
    var head = link
      ? el("a", { href: link, text: title })
      : document.createTextNode(title);

    var meta = el("div", { class: "mycom__meta" }, [
      el("span", { class: "wire", text: "On " }),
      el("span", { class: "mycom__on" }, [head]),
      el("span", { class: "wire", text: " · " + UI.dateline(c.created_at) }),
      Number(c.likes_count) > 0
        ? el("span", { class: "wire", text: " · " + UI.num(c.likes_count) + (Number(c.likes_count) === 1 ? " like" : " likes") })
        : null,
    ]);

    return el("div", { class: "mycom reveal" }, [
      el("blockquote", { class: "mycom__body", text: c.content || "" }),
      meta,
    ]);
  }

  function section(group, items) {
    var cls = "mycom__group" + (group.key === "PENDING" ? " mycom__group--pending" : "");
    var wrap = el("section", { class: cls }, [
      el("div", { class: "mycom__grouphd" }, [
        el("span", { class: "flag", text: group.flag }),
        el("span", { class: "wire", text: items.length + (items.length === 1 ? " comment" : " comments") }),
      ]),
      el("p", { class: "mycom__blurb wire", text: group.blurb }),
    ]);
    items.forEach(function (c) { wrap.appendChild(commentRow(c)); });
    return wrap;
  }

  var countEl = document.querySelector("[data-count]");

  API.myComments().then(function (rows) {
    rows = rows || [];

    if (!rows.length) {
      window.Dash.empty(
        host,
        "You haven’t written yet.",
        "Join a conversation under any story and your letters will gather here — including ones still awaiting an editor.",
        UI.Routes.articles,
        "Read the stories"
      );
      if (countEl) countEl.textContent = "";
      return;
    }

    // Bucket by status.
    var byStatus = {};
    rows.forEach(function (c) {
      var s = (c.status || "PENDING").toUpperCase();
      (byStatus[s] || (byStatus[s] = [])).push(c);
    });

    UI.clear(host);
    GROUPS.forEach(function (g) {
      var items = byStatus[g.key];
      if (items && items.length) host.appendChild(section(g, items));
    });

    if (countEl) countEl.textContent = rows.length + (rows.length === 1 ? " comment" : " comments");
    UI.initReveals();
  }).catch(function (err) { window.Dash.fail(host, err); });
})();
