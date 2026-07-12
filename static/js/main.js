/* ============================================
   BITRA - Main JavaScript
   Core functionality and interactions
   ============================================ */

(function() {
  'use strict';

  /* === Navbar Scroll Effect === */
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    let lastScrollY = 0;
    window.addEventListener('scroll', function() {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 20) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
      lastScrollY = currentScrollY;
    }, { passive: true });
  }

  /* === Mobile Menu Toggle === */
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const mobileNav = document.querySelector('.mobile-nav');

  if (mobileMenuBtn && mobileNav) {
    mobileMenuBtn.addEventListener('click', function() {
      this.classList.toggle('active');
      mobileNav.classList.toggle('active');
      document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
    });

    mobileNav.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() {
        mobileMenuBtn.classList.remove('active');
        mobileNav.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  /* === Search Modal === */
  const searchBtns = document.querySelectorAll('[data-search-toggle]');
  const searchOverlay = document.querySelector('.search-overlay');
  const searchInput = searchOverlay ? searchOverlay.querySelector('.search-input') : null;

  searchBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (searchOverlay) {
        searchOverlay.classList.add('active');
        if (searchInput) searchInput.focus();
      }
    });
  });

  if (searchOverlay) {
    searchOverlay.addEventListener('click', function(e) {
      if (e.target === this) {
        this.classList.remove('active');
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        searchOverlay.classList.remove('active');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchOverlay.classList.toggle('active');
        if (searchOverlay.classList.contains('active') && searchInput) {
          searchInput.focus();
        }
      }
    });
  }

  /* === Scroll Reveal === */
  const revealElements = document.querySelectorAll('[data-reveal]');

  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(function(el) {
      revealObserver.observe(el);
    });
  }

  /* === Stagger Animation for Grid Items === */
  const staggerContainers = document.querySelectorAll('[data-stagger]');

  if (staggerContainers.length > 0) {
    const staggerObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          const children = entry.target.children;
          Array.from(children).forEach(function(child, index) {
            child.style.transitionDelay = (index * 0.08) + 's';
            child.classList.add('revealed');
          });
          staggerObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -30px 0px'
    });

    staggerContainers.forEach(function(el) {
      staggerObserver.observe(el);
    });
  }

  /* === Like Button Interaction === */
  const likeBtns = document.querySelectorAll('[data-like]');

  likeBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      this.classList.toggle('active');
      const countEl = this.querySelector('.like-count');
      if (countEl) {
        let count = parseInt(countEl.textContent) || 0;
        count = this.classList.contains('active') ? count + 1 : count - 1;
        countEl.textContent = count;
      }
    });
  });

  /* === Bookmark Button === */
  const bookmarkBtns = document.querySelectorAll('[data-bookmark]');

  bookmarkBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      this.classList.toggle('active');
      showToast(this.classList.contains('active') ? 'Article bookmarked' : 'Bookmark removed');
    });
  });

  /* === Toast Notification === */
  function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg><span></span>';
      document.body.appendChild(toast);
    }
    toast.querySelector('span').textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(function() {
      toast.classList.remove('show');
    }, 3000);
  }

  /* === Newsletter Form === */
  const newsletterForms = document.querySelectorAll('.newsletter-form');

  newsletterForms.forEach(function(form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var input = this.querySelector('input[type="email"]');
      if (input && input.value) {
        showToast('Thanks for subscribing!');
        input.value = '';
      }
    });
  });

  /* === Comment Form === */
  const commentForm = document.querySelector('.comment-form');
  if (commentForm) {
    commentForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var textarea = this.querySelector('textarea');
      if (textarea && textarea.value.trim()) {
        showToast('Comment submitted for review');
        textarea.value = '';
      }
    });
  }

  /* === Dashboard Sidebar Toggle (Mobile) === */
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  const dashboardSidebar = document.querySelector('.dashboard-sidebar');

  if (sidebarToggle && dashboardSidebar) {
    sidebarToggle.addEventListener('click', function() {
      dashboardSidebar.classList.toggle('active');
    });

    document.addEventListener('click', function(e) {
      if (dashboardSidebar.classList.contains('active') &&
          !dashboardSidebar.contains(e.target) &&
          !sidebarToggle.contains(e.target)) {
        dashboardSidebar.classList.remove('active');
      }
    });
  }

  /* === Password Toggle === */
  const passwordToggles = document.querySelectorAll('.toggle-password');

  passwordToggles.forEach(function(toggle) {
    toggle.addEventListener('click', function() {
      var input = this.closest('.form-input-icon').querySelector('input');
      if (input) {
        var isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        this.innerHTML = isPassword
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      }
    });
  });

  /* === Active Nav Link === */
  function setActiveNavLink() {
    var path = window.location.pathname;
    var navLinks = document.querySelectorAll('.navbar-links a, .mobile-nav a');
    navLinks.forEach(function(link) {
      link.classList.remove('active');
      var href = link.getAttribute('href');
      if (href && path.endsWith(href.replace(/^\.\.?\/?/, ''))) {
        link.classList.add('active');
      }
    });
  }
  setActiveNavLink();

  /* === Smooth Scroll for Anchor Links === */
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        var navbarHeight = document.querySelector('.navbar') ? document.querySelector('.navbar').offsetHeight : 72;
        var targetPosition = target.getBoundingClientRect().top + window.scrollY - navbarHeight - 20;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      }
    });
  });

  /* === Counter Animation === */
  function animateCounters() {
    var counters = document.querySelectorAll('[data-count]');
    counters.forEach(function(counter) {
      var target = parseInt(counter.getAttribute('data-count'));
      var duration = 1500;
      var start = 0;
      var startTime = null;

      function update(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        counter.textContent = Math.floor(eased * target);
        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          counter.textContent = target;
        }
      }

      var observer = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting) {
          requestAnimationFrame(update);
          observer.disconnect();
        }
      }, { threshold: 0.5 });

      observer.observe(counter);
    });
  }
  animateCounters();

  /* === Reading Progress Bar === */
  var progressBar = document.querySelector('.reading-progress');
  if (progressBar) {
    window.addEventListener('scroll', function() {
      var winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      var height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      var scrolled = (winScroll / height) * 100;
      progressBar.style.width = scrolled + '%';
    }, { passive: true });
  }

  /* === Image Lazy Loading === */
  if ('loading' in HTMLImageElement.prototype) {
    document.querySelectorAll('img[loading="lazy"]').forEach(function(img) {
      img.src = img.src;
    });
  }

  /* === Filter Chips (Category Page) === */
  var filterChips = document.querySelectorAll('.filter-chip');
  filterChips.forEach(function(chip) {
    chip.addEventListener('click', function() {
      filterChips.forEach(function(c) { c.classList.remove('active'); });
      this.classList.add('active');
    });
  });

  /* === Copy Code Block === */
  document.querySelectorAll('pre code').forEach(function(block) {
    var copyBtn = document.createElement('button');
    copyBtn.className = 'copy-code-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.style.cssText = 'position:absolute;top:8px;right:8px;padding:4px 10px;background:rgba(255,255,255,0.1);color:#94a3b8;border:none;border-radius:6px;font-size:0.7rem;cursor:pointer;transition:all 0.2s;';

    var pre = block.parentElement;
    pre.style.position = 'relative';
    pre.appendChild(copyBtn);

    copyBtn.addEventListener('mouseenter', function() {
      this.style.background = 'rgba(255,255,255,0.2)';
      this.style.color = '#e2e8f0';
    });

    copyBtn.addEventListener('mouseleave', function() {
      this.style.background = 'rgba(255,255,255,0.1)';
      this.style.color = '#94a3b8';
    });

    copyBtn.addEventListener('click', function() {
      navigator.clipboard.writeText(block.textContent).then(function() {
        copyBtn.textContent = 'Copied!';
        setTimeout(function() { copyBtn.textContent = 'Copy'; }, 2000);
      });
    });
  });

  /* === Share Button === */
  var shareBtns = document.querySelectorAll('[data-share]');
  shareBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (navigator.share) {
        navigator.share({
          title: document.title,
          url: window.location.href
        });
      } else {
        navigator.clipboard.writeText(window.location.href).then(function() {
          showToast('Link copied to clipboard');
        });
      }
    });
  });

})();
