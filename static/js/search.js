/* ============================================================================
   Custom Search Bar
   - Stores recent searches in localStorage (max 3)
   - Shows trending articles (most likes in past 30 days)
   - Dropdown with recent + trending sections
   ========================================================================= */
(function () {
  "use strict";
  var API = window.BitraAPI, UI = window.UI;

  var LS_KEY = "bitra.recent_searches";
  var MAX_RECENT = 3;
  var MAX_TRENDING = 3;

  var wrap = document.querySelector("[data-search-wrap]");
  var input = document.querySelector("[data-search]");
  var dropdown = document.querySelector("[data-search-dropdown]");
  var recentSection = document.querySelector("[data-recent-section]");
  var recentList = document.querySelector("[data-recent-list]");
  var trendingSection = document.querySelector("[data-trending-section]");
  var trendingList = document.querySelector("[data-trending-list]");

  if (!wrap || !input || !dropdown) return;

  /* --------------------------------------------------------- recent searches */
  function getRecent() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function saveRecent(queries) {
    localStorage.setItem(LS_KEY, JSON.stringify(queries));
  }

  function addRecent(query) {
    query = (query || "").trim();
    if (!query) return;
    var list = getRecent().filter(function (q) {
      return q.toLowerCase() !== query.toLowerCase();
    });
    list.unshift(query);
    if (list.length > MAX_RECENT) list = list.slice(0, MAX_RECENT);
    saveRecent(list);
  }

  function clearRecent() {
    localStorage.removeItem(LS_KEY);
    recentSection.hidden = true;
    UI.clear(recentList);
    // If no trending either, hide dropdown
    if (trendingSection.hidden) {
      hideDropdown();
    }
  }

  /* -------------------------------------------------------- trending (likes) */
  var trendingCache = null;

  function fetchTrending() {
    if (trendingCache) return Promise.resolve(trendingCache);

    var thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    var merged = [];
    function fetchPage(page) {
      return API.articles(page, 50).then(function (res) {
        var items = (res && Array.isArray(res.results)) ? res.results : [];
        merged = merged.concat(items);
        if (res && res.next) return fetchPage(page + 1);
        return merged;
      });
    }

    return fetchPage(1).then(function (all) {
      var recent = all.filter(function (a) {
        return a.created_at && a.created_at >= thirtyDaysAgo;
      });
      recent.sort(function (a, b) { return (b.likes || 0) - (a.likes || 0); });
      trendingCache = recent.slice(0, MAX_TRENDING);
      return trendingCache;
    });
  }

  /* -------------------------------------------------------- render sections */
  function renderRecent() {
    var recent = getRecent();
    if (recent.length === 0) {
      recentSection.hidden = true;
      UI.clear(recentList);
      return;
    }
    recentSection.hidden = false;
    UI.clear(recentList);
    recent.forEach(function (q) {
      var li = UI.el("li", { class: "search-dropdown__item", "data-query": q }, [
        UI.el("span", { class: "search-dropdown__item-ico", text: "\u21bb" }),
        UI.el("span", { class: "search-dropdown__item-text", text: q }),
      ]);
      recentList.appendChild(li);
    });
    var clearBtn = UI.el("li", { class: "search-dropdown__item", "data-clear-recent": "true" }, [
      UI.el("span", { class: "search-dropdown__item-ico", text: "\u2715" }),
      UI.el("span", { class: "search-dropdown__item-text wire", text: "Clear recent searches" }),
    ]);
    recentList.appendChild(clearBtn);
  }

  function renderTrending() {
    trendingSection.hidden = true;
    UI.clear(trendingList);
    return fetchTrending().then(function (trending) {
      if (trending && trending.length > 0) {
        trendingSection.hidden = false;
        trending.forEach(function (a) {
          var li = UI.el("li", { class: "search-dropdown__item", "data-article-title": a.title }, [
            UI.el("span", { class: "search-dropdown__item-ico", text: "\u25b2" }),
            UI.el("span", { class: "search-dropdown__item-text", text: a.title }),
          ]);
          trendingList.appendChild(li);
        });
      }
      return trending;
    });
  }

  /* ---------------------------------------------------------- show / hide */
  var isOpen = false;

  function showDropdown() {
    isOpen = true;
    dropdown.hidden = false;
    renderRecent();
    renderTrending().then(function (trending) {
      // After trending loads, hide entire dropdown if both sections are empty
      if (!trending || trending.length === 0) {
        var recent = getRecent();
        if (recent.length === 0) {
          hideDropdown();
        }
      }
    });
  }

  function hideDropdown() {
    isOpen = false;
    dropdown.hidden = true;
  }

  /* ----------------------------------------------------------- event logic */
  var debounceTimer;

  input.addEventListener("focus", function () {
    showDropdown();
  });

  input.addEventListener("input", function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      var val = input.value.trim();
      if (val) {
        hideDropdown();
      } else {
        showDropdown();
      }
    }, 150);
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      var q = input.value.trim();
      if (q) {
        addRecent(q);
        input.dispatchEvent(new Event("input"));
        hideDropdown();
      }
    }
    if (e.key === "Escape") {
      hideDropdown();
      input.blur();
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", function (e) {
    if (!wrap.contains(e.target)) {
      hideDropdown();
    }
  });

  // Handle clicks inside dropdown
  dropdown.addEventListener("click", function (e) {
    var item = e.target.closest(".search-dropdown__item");
    if (!item) return;

    if (item.dataset.clearRecent) {
      clearRecent();
      return;
    }

    if (item.dataset.query) {
      input.value = item.dataset.query;
      addRecent(item.dataset.query);
      input.dispatchEvent(new Event("input"));
      hideDropdown();
      return;
    }

    if (item.dataset.articleTitle) {
      input.value = item.dataset.articleTitle;
      addRecent(item.dataset.articleTitle);
      input.dispatchEvent(new Event("input"));
      hideDropdown();
      return;
    }
  });

  /* ----------------------------------------------------------- init on load */
  fetchTrending();
})();
