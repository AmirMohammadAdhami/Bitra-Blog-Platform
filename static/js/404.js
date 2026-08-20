/**
 * 404.js — Interactive behaviour for The Daily Chronicle 404 page.
 * Handles: search box toggle, report-anomaly modal, keyboard navigation.
 */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ DOM */
  var searchBox    = document.getElementById("search-box");
  var searchInner  = searchBox ? searchBox.querySelector(".search-box__inner") : null;
  var searchForm   = document.getElementById("search-form");
  var searchInput  = searchBox ? searchBox.querySelector(".search-box__input") : null;

  var reportBtn    = document.getElementById("report-btn");
  var reportModal  = document.getElementById("report-modal");
  var reportForm   = document.getElementById("report-form");
  var reportSuccess= document.getElementById("report-success");
  var modalClose   = document.getElementById("modal-close");
  var modalOk      = document.getElementById("modal-ok");

  /* ============================================================ SEARCH BOX */
  function openSearch() {
    if (!searchInner || !searchForm || !searchInput) return;
    searchInner.style.display = "none";
    searchForm.hidden = false;
    searchInput.focus();
  }

  function closeSearch() {
    if (!searchInner || !searchForm || !searchInput) return;
    searchForm.hidden = true;
    searchInner.style.display = "";
    searchInput.value = "";
  }

  if (searchInner) {
    searchInner.addEventListener("click", openSearch);
  }

  if (searchForm) {
    searchForm.addEventListener("submit", function (e) {
      var q = searchInput.value.trim();
      if (!q) {
        e.preventDefault();
        searchInput.focus();
        return;
      }
      // Redirect to site search (or root with query)
      e.preventDefault();
      window.location.href = "/articles/?q=" + encodeURIComponent(q);
    });

    searchForm.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeSearch();
        if (searchInner) searchInner.focus();
      }
    });
  }

  /* ========================================================= REPORT MODAL */
  var previousFocus = null;

  function openModal() {
    if (!reportModal) return;
    previousFocus = document.activeElement;
    reportModal.hidden = false;
    document.body.style.overflow = "hidden";

    // Reset form state
    if (reportForm) {
      reportForm.hidden = false;
      reportForm.reset();
    }
    if (reportSuccess) {
      reportSuccess.hidden = true;
    }

    // Focus the first input
    var firstInput = reportModal.querySelector("input, textarea");
    if (firstInput) {
      setTimeout(function () { firstInput.focus(); }, 100);
    }

    // Trap focus inside modal
    reportModal.addEventListener("keydown", trapFocus);
  }

  function closeModal() {
    if (!reportModal) return;
    reportModal.hidden = true;
    document.body.style.overflow = "";
    reportModal.removeEventListener("keydown", trapFocus);

    // Restore focus
    if (previousFocus && previousFocus.focus) {
      previousFocus.focus();
    }
  }

  function trapFocus(e) {
    if (e.key === "Escape") {
      closeModal();
      return;
    }
    if (e.key !== "Tab") return;

    var focusable = reportModal.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    var first = focusable[0];
    var last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  if (reportBtn) {
    reportBtn.addEventListener("click", openModal);
  }

  if (modalClose) {
    modalClose.addEventListener("click", closeModal);
  }

  if (modalOk) {
    modalOk.addEventListener("click", closeModal);
  }

  // Close modal on overlay click
  if (reportModal) {
    reportModal.addEventListener("click", function (e) {
      if (e.target === reportModal) {
        closeModal();
      }
    });
  }

  // Handle report form submission
  if (reportForm) {
    reportForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var url   = reportForm.querySelector('[name="url"]');
      var desc  = reportForm.querySelector('[name="description"]');

      // Simple validation
      if (!url || !url.value.trim()) {
        url.focus();
        return;
      }
      if (!desc || !desc.value.trim()) {
        desc.focus();
        return;
      }

      // Show success message
      reportForm.hidden = true;
      if (reportSuccess) {
        reportSuccess.hidden = false;
        if (modalOk) modalOk.focus();
      }
    });
  }

  /* ================================================== DISPATCH CARD LINKS */
  // Add subtle interaction feedback to dispatch card links
  var dispatchLinks = document.querySelectorAll(".dispatch-card__link");
  dispatchLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      // On click, briefly flash the card
      var card = link.closest(".dispatch-card");
      if (card) {
        card.style.transform = "translateY(1px)";
        setTimeout(function () {
          card.style.transform = "";
        }, 150);
      }
    });
  });

  /* ===================================================== EMBOSSED BUTTONS */
  // Add tactile press effect to embossed buttons
  var embossedBtns = document.querySelectorAll(".btn-embossed");
  embossedBtns.forEach(function (btn) {
    btn.addEventListener("mousedown", function () {
      btn.style.transform = "translateY(2px)";
    });
    btn.addEventListener("mouseup", function () {
      btn.style.transform = "";
    });
    btn.addEventListener("mouseleave", function () {
      btn.style.transform = "";
    });
  });

})();
