/* ============================================================================
   Profile — view & edit the reader's details and social links.
   GET/PATCH /accounts/profiles/me/ · CRUD /accounts/social-links/.
   ========================================================================= */
(function () {
  "use strict";
  var API = window.BitraAPI, UI = window.UI, el = UI.el;

  var host = document.querySelector("[data-profile]");
  if (!host) return;

  function initials(u) {
    var src = (u.full_name || u.username || u.email || "").trim();
    if (!src) return "·";
    var parts = src.split(/\s+/);
    var a = parts[0][0] || "";
    var b = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (a + b).toUpperCase();
  }

  // A compact country list (ISO-2 → name). Any stored code not present is
  // injected on render so it is never silently dropped.
  var COUNTRIES = [
    ["", "—"], ["IR", "Iran"], ["US", "United States"], ["GB", "United Kingdom"],
    ["CA", "Canada"], ["AU", "Australia"], ["DE", "Germany"], ["FR", "France"],
    ["ES", "Spain"], ["IT", "Italy"], ["NL", "Netherlands"], ["SE", "Sweden"],
    ["NO", "Norway"], ["DK", "Denmark"], ["FI", "Finland"], ["IE", "Ireland"],
    ["PT", "Portugal"], ["CH", "Switzerland"], ["AT", "Austria"], ["BE", "Belgium"],
    ["PL", "Poland"], ["TR", "Turkey"], ["RU", "Russia"], ["UA", "Ukraine"],
    ["AE", "United Arab Emirates"], ["SA", "Saudi Arabia"], ["QA", "Qatar"],
    ["IN", "India"], ["PK", "Pakistan"], ["CN", "China"], ["JP", "Japan"],
    ["KR", "South Korea"], ["SG", "Singapore"], ["MY", "Malaysia"], ["ID", "Indonesia"],
    ["BR", "Brazil"], ["AR", "Argentina"], ["MX", "Mexico"], ["ZA", "South Africa"],
    ["EG", "Egypt"], ["NG", "Nigeria"], ["NZ", "New Zealand"],
  ];

  function countrySelect(current, container) {
    var opts = COUNTRIES.slice();
    if (current && !opts.some(function (c) { return c[0] === current; })) opts.push([current, current]);
    var csOpts = opts.filter(function (c) { return c[0] !== ""; }).map(function (c) {
      return { value: c[0], label: c[1] };
    });
    // Prepend a "None" option so users can clear their country
    csOpts.unshift({ value: "", label: "— None —" });
    return window.CustomSelect.create(container, {
      name: "country",
      options: csOpts,
      value: current || "",
      placeholder: "Choose a country…",
    });
  }

  function readonlyRow(label, value) {
    return el("div", { class: "field" }, [
      el("label", { text: label }),
      el("div", { style: "border-bottom:1px solid var(--hair);padding:.5rem .1rem;color:var(--ink-2)", text: value || "—" }),
    ]);
  }

  /* -------------------------------------------------------- social links */
  function socialCard(profile, platforms) {
    var links = (profile.social_link || []).slice();
    var card = el("div", { class: "dash__card" }, [ el("h2", { text: "Social links" }) ]);
    var listWrap = el("div", { class: "sociallist" });
    card.appendChild(listWrap);

    function paintList() {
      UI.clear(listWrap);
      if (!links.length) {
        listWrap.appendChild(el("p", { class: "wire", style: "text-transform:none;letter-spacing:.02em;color:var(--muted)", text: "No links yet." }));
        return;
      }
      links.forEach(function (link) {
        var plat = link.platform_detail && link.platform_detail.name ? link.platform_detail.name : "Link";
        var iconUrl = link.platform_detail && link.platform_detail.icon ? link.platform_detail.icon : null;
        var platNode = iconUrl
          ? el("span", { class: "sociallink__plat" }, [ el("img", { src: iconUrl, alt: plat, title: plat, onerror: function () { this.parentNode.replaceChild(document.createTextNode(plat), this); } }) ])
          : el("span", { class: "sociallink__plat", text: plat });
        listWrap.appendChild(el("div", { class: "sociallink" }, [
          platNode,
          el("a", { class: "sociallink__url", href: link.url || "#", target: "_blank", rel: "noopener", text: link.url || link.username }),
          el("button", {
            class: "linkbtn", type: "button", text: "Remove",
            onclick: function (e) {
              var btn = e.currentTarget; btn.disabled = true; btn.textContent = "…";
              API.removeSocialLink(link.id).then(function () {
                links = links.filter(function (l) { return l.id !== link.id; });
                UI.toast("Link removed."); paintList(); buildForm();
              }).catch(function () { btn.disabled = false; btn.textContent = "Remove"; UI.toast("Could not remove link."); });
            },
          }),
        ]));
      });
    }
    // --- add-form section (rebuilt after each add/remove) ---
    var formWrap = el("div");
    card.appendChild(formWrap);

    function buildForm() {
      UI.clear(formWrap);
      if (!platforms.length) {
        formWrap.appendChild(el("p", { class: "wire", style: "text-transform:none;letter-spacing:.02em;color:var(--muted);margin-top:.4rem", text: "No platforms are configured yet — an editor can add them in the admin." }));
        return;
      }
      // Filter out platforms the user already has a link for.
      var usedPlatformIds = {};
      links.forEach(function (l) { if (l.platform) usedPlatformIds[l.platform] = true; });
      var availPlatforms = platforms.filter(function (p) { return !usedPlatformIds[p.id]; });

      if (!availPlatforms.length) {
        formWrap.appendChild(el("p", { class: "wire", style: "text-transform:none;letter-spacing:.02em;color:var(--muted);margin-top:.4rem", text: "All available platforms have been linked." }));
        return;
      }

      var platWrap = el("div", { class: "field", style: "margin:0" }, [ el("label", { text: "Platform" }) ]);
      var platOpts = availPlatforms.map(function (p) {
        return { value: p.id, label: p.name, icon: p.icon || null };
      });
      var platCS = window.CustomSelect.create(platWrap, {
        name: "platform",
        options: platOpts,
        value: "",
        placeholder: "Choose a platform…",
      });
      var userInput = el("input", { type: "text", name: "handle", placeholder: "your-handle" });
      var addBtn = el("button", { class: "btn btn--sm", type: "submit", text: "Add link" });

      var form = el("form", { class: "socialadd" }, [
        platWrap,
        el("div", { class: "field", style: "margin:0" }, [ el("label", { text: "Username" }), userInput ]),
        el("div", {}, [ addBtn ]),
      ]);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var handle = userInput.value.trim();
        if (!handle) { UI.toast("Enter a username for the link."); return; }
        addBtn.disabled = true; addBtn.textContent = "…";
        if (!platCS.getValue()) { UI.toast("Choose a platform."); addBtn.disabled = false; addBtn.textContent = "Add link"; return; }
        API.addSocialLink(Number(platCS.getValue()), handle).then(function (created) {
          if (created && !created.platform_detail) {
            var p = platforms.filter(function (x) { return x.id === Number(platCS.getValue()); })[0];
            if (p) created.platform_detail = p;
          }
          links.push(created);
          userInput.value = "";
          UI.toast("Link added."); paintList(); buildForm();
          addBtn.disabled = false; addBtn.textContent = "Add link";
        }).catch(function (err) {
          addBtn.disabled = false; addBtn.textContent = "Add link";
          UI.toast(err && err.message ? err.message : "Could not add link.");
        });
      });
      formWrap.appendChild(form);
    }

    paintList();
    buildForm();
    return card;
  }

  /* ---- crop modal ---- */
  function showCropModal(imgEl, callback) {
    // callback(blob) or callback(null) on cancel
    var SIZE = 280; // canvas logical size
    var overlay = el("div", { class: "crop-overlay" });
    var box = el("div", { class: "crop-box" });
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    box.appendChild(el("div", { class: "crop-box__title", text: "Crop your picture" }));
    var canvasWrap = el("div", { class: "crop-canvas-wrap" });
    var canvas = document.createElement("canvas");
    canvas.width = SIZE; canvas.height = SIZE;
    canvasWrap.appendChild(canvas);
    box.appendChild(canvasWrap);
    box.appendChild(el("p", { class: "crop-hint", text: "Drag to reposition · Scroll to zoom" }));

    var ctx = canvas.getContext("2d");

    // --- state ---
    var iw = imgEl.naturalWidth, ih = imgEl.naturalHeight;
    // fit image so the shorter side fills the crop square
    var baseScale = Math.max(SIZE / iw, SIZE / ih);
    var scale = baseScale;
    var minScale = baseScale * 0.5;
    var maxScale = baseScale * 4;
    var ox = 0, oy = 0; // image centre offset from canvas centre
    var dragging = false, lastX = 0, lastY = 0;

    // --- zoom slider ---
    var slider = el("input", {
      type: "range", min: String(minScale * 1000), max: String(maxScale * 1000),
      value: String(scale * 1000), step: "1",
    });
    var zoomLabel = el("span", { class: "crop-controls__label", text: "Zoom" });
    var controls = el("div", { class: "crop-controls" }, [zoomLabel, slider]);
    box.appendChild(controls);

    function setScale(s) {
      scale = Math.max(minScale, Math.min(maxScale, s));
      slider.value = String(Math.round(scale * 1000));
      draw();
    }
    slider.addEventListener("input", function () {
      scale = Number(slider.value) / 1000;
      draw();
    });

    function draw() {
      ctx.clearRect(0, 0, SIZE, SIZE);
      var dw = iw * scale, dh = ih * scale;
      var dx = (SIZE - dw) / 2 + ox;
      var dy = (SIZE - dh) / 2 + oy;
      ctx.drawImage(imgEl, dx, dy, dw, dh);
    }
    draw();

    // --- drag (mouse) ---
    canvas.addEventListener("mousedown", function (e) {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
    });
    window.addEventListener("mousemove", onMove);
    function onMove(e) {
      if (!dragging) return;
      ox += e.clientX - lastX; oy += e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      draw();
    }
    window.addEventListener("mouseup", function () { dragging = false; });

    // --- drag (touch) ---
    var touchIds = [];
    canvas.addEventListener("touchstart", function (e) {
      e.preventDefault();
      touchIds = Array.from(e.touches).map(function (t) { return t.identifier; });
      if (e.touches.length === 1) {
        lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
      }
    }, { passive: false });
    canvas.addEventListener("touchmove", function (e) {
      e.preventDefault();
      if (e.touches.length === 1) {
        ox += e.touches[0].clientX - lastX;
        oy += e.touches[0].clientY - lastY;
        lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
        draw();
      } else if (e.touches.length === 2) {
        // pinch zoom
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (canvas._lastPinchDist) {
          setScale(scale * (dist / canvas._lastPinchDist));
        }
        canvas._lastPinchDist = dist;
      }
    }, { passive: false });
    canvas.addEventListener("touchend", function (e) {
      canvas._lastPinchDist = null;
      if (e.touches.length === 1) {
        lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
      }
    });

    // --- scroll zoom ---
    canvasWrap.addEventListener("wheel", function (e) {
      e.preventDefault();
      setScale(scale * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
    }, { passive: false });

    // --- buttons ---
    var cropBtn = el("button", { class: "btn btn--sm btn--ink", type: "button", text: "Crop" });
    var cancelBtn = el("button", { class: "btn btn--sm", type: "button", text: "Cancel" });
    box.appendChild(el("div", { class: "crop-actions" }, [cropBtn, cancelBtn]));

    function cleanup() {
      window.removeEventListener("mousemove", onMove);
      overlay.remove();
    }

    cancelBtn.addEventListener("click", function () { cleanup(); callback(null); });

    cropBtn.addEventListener("click", function () {
      // Render at high-res for quality
      var outSize = 600;
      var outCanvas = document.createElement("canvas");
      outCanvas.width = outSize; outCanvas.height = outSize;
      var outCtx = outCanvas.getContext("2d");
      var dw = iw * scale * (outSize / SIZE);
      var dh = ih * scale * (outSize / SIZE);
      var dx = (outSize - dw) / 2 + ox * (outSize / SIZE);
      var dy = (outSize - dh) / 2 + oy * (outSize / SIZE);
      outCtx.drawImage(imgEl, dx, dy, dw, dh);
      outCanvas.toBlob(function (blob) {
        cleanup();
        callback(blob);
      }, "image/jpeg", 0.92);
    });
  }

  /* ------------------------------------------------ avatar card builder */
  function avatarCard(profile) {
    var user = profile.user || API.Session.user || {};
    var profileId = profile.id;
    var currentImageUrl = profile.profile_image || null;

    // --- state ---
    var pendingBlob = null;   // cropped Blob waiting to be uploaded
    var previewUrl = null;    // Object URL for the preview
    var uploading = false;

    var card = el("div", { class: "dash__avatar-card" }, [
      el("h2", { text: "Profile picture" }),
    ]);
    var row = el("div", { class: "dash__avatar-row" });
    card.appendChild(row);

    // --- avatar circle ---
    var avatar = el("div", { class: "dash__avatar-edit" });
    row.appendChild(avatar);

    // --- hidden file input ---
    var fileInput = el("input", {
      type: "file", accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
      style: "position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;clip:rect(0 0 0 0)",
      "aria-hidden": "true",
      tabindex: "-1",
    });
    card.appendChild(fileInput);

    // --- actions column ---
    var actionsWrap = el("div", { class: "dash__avatar-actions" });
    row.appendChild(actionsWrap);

    // --- render the avatar image or initials ---
    function paintAvatar(url) {
      UI.clear(avatar);
      avatar.classList.remove(
        "dash__avatar-edit--preview",
        "dash__avatar-edit--uploading"
      );
      if (url) {
        avatar.appendChild(el("img", { src: url, alt: (user.username || "Profile") + " avatar" }));
      } else {
        avatar.textContent = initials(user);
      }
      // overlay
      var overlay = el("div", { class: "dash__avatar-overlay" }, [
        el("span", { class: "dash__avatar-overlay-icon", html: "&#9998;" }),
      ]);
      avatar.appendChild(overlay);
    }

    // --- render the actions column (state-dependent) ---
    function paintActions() {
      UI.clear(actionsWrap);
      if (uploading) {
        actionsWrap.appendChild(el("p", { class: "dash__avatar-hint", text: "Uploading…" }));
        return;
      }
      if (pendingBlob) {
        // preview mode: show file name, save + cancel
        actionsWrap.appendChild(el("p", { class: "dash__avatar-hint", text: "Cropped image ready" }));
        var saveBtn = el("button", { class: "btn btn--sm btn--ink", type: "button", text: "Save" });
        var cancelBtn = el("button", { class: "btn btn--sm", type: "button", text: "Cancel" });
        actionsWrap.appendChild(el("div", { style: "display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.4rem" }, [saveBtn, cancelBtn]));

        saveBtn.addEventListener("click", function () {
          if (!pendingBlob || uploading) return;
          uploading = true;
          paintActions();
          avatar.classList.add("dash__avatar-edit--uploading");
          var file = new File([pendingBlob], "avatar.jpg", { type: "image/jpeg" });
          API.uploadProfileImage(profileId, file)
            .then(function (updated) {
              currentImageUrl = updated.profile_image || currentImageUrl;
              pendingBlob = null;
              if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
              uploading = false;
              paintAvatar(currentImageUrl);
              paintActions();
              UI.toast("Profile picture updated successfully.");
              syncSidebarAvatar(currentImageUrl, user);
            })
            .catch(function (err) {
              uploading = false;
              paintActions();
              paintAvatar(previewUrl || currentImageUrl);
              UI.toast(err && err.message ? err.message : "Could not upload image.");
            });
        });

        cancelBtn.addEventListener("click", function () {
          if (previewUrl) { URL.revokeObjectURL(previewUrl); }
          pendingBlob = null; previewUrl = null;
          paintAvatar(currentImageUrl);
          paintActions();
        });
        return;
      }

      // idle mode: hint + delete (if image exists)
      actionsWrap.appendChild(el("p", { class: "dash__avatar-hint", text: "Click the picture to change it. JPG, PNG or WebP, max 3 MB." }));
      if (currentImageUrl) {
        var delBtn = el("button", { class: "btn btn--sm linkbtn--danger", type: "button", text: "Remove picture" });
        actionsWrap.appendChild(delBtn);
        delBtn.addEventListener("click", function () {
          // show confirmation inline
          var confirm = el("div", { class: "dash__avatar-confirm" }, [
            el("p", { text: "Remove your profile picture?" }),
            el("button", { class: "btn btn--sm btn--ink", type: "button", text: "Confirm" }),
            el("button", { class: "btn btn--sm", type: "button", text: "Cancel" }),
          ]);
          actionsWrap.appendChild(confirm);
          delBtn.disabled = true; delBtn.style.display = "none";
          var confirmBtn = confirm.children[1];
          var cancelConfirmBtn = confirm.children[2];
          confirmBtn.addEventListener("click", function () {
            confirmBtn.disabled = true; confirmBtn.textContent = "Removing…";
            API.deleteProfileImage(profileId)
              .then(function () {
                currentImageUrl = null;
                paintAvatar(null);
                paintActions();
                UI.toast("Profile picture removed successfully.");
                syncSidebarAvatar(null, user);
              })
              .catch(function (err) {
                confirm.remove();
                delBtn.disabled = false; delBtn.style.display = "";
                UI.toast(err && err.message ? err.message : "Could not remove picture.");
              });
          });
          cancelConfirmBtn.addEventListener("click", function () {
            confirm.remove();
            delBtn.disabled = false; delBtn.style.display = "";
          });
        });
      }
    }

    // --- file input handler → opens crop modal ---
    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      // Validate type client-side
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        UI.toast("Only JPG, PNG and WebP images are allowed.");
        fileInput.value = "";
        return;
      }
      // Validate size (3 MB)
      if (file.size > 3 * 1024 * 1024) {
        UI.toast("Image must be under 3 MB.");
        fileInput.value = "";
        return;
      }
      fileInput.value = ""; // reset so same file can be re-selected
      // Load into an Image element then open crop modal
      var url = URL.createObjectURL(file);
      var tmpImg = new Image();
      tmpImg.onload = function () {
        showCropModal(tmpImg, function (blob) {
          URL.revokeObjectURL(url);
          if (!blob) return; // cancelled
          pendingBlob = blob;
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          previewUrl = URL.createObjectURL(blob);
          paintAvatar(previewUrl);
          avatar.classList.add("dash__avatar-edit--preview");
          paintActions();
        });
      };
      tmpImg.src = url;
    });

    // --- click on avatar opens file picker ---
    avatar.addEventListener("click", function () {
      if (uploading) return;
      fileInput.click();
    });
    // keyboard: Enter / Space
    avatar.setAttribute("tabindex", "0");
    avatar.setAttribute("role", "button");
    avatar.setAttribute("aria-label", "Change profile picture");
    avatar.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!uploading) fileInput.click();
      }
    });

    // --- initial paint ---
    paintAvatar(currentImageUrl);
    paintActions();

    return card;
  }

  // --- sync sidebar avatar (dashboard shell) ---
  function syncSidebarAvatar(imageUrl, user) {
    // dashboard.js owns the identity card; re-render it with the new image.
    window.Dash.renderIdentity(user, imageUrl);
  }

  /* -------------------------------------------------------------- render */
  function render(profile, platforms) {
    UI.clear(host);
    var user = profile.user || API.Session.user || {};

    var since = document.querySelector("[data-since]");
    if (since && profile.created_at) since.textContent = "Reader since " + UI.dateline(profile.created_at);

    // avatar card
    host.appendChild(avatarCard(profile));

    // details card
    var bio = el("textarea", { name: "bio", placeholder: "A sentence or two about you.", maxlength: "600" });
    bio.value = profile.bio || "";
    var city = el("input", { type: "text", name: "city", placeholder: "City", maxlength: "50" });
    city.value = profile.city || "";
    var countryWrap = el("div", { class: "field", style: "margin:0" }, [ el("label", { text: "Country" }) ]);
    var countryCS = countrySelect(profile.country || "", countryWrap);

    var note = el("div", { class: "form-note", role: "alert" });
    var saveBtn = el("button", { class: "btn btn--ink", type: "submit", text: "Save changes" });

    var detailsForm = el("form", {}, [
      note,
      el("div", { class: "field" }, [ el("label", { text: "Bio" }), bio ]),
      el("div", { class: "field__row" }, [
        el("div", { class: "field", style: "margin:0" }, [ el("label", { text: "City" }), city ]),
        countryWrap,
      ]),
      el("div", { class: "form__foot", style: "margin-top:1.2rem" }, [ saveBtn ]),
    ]);

    detailsForm.addEventListener("submit", function (e) {
      e.preventDefault();
      note.className = "form-note";
      saveBtn.disabled = true; saveBtn.textContent = "Saving…";
      API.updateProfile({ bio: bio.value.trim(), city: city.value.trim(), country: countryCS.getValue() })
        .then(function () {
          note.className = "form-note is-ok"; note.textContent = "Saved.";
          UI.toast("Profile updated.");
        })
        .catch(function (err) {
          note.className = "form-note is-error";
          note.textContent = err && err.message ? err.message : "Could not save your profile.";
        })
        .finally(function () { saveBtn.disabled = false; saveBtn.textContent = "Save changes"; });
    });

    var detailsCard = el("div", { class: "dash__card" }, [
      el("h2", { text: "Your details" }),
      detailsForm,
    ]);

    // account (read-only) card
    var accountCard = el("div", { class: "dash__card" }, [
      el("h2", { text: "Account" }),
      readonlyRow("Full name", user.full_name),
      el("div", { class: "field__row" }, [
        readonlyRow("Username", user.username),
        readonlyRow("Email", user.email),
      ]),
      el("p", { class: "wire", style: "text-transform:none;letter-spacing:.02em;color:var(--muted)", text: "These are managed with your account." }),
    ]);

    host.appendChild(detailsCard);
    host.appendChild(socialCard(profile, platforms));
    host.appendChild(accountCard);
  }

  // Platforms are only needed to offer the "add link" dropdown; tolerate failure.
  Promise.all([
    API.profileMe(),
    API.socialPlatforms().catch(function () { return []; }),
  ]).then(function (res) {
    render(res[0], res[1] || []);
  }).catch(function (err) { window.Dash.fail(host, err); });
})();
