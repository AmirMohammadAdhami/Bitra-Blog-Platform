/* ============================================================================
   Story editor — compose a new piece or edit one of your own drafts.
     /accounts/dashboard/write/        → create   (POST /blog/articles/)
     /accounts/dashboard/write/<id>/   → edit     (GET then PATCH /blog/articles/<id>/)
   Only DRAFT and REJECTED stories are editable; anything with the editors is
   shown read-only with a way back. "Save draft" persists; "Submit for review"
   persists then hands the piece to the editors (→ SUBMITTED) and returns to the
   desk. Cover uploads ride along as multipart via the API client.
   ========================================================================= */
(function () {
  "use strict";
  var API = window.BitraAPI, UI = window.UI, el = UI.el;

  var host = document.querySelector("[data-editor]");
  if (!host) return;
  var titleEl = document.querySelector("[data-editor-title]");

  var EDITABLE = { DRAFT: 1, REJECTED: 1 };

  // /accounts/dashboard/write/  → null (create) ; /accounts/dashboard/write/12/ → 12 (edit)
  var m = location.pathname.match(/\/accounts\/dashboard\/write\/(\d+)\/?$/);
  var articleId = m ? Number(m[1]) : null;

  // ---- small helpers -------------------------------------------------------
  function field(label, control, hint) {
    return el("div", { class: "field" }, [
      el("label", { text: label }),
      control,
      hint ? el("p", { class: "field__hint wire", text: hint }) : null,
    ]);
  }

  function categorySelect(cats, currentId) {
    var wrap = el("div", { class: "custom-sel-wrap" });
    var options = cats.map(function (c) {
      return { value: c.id, label: c.name };
    });
    var cs = CustomSelect.create(wrap, {
      name: "category",
      options: options,
      value: currentId ? String(currentId) : "",
      placeholder: "Choose a section",
    });
    wrap._cs = cs;
    return wrap;
  }

  // Free-form tag input — authors type tag names, press Enter to add.
  function tagInput(initialNames) {
    var tags = Array.isArray(initialNames) ? initialNames.slice() : [];
    var wrap = el("div", { class: "tagpick" });
    var chipsWrap = el("div", { class: "tagpick__chips" });
    var input = el("input", {
      type: "text",
      class: "tagpick__input",
      placeholder: "Type a tag and press Enter",
    });
    var hint = el("p", { class: "wire field__hint", text: "Press Enter to add a tag. Click × to remove." });

    function renderChips() {
      UI.clear(chipsWrap);
      tags.forEach(function (name, i) {
        var chip = el("span", { class: "tagchip" }, [
          name,
          el("button", {
            type: "button",
            class: "tagchip__rm",
            "aria-label": "Remove " + name,
            text: "\u00d7",
            onclick: function () {
              tags.splice(i, 1);
              renderChips();
            },
          }),
        ]);
        chipsWrap.appendChild(chip);
      });
    }

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        var val = input.value.trim();
        if (!val) return;
        if (tags.indexOf(val) === -1) {
          tags.push(val);
        }
        input.value = "";
        renderChips();
      }
    });

    wrap.appendChild(chipsWrap);
    wrap.appendChild(input);
    wrap.appendChild(hint);

    wrap._selected = function () { return tags.slice(); };
    renderChips();
    return wrap;
  }

  // ---- locked view (story is with the editors / already published) ---------
  function renderLocked(article) {
    UI.clear(host);
    var published = article.status === "REVIEWED";
    var block = el("div", { class: "note-block" }, [
      el("h2", { text: published ? "This story is published." : "This story is with the editors." }),
      el("p", {
        text: published
          ? "Published pieces are locked here. Reach an editor if it needs a correction."
          : "You can’t edit a story while it’s under review. Withdraw it to keep working.",
      }),
    ]);
    var row = el("div", { style: "margin-top:1.2rem;display:flex;gap:.8rem;justify-content:center;flex-wrap:wrap" });
    if (published) {
      row.appendChild(el("a", { class: "btn btn--sm btn--ink", href: UI.Routes.article(article.id), text: "Read it" }));
    } else {
      row.appendChild(el("button", {
        class: "btn btn--sm btn--ink", type: "button", text: "Withdraw to edit",
        onclick: function (e) {
          var b = e.currentTarget; b.disabled = true; b.textContent = "Pulling…";
          API.withdrawArticle(article.id).then(function () {
            UI.toast("Back in your drafts."); location.reload();
          }).catch(function (err) { b.disabled = false; b.textContent = "Withdraw to edit"; UI.toast(msg(err, "Could not withdraw.")); });
        },
      }));
    }
    row.appendChild(el("a", { class: "btn btn--sm", href: UI.Routes.desk, text: "Back to desk" }));
    block.appendChild(row);
    host.appendChild(block);
  }

  function msg(err, fallback) { return (err && err.message) ? err.message : fallback; }

  // ---- form ----------------------------------------------------------------
  function render(cats, article) {
    UI.clear(host);
    article = article || null;
    if (titleEl) titleEl.textContent = article ? "Edit story" : "New story";

    var note = el("div", { class: "form-note", role: "alert" });

    // Cover -----------------------------------------------------------------
    var coverState = { file: null };
    var prev = el("div", { class: "coverprev" });
    function showPreview(src) {
      UI.clear(prev);
      if (src) {
        prev.appendChild(el("img", { src: src, alt: "Cover preview" }));
        prev.classList.remove("is-empty");
      } else {
        prev.appendChild(UI.coverImg(article, "coverprev__placeholder"));
        prev.classList.add("is-empty");
      }
    }
    showPreview(article && article.cover_image ? article.cover_image : null);

    var fileInput = el("input", { type: "file", name: "cover_image", accept: "image/*", class: "coverfile" });
    fileInput.addEventListener("change", function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) { UI.toast("Choose an image file."); fileInput.value = ""; return; }
      coverState.file = f;
      showPreview(URL.createObjectURL(f));
    });
    var coverField = el("div", { class: "field editor__cover" }, [
      el("label", { text: "Cover image" }),
      el("div", { class: "coverrow" }, [
        prev,
        el("div", {}, [
          el("label", { class: "btn btn--sm coverpick" }, [ "Choose image", fileInput ]),
          el("p", { class: "field__hint wire", text: "Optional. Wide images sit best at the top of a story." }),
        ]),
      ]),
    ]);

    // Text fields -----------------------------------------------------------
    var title = el("input", { type: "text", name: "title", maxlength: "200", placeholder: "A headline that earns the read" });
    title.value = article ? (article.title || "") : "";

    var summary = el("textarea", { name: "summary", maxlength: "400", placeholder: "One or two sentences to sit under the headline." });
    summary.value = article ? (article.summary || "") : "";

    var category = categorySelect(cats, article && article.category ? article.category.id : "");

    var initialTagNames = article && Array.isArray(article.tags) ? article.tags.map(function (t) { return t.name; }) : [];
    var tags = tagInput(initialTagNames);

    var content = el("div", { id: "editor-content", class: "editor__content" });
    content.innerHTML = article ? (article.content || "") : "";
    var contentData = { value: article ? (article.content || "") : "" };

    // Actions ---------------------------------------------------------------
    var saveBtn = el("button", { class: "btn", type: "button", text: "Save draft" });
    var submitBtn = el("button", { class: "btn btn--ink", type: "button", text: "Submit for review" });
    var actions = el("div", { class: "editor__actions" }, [ saveBtn, submitBtn ]);

    var form = el("form", { class: "editor", novalidate: true }, [
      note,
      coverField,
      field("Headline", title),
      field("Standfirst", summary, "The summary shown on the front page and story cards."),
      el("div", { class: "field__row" }, [
        field("Section", category),
        el("div", { class: "field" }, [ el("label", { text: "Tags" }), tags ]),
      ]),
      field("Story", content),
      actions,
    ]);
    host.appendChild(form);

    // ---- initialise CKEditor 4 ------------------------------------------
    if (typeof CKEDITOR !== "undefined") {
      CKEDITOR.replace("editor-content", {
        toolbar: [
          ["Format"],
          ["Bold", "Italic", "Underline", "Strike"],
          ["Link", "Unlink"],
          ["NumberedList", "BulletedList"],
          ["Blockquote"],
          ["Image", "Table"],
          ["Undo", "Redo"],
          ["Source"],
        ],
        height: 500,
        width: "100%",
        removePlugins: "elementspath,styles,codeSnippet",
        resize_enabled: true,
        on: {
          change: function () { contentData.value = this.getData(); },
          instanceReady: function () { this.setData(contentData.value); },
        },
      });
    }

    // ---- collect + validate ----------------------------------------------
    function collect() {
      var fields = {
        title: title.value.trim(),
        summary: summary.value.trim(),
        content: contentData.value.trim(),
        category: category._cs ? Number(category._cs.getValue()) : null,
        tags: tags._selected(),
      };
      if (coverState.file) fields.cover_image = coverState.file;

      var missing = [];
      if (!fields.title) missing.push("a headline");
      if (!fields.summary) missing.push("a standfirst");
      if (!fields.category) missing.push("a section");
      if (!fields.content) missing.push("the story");
      if (missing.length) {
        note.className = "form-note is-error";
        note.textContent = "Still needed: " + missing.join(", ") + ".";
        note.scrollIntoView({ behavior: "smooth", block: "nearest" });
        return null;
      }
      note.className = "form-note";
      return fields;
    }

    function busy(on, activeBtn, label) {
      saveBtn.disabled = on; submitBtn.disabled = on;
      if (on && activeBtn) { activeBtn.dataset.was = activeBtn.textContent; activeBtn.textContent = label; }
      if (!on) {
        [saveBtn, submitBtn].forEach(function (b) { if (b.dataset.was) { b.textContent = b.dataset.was; delete b.dataset.was; } });
      }
    }

    // Persist current fields; resolves with the saved article (has id).
    function persist() {
      var fields = collect();
      if (!fields) return Promise.reject({ handled: true });
      return articleId
        ? API.updateArticle(articleId, fields)
        : API.createArticle(fields);
    }

    // Once anything is persisted, slide from create into edit mode so a second
    // save/submit patches the same story instead of creating a duplicate.
    function enterEditMode(saved) {
      if (!articleId && saved && saved.id) {
        articleId = saved.id;
        history.replaceState(null, "", UI.Routes.edit(saved.id));
        if (titleEl) titleEl.textContent = "Edit story";
      }
    }

    // Save draft: stay in the editor.
    saveBtn.addEventListener("click", function () {
      busy(true, saveBtn, "Saving…");
      persist().then(function (saved) {
        UI.toast("Draft saved.");
        enterEditMode(saved);
        coverState.file = null; // now reflected server-side
        busy(false);
      }).catch(function (err) {
        busy(false);
        if (!(err && err.handled)) { note.className = "form-note is-error"; note.textContent = msg(err, "Could not save the draft."); }
      });
    });

    // Submit: persist, then hand to the editors and return to the desk.
    submitBtn.addEventListener("click", function () {
      busy(true, submitBtn, "Submitting…");
      persist().then(function (saved) {
        enterEditMode(saved);
        return API.submitArticle(articleId);
      }).then(function () {
        UI.toast("Sent to the editors.");
        location.href = UI.Routes.desk;
      }).catch(function (err) {
        busy(false);
        if (!(err && err.handled)) { note.className = "form-note is-error"; note.textContent = msg(err, "Could not submit the story."); }
      });
    });
  }

  // ---- author gate ---------------------------------------------------------
  // `is_author` flips server-side when an editor approves a contributor
  // request, but the cached Session.user only refreshes at login — so confirm
  // with the server before refusing an author the editor.
  function gate() {
    return API.refreshUser().catch(function () { return null; }).then(function (fresh) {
      var user = fresh || API.Session.user || {};
      if (user.is_author) return true;
      window.Dash.empty(
        host,
        "Writing is for contributors.",
        "Once an editor approves your contributor seat, you can compose stories here.",
        "/accounts/dashboard/author-request/",
        "Ask to contribute"
      );
      return false;
    });
  }

  // ---- boot ----------------------------------------------------------------
  gate().then(function (allowed) {
    if (!allowed) return;
    var loads = [
      API.categories().catch(function () { return []; }),
      articleId ? API.getArticle(articleId) : Promise.resolve(null),
    ];
    return Promise.all(loads).then(function (res) {
      var cats = res[0] || [], article = res[1];
      if (!cats.length) {
        window.Dash.empty(host, "No sections yet.", "An editor needs to add at least one section before stories can be filed.", UI.Routes.desk, "Back to desk");
        return;
      }
      if (articleId && article && !EDITABLE[article.status]) { renderLocked(article); return; }
      render(cats, article);
    });
  }).catch(function (err) { window.Dash.fail(host, err); });
})();
