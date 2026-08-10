/* ============================================================================
   Profile — view & edit the reader's details and social links.
   GET/PATCH /accounts/profiles/me/ · CRUD /accounts/social-links/.
   ========================================================================= */
(function () {
  "use strict";
  var API = window.BitraAPI, UI = window.UI, el = UI.el;

  var host = document.querySelector("[data-profile]");
  if (!host) return;

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

  /* -------------------------------------------------------------- render */
  function render(profile, platforms) {
    UI.clear(host);
    var user = profile.user || API.Session.user || {};

    var since = document.querySelector("[data-since]");
    if (since && profile.created_at) since.textContent = "Reader since " + UI.dateline(profile.created_at);

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
