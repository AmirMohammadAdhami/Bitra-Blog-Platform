/* ============================================================================
   Story page — full article + engagement + letters (comments).
   Endpoints:
     GET  /blog/articles/:id/            → detail incl. approved_comments
     POST /accounts/likes/toggle/        → per-user like (auth)
     POST /accounts/bookmarks/toggle/    → per-user bookmark (auth)
     POST /blog/comments/                → post letter (auth; enters as PENDING)
     POST /blog/comments/:id/likes/      → like a letter (auth)
   ========================================================================= */
(function () {
  "use strict";
  var API = window.BitraAPI, UI = window.UI, el = UI.el;

  var host = document.querySelector("[data-article]");
  if (!host) return;
  var commentsSection = document.querySelector("[data-comments]");
  var gateHost = document.querySelector("[data-comment-gate]");
  var listHost = document.querySelector("[data-comment-list]");

  // /articles/<id>/  →  id
  var m = location.pathname.match(/\/articles\/(\d+)/);
  var articleId = m ? Number(m[1]) : null;

  var current = null;

  /* ---------------------------------------------------- content rendering */
  // Content is a plain TextField of unknown origin — render as escaped
  // paragraphs (blank-line separated) so author copy can never inject markup.
  function renderContent(text) {
    var frag = document.createDocumentFragment();
    var blocks = String(text || "").replace(/\r\n/g, "\n").split(/\n{2,}/);
    blocks.forEach(function (block) {
      block = block.trim();
      if (!block) return;
      var p = el("p", {});
      block.split(/\n/).forEach(function (line, i) {
        if (i) p.appendChild(el("br"));
        p.appendChild(document.createTextNode(line));
      });
      frag.appendChild(p);
    });
    if (!frag.childNodes.length) frag.appendChild(el("p", { text: "" }));
    return frag;
  }

  /* ------------------------------------------------------------- byline */
  function byline(a) {
    var bits = [
      el("span", { class: "wire", text: "By " + (a.author_name || "Staff") }),
      el("span", { class: "dot", text: "·" }),
      el("span", { class: "wire", text: UI.dateline(a.created_at) }),
      el("span", { class: "dot", text: "·" }),
      el("span", { class: "wire", text: UI.readTime(a) }),
    ];
    if (a.updated_at && a.updated_at !== a.created_at) {
      bits.push(el("span", { class: "dot", text: "·" }));
      bits.push(el("span", { class: "wire", text: "Updated " + UI.timeAgo(a.updated_at) }));
    }
    return el("div", { class: "article__byline" }, bits);
  }

  /* ------------------------------------------------------- action bar */
  function actionBar(a) {
    var authed = API.Session.isAuthed;

    var likeBtn = el("button", {
      class: "btn btn--sm", type: "button", "aria-pressed": "false",
      title: authed ? "Like this story" : "Sign in to like",
    }, [ el("span", { class: "btn__ico", text: "♥" }), el("span", { class: "lbl", text: "Like" }) ]);

    var saveBtn = el("button", {
      class: "btn btn--sm", type: "button", "aria-pressed": "false",
      title: authed ? "Save to your reading list" : "Sign in to save",
    }, [ el("span", { class: "btn__ico", text: "❏" }), el("span", { class: "lbl", text: "Save" }) ]);

    var shareBtn = el("button", {
      class: "btn btn--sm", type: "button", title: "Copy link",
    }, [ el("span", { class: "btn__ico", text: "↗" }), "Share" ]);

    var likeCount = a.likes || 0;

    function setLike(pressed) {
      likeBtn.setAttribute("aria-pressed", pressed ? "true" : "false");
      likeBtn.querySelector(".lbl").textContent = pressed ? "Liked" : "Like";
    }

    likeBtn.addEventListener("click", function () {
      if (!API.Session.isAuthed) { UI.toast("Sign in to like this story."); location.href = UI.Routes.login; return; }
      var was = likeBtn.getAttribute("aria-pressed") === "true";
      setLike(!was);
      likeCount += was ? -1 : 1;
      statLikes.querySelector("b").textContent = UI.num(Math.max(0, likeCount));
      API.toggleLike(a.id).catch(function () {
        setLike(was); likeCount += was ? 1 : -1;
        statLikes.querySelector("b").textContent = UI.num(Math.max(0, likeCount));
        UI.toast("Could not register your like.");
      });
    });

    saveBtn.addEventListener("click", function () {
      if (!API.Session.isAuthed) { UI.toast("Sign in to save stories."); location.href = UI.Routes.login; return; }
      var was = saveBtn.getAttribute("aria-pressed") === "true";
      saveBtn.setAttribute("aria-pressed", was ? "false" : "true");
      saveBtn.querySelector(".lbl").textContent = was ? "Save" : "Saved";
      API.toggleBookmark(a.id)
        .then(function (r) { UI.toast(r && r.status === "unbookmarked" ? "Removed from your list." : "Saved to your list."); })
        .catch(function () {
          saveBtn.setAttribute("aria-pressed", was ? "true" : "false");
          saveBtn.querySelector(".lbl").textContent = was ? "Saved" : "Save";
          UI.toast("Could not update your list.");
        });
    });

    shareBtn.addEventListener("click", function () {
      var url = location.href;
      if (navigator.share) { navigator.share({ title: a.title, url: url }).catch(function(){}); return; }
      navigator.clipboard.writeText(url).then(
        function () { UI.toast("Link copied to clipboard."); },
        function () { UI.toast(url); }
      );
    });

    var statViews = el("div", { class: "stat" }, [ el("b", { text: UI.num(a.views) }), el("span", { class: "wire", text: "views" }) ]);
    var statLikes = el("div", { class: "stat" }, [ el("b", { text: UI.num(likeCount) }), el("span", { class: "wire", text: "likes" }) ]);

    // reflect existing like/bookmark state for signed-in readers
    if (authed) {
      API.myLikes().then(function (rows) {
        if (rows.some(function (r) { return r.article === a.id; })) setLike(true);
      }).catch(function(){});
      API.myBookmarks().then(function (rows) {
        if (rows.some(function (r) { return r.article === a.id; })) {
          saveBtn.setAttribute("aria-pressed", "true");
          saveBtn.querySelector(".lbl").textContent = "Saved";
        }
      }).catch(function(){});
    }

    return el("div", { class: "actions" }, [
      likeBtn, saveBtn, shareBtn,
      el("div", { class: "actions__stats" }, [ statViews, statLikes ]),
    ]);
  }

  /* ---------------------------------------------------------------- tags */
  function tagRow(tags) {
    if (!tags || !tags.length) return null;
    return el("div", { style: "margin-top:1.4rem" }, [
      el("div", { class: "tags" }, tags.map(function (t) {
        return el("a", { class: "tag", href: UI.Routes.articles + "?tag=" + encodeURIComponent(t.slug || t.name), text: "#" + t.name });
      })),
    ]);
  }

  /* --------------------------------------------------------------- render */
  function render(a) {
    current = a;
    document.title = a.title + " — Bitra";
    UI.clear(host);

    var cat = a.category && a.category.name ? a.category.name : "Dispatch";

    if (a.cover_image) {
      host.appendChild(el("div", { class: "article__cover" }, [
        el("img", { src: a.cover_image, alt: a.title, loading: "lazy" }),
      ]));
    }
    host.appendChild(el("div", { class: "article__kicker" }, [
      el("a", { class: "flag", href: UI.Routes.articles, text: cat }),
      el("span", { class: "wire", text: "Filed " + UI.dateline(a.created_at) }),
    ]));
    host.appendChild(el("h1", { class: "article__headline", text: a.title }));
    if (a.summary) host.appendChild(el("p", { class: "article__deck", text: a.summary }));
    host.appendChild(byline(a));
    var body = el("div", { class: "article__body" });
    body.appendChild(renderContent(a.content));
    host.appendChild(body);
    var tags = tagRow(a.tags);
    if (tags) host.appendChild(tags);

    host.appendChild(el("div", { class: "article__foot" }, [ actionBar(a) ]));

    host.appendChild(el("div", { style: "margin-top:2rem" }, [
      el("a", { class: "btn btn--sm", href: UI.Routes.articles, text: "← Back to the index" }),
    ]));

    // comments
    renderComments(a);
    loadRelated(a);
  }

  /* ------------------------------------------------------------- comments */
  function commentNode(c) {
    var node = el("div", { class: "comment" }, [
      el("div", { class: "comment__head" }, [
        el("span", { class: "comment__who", text: c.author_name || "Reader" }),
        el("span", { class: "wire", text: UI.timeAgo(c.created_at) }),
      ]),
      el("div", { class: "comment__body", text: c.content }),
    ]);

    var likeBtn = el("button", { class: "linkbtn", type: "button",
      text: "♥ " + (c.likes_count || 0) });
    likeBtn.addEventListener("click", function () {
      if (!API.Session.isAuthed) { UI.toast("Sign in to like letters."); return; }
      API.likeComment(c.id).then(function (r) {
        var n = Number((likeBtn.textContent.match(/\d+/) || [0])[0]);
        n += (r && r.status === "unliked") ? -1 : 1;
        likeBtn.textContent = "♥ " + Math.max(0, n);
      }).catch(function () { UI.toast("Could not like letter."); });
    });

    var foot = el("div", { class: "comment__foot" }, [ likeBtn ]);
    node.appendChild(foot);

    if (c.children && c.children.length) {
      node.appendChild(el("div", { class: "comment__replies" }, c.children.map(commentNode)));
    }
    return node;
  }

  function renderComments(a) {
    commentsSection.hidden = false;
    var comments = a.approved_comments || [];

    // gate / form
    UI.clear(gateHost);
    if (API.Session.isAuthed) {
      gateHost.appendChild(commentForm(a));
    } else {
      gateHost.appendChild(UI.requireAuthCTA("Sign in to join the correspondence."));
    }

    // list
    UI.clear(listHost);
    var head = el("div", { class: "section-head section-head--sub" }, [
      el("span", { class: "kicker", text: comments.length + (comments.length === 1 ? " letter" : " letters") + " published" }),
    ]);
    listHost.appendChild(head);

    if (!comments.length) {
      listHost.appendChild(el("div", { class: "note-block" }, [
        el("h2", { text: "No letters yet." }),
        el("p", { text: "Be the first to write in." }),
      ]));
      return;
    }
    comments.forEach(function (c) { listHost.appendChild(commentNode(c)); });
  }

  function commentForm(a) {
    var ta = el("textarea", { placeholder: "Write your letter to the editor…", "aria-label": "Your letter", maxlength: "2000" });
    var note = el("div", { class: "form-note" });
    var submit = el("button", { class: "btn btn--ink btn--sm", type: "submit", text: "Send letter" });

    var form = el("form", { class: "comment-form" }, [
      note,
      ta,
      el("div", { class: "comment-form__foot" }, [
        submit,
        el("span", { class: "wire", text: "Letters are reviewed before publication." }),
      ]),
    ]);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var content = ta.value.trim();
      note.className = "form-note";
      if (content.length < 2) { note.className = "form-note is-error"; note.textContent = "Please write a little more."; return; }
      submit.disabled = true; submit.textContent = "Sending…";
      API.postComment(a.id, content).then(function () {
        ta.value = "";
        note.className = "form-note is-ok";
        note.textContent = "Received. Your letter will appear once an editor approves it.";
        UI.toast("Letter submitted for review.");
      }).catch(function (err) {
        note.className = "form-note is-error";
        note.textContent = (err && err.message) || "Could not submit your letter.";
      }).finally(function () { submit.disabled = false; submit.textContent = "Send letter"; });
    });

    return form;
  }

  /* -------------------------------------------------------- related row */
  function loadRelated(a) {
    var catName = a.category && a.category.name;
    if (!catName) return;
    API.articles().then(function (list) {
      var rel = list.filter(function (x) {
        return x.id !== a.id && x.category && x.category.name === catName && (!x.status || x.status === "REVIEWED");
      }).slice(0, 3);
      if (!rel.length) return;
      var section = el("section", { class: "comments" }, [
        el("div", { class: "section-head" }, [ el("span", { class: "flag", text: "More in " + catName }) ]),
        el("div", { class: "grid grid--3" }, rel.map(function (x) {
          return el("article", { class: "story" }, [
            el("h3", { class: "story__headline" }, [ el("a", { href: UI.Routes.article(x.id), text: x.title }) ]),
            x.summary ? el("p", { class: "story__summary", text: UI.excerpt(x.summary, 110) }) : null,
            el("div", { class: "story__foot" }, [ el("span", { class: "wire", text: UI.dateline(x.created_at) }) ]),
          ]);
        })),
      ]);
      commentsSection.parentNode.insertBefore(section, commentsSection);
    }).catch(function(){});
  }

  /* --------------------------------------------------------------- fail */
  function fail(err) {
    UI.clear(host);
    var notFound = err && err.status === 404;
    host.appendChild(el("div", { class: "note-block" }, [
      el("h2", { text: notFound ? "Story not found." : "Stop the presses." }),
      el("p", { text: notFound
        ? "This story may have been unpublished or the link is mistyped."
        : "Could not load this story from the API." + (err && err.status ? " (" + err.status + ")" : "") }),
    ]));
    host.appendChild(el("div", { style: "text-align:center;margin-top:1.5rem" }, [
      el("a", { class: "btn btn--sm", href: UI.Routes.articles, text: "← Back to the index" }),
    ]));
  }

  if (!articleId) { fail({ status: 404 }); return; }
  API.article(articleId).then(render).catch(fail);
})();
