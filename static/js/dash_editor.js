/* ============================================================================
   Story editor — compose a new piece or edit one of your own drafts.
     /dashboard/write/        → create   (POST /blog/articles/)
     /dashboard/write/<id>/   → edit     (GET then PATCH /blog/articles/<id>/)
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

  // /dashboard/write/  → null (create) ; /dashboard/write/12/ → 12 (edit)
  var m = location.pathname.match(/\/dashboard\/write\/(\d+)\/?$/);
  var articleId = m ? Number(m[1]) : null;

  // ---- author gate ---------------------------------------------------------
  var user = API.Session.user || {};
  if (!user.is_author) {
    window.Dash.empty(
      host,
      "Writing is for contributors.",
      "Once an editor approves your contributor seat, you can compose stories here.",
      "/dashboard/author-request/",
      "Ask to contribute"
    );
    return;
  }

  // ---- small helpers -------------------------------------------------------
  function field(label, control, hint) {
    return el("div", { class: "field" }, [
      el("label", { text: label }),
      control,
      hint ? el("p", { class: "field__hint wire", text: hint }) : null,
    ]);
  }

  function categorySelect(cats, currentId) {
    var opts = [el("option", { value: "", text: "Choose a section", disabled: true, selected: !currentId })];
    cats.forEach(function (c) {
      opts.push(el("option", { value: c.id, text: c.name, selected: Number(currentId) === c.id }));
    });
    return el("select", { name: "category", required: true }, opts);
  }

  // Tags as toggle chips — a Set of selected ids the collector reads back.
  function tagPicker(tagList, selectedIds) {
    var chosen = {};
    (selectedIds || []).forEach(function (id) { chosen[id] = true; });
    var wrap = el("div", { class: "tagpick" });
    if (!tagList.length) {
      wrap.appendChild(el("p", { class: "wire field__hint", text: "No tags yet — an editor can add them." }));
    }
    tagList.forEach(function (t) {
      var chip = el("button", {
        type: "button",
        class: "tagchip" + (chosen[t.id] ? " tagchip--on" : ""),
        text: t.name,
        "aria-pressed": chosen[t.id] ? "true" : "false",
        onclick: function () {
          chosen[t.id] = !chosen[t.id];
          chip.classList.toggle("tagchip--on", chosen[t.id]);
          chip.setAttribute("aria-pressed", chosen[t.id] ? "true" : "false");
        },
      });
      wrap.appendChild(chip);
    });
    wrap._selected = function () {
      return Object.keys(chosen).filter(function (id) { return chosen[id]; }).map(Number);
    };
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
  function render(cats, tagList, article) {
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

    var selectedTagIds = article && Array.isArray(article.tags) ? article.tags.map(function (t) { return t.id; }) : [];
    var tags = tagPicker(tagList, selectedTagIds);

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
        category: category.value ? Number(category.value) : null,
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

  // ---- boot ----------------------------------------------------------------
  var loads = [
    API.categories().catch(function () { return []; }),
    API.tags().catch(function () { return []; }),
    articleId ? API.getArticle(articleId) : Promise.resolve(null),
  ];
  Promise.all(loads).then(function (res) {
    var cats = res[0] || [], tagList = res[1] || [], article = res[2];
    if (!cats.length) {
      window.Dash.empty(host, "No sections yet.", "An editor needs to add at least one section before stories can be filed.", UI.Routes.desk, "Back to desk");
      return;
    }
    if (articleId && article && !EDITABLE[article.status]) { renderLocked(article); return; }
    render(cats, tagList, article);
  }).catch(function (err) { window.Dash.fail(host, err); });
})();
