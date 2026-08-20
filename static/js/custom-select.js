/* ============================================================================
   Custom select — a searchable dropdown that replaces native <select> elements.
   Used for country and platform pickers in the dashboard profile.
   API:  window.CustomSelect.create(container, opts)
         opts = { name, options, value, placeholder }
   ========================================================================= */
(function (global) {
  "use strict";

  function create(container, opts) {
    opts = opts || {};
    var name = opts.name || "";
    var options = opts.options || [];   // [{ value, label, icon? }]
    var current = opts.value || "";
    var placeholder = opts.placeholder || "Select…";

    var state = { open: false, query: "" };
    var wrap, trigger, dropdown, searchInput, listEl, hiddenInput;

    // --- build DOM ---
    hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.name = name;
    hiddenInput.value = current;

    wrap = document.createElement("div");
    wrap.className = "custom-sel";

    trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "custom-sel__trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    dropdown = document.createElement("div");
    dropdown.className = "custom-sel__dropdown";
    dropdown.setAttribute("role", "listbox");

    // search box
    var searchWrap = document.createElement("div");
    searchWrap.className = "custom-sel__search";
    searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search…";
    searchInput.setAttribute("aria-label", "Search options");
    searchWrap.appendChild(searchInput);
    dropdown.appendChild(searchWrap);

    listEl = document.createElement("div");
    dropdown.appendChild(listEl);

    wrap.appendChild(hiddenInput);
    wrap.appendChild(trigger);
    wrap.appendChild(dropdown);
    container.appendChild(wrap);

    // --- helpers ---
    function findOpt(val) {
      for (var i = 0; i < options.length; i++) {
        if (String(options[i].value) === String(val)) return options[i];
      }
      return null;
    }

    function renderTrigger() {
      var opt = findOpt(current);
      trigger.innerHTML = "";
      if (opt) {
        if (opt.icon) {
          var img = document.createElement("img");
          img.src = opt.icon;
          img.alt = opt.label;
          img.title = opt.label;
          img.onerror = function () { this.parentNode.removeChild(this); };
          trigger.appendChild(img);
        }
        trigger.appendChild(document.createTextNode(opt.label));
      } else {
        var ph = document.createElement("span");
        ph.className = "custom-sel__placeholder";
        ph.textContent = placeholder;
        trigger.appendChild(ph);
      }
    }

    function renderList() {
      listEl.innerHTML = "";
      var q = state.query.toLowerCase();
      var shown = 0;
      options.forEach(function (opt) {
        if (q && opt.label.toLowerCase().indexOf(q) === -1) return;
        shown++;
        var item = document.createElement("div");
        item.className = "custom-sel__opt";
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", String(opt.value === current));
        if (opt.icon) {
          var img = document.createElement("img");
          img.src = opt.icon;
          img.alt = opt.label;
          img.onerror = function () { this.style.display = "none"; };
          item.appendChild(img);
        }
        item.appendChild(document.createTextNode(opt.label));
        item.addEventListener("click", function () {
          select(opt.value);
        });
        listEl.appendChild(item);
      });
      if (!shown) {
        var empty = document.createElement("div");
        empty.className = "custom-sel__empty";
        empty.textContent = "No matches";
        listEl.appendChild(empty);
      }
    }

    function open() {
      state.open = true;
      state.query = "";
      searchInput.value = "";
      wrap.classList.add("custom-sel--open");
      trigger.setAttribute("aria-expanded", "true");
      renderList();
      setTimeout(function () { searchInput.focus(); }, 50);
    }

    function close() {
      state.open = false;
      wrap.classList.remove("custom-sel--open");
      trigger.setAttribute("aria-expanded", "false");
    }

    function select(val) {
      current = val;
      hiddenInput.value = val;
      renderTrigger();
      close();
      trigger.focus();
    }

    // --- events ---
    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      state.open ? close() : open();
    });

    searchInput.addEventListener("input", function () {
      state.query = searchInput.value;
      renderList();
    });
    // Prevent browser autofill on the search field
    searchInput.setAttribute("autocomplete", "off");

    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { close(); trigger.focus(); }
      if (e.key === "Enter") {
        e.preventDefault();
        var first = listEl.querySelector(".custom-sel__opt");
        if (first) first.click();
      }
      // Arrow-key navigation within the list
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        var opts = listEl.querySelectorAll(".custom-sel__opt");
        if (!opts.length) return;
        var cur = listEl.querySelector(".custom-sel__opt:focus");
        var idx = Array.prototype.indexOf.call(opts, cur);
        if (e.key === "ArrowDown") {
          idx = idx < opts.length - 1 ? idx + 1 : 0;
        } else {
          idx = idx > 0 ? idx - 1 : opts.length - 1;
        }
        opts[idx].focus();
      }
    });

    // close on outside click
    function onDocClick(e) {
      if (!wrap.contains(e.target)) close();
    }
    document.addEventListener("click", onDocClick);

    // close on Escape from trigger
    trigger.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && state.open) { close(); }
      if (e.key === "ArrowDown" && !state.open) { open(); }
    });

    // --- initial render ---
    renderTrigger();

    // Ensure trigger has focus-visible style
    trigger.setAttribute("tabindex", "0");

    // --- public API ---
    return {
      getValue: function () { return current; },
    };
  }

  global.CustomSelect = { create: create };
})(window);
