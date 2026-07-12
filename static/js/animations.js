/* ============================================
   BITRA - Animations Module
   Premium entrance and interaction animations
   ============================================ */

(function() {
  'use strict';

  /* === Parallax Effect on Hero === */
  var heroBg = document.querySelector('.hero-bg');
  if (heroBg) {
    window.addEventListener('scroll', function() {
      var scrollY = window.scrollY;
      if (scrollY < window.innerHeight) {
        heroBg.style.transform = 'translateY(' + (scrollY * 0.3) + 'px)';
      }
    }, { passive: true });
  }

  /* === Magnetic Hover on Buttons === */
  var magneticBtns = document.querySelectorAll('.btn-primary, .btn-dark');

  magneticBtns.forEach(function(btn) {
    btn.addEventListener('mousemove', function(e) {
      var rect = this.getBoundingClientRect();
      var x = e.clientX - rect.left - rect.width / 2;
      var y = e.clientY - rect.top - rect.height / 2;
      this.style.transform = 'translate(' + (x * 0.15) + 'px, ' + (y * 0.15) + 'px)';
    });

    btn.addEventListener('mouseleave', function() {
      this.style.transform = 'translate(0, 0)';
    });
  });

  /* === Card Tilt Effect === */
  var tiltCards = document.querySelectorAll('.article-card');

  tiltCards.forEach(function(card) {
    card.addEventListener('mousemove', function(e) {
      var rect = this.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width;
      var y = (e.clientY - rect.top) / rect.height;
      var rotateX = (y - 0.5) * -6;
      var rotateY = (x - 0.5) * 6;

      this.style.transform = 'perspective(1000px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-4px)';
    });

    card.addEventListener('mouseleave', function() {
      this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
    });
  });

  /* === Typing Effect for Hero (optional) === */
  var typingEl = document.querySelector('[data-typing]');
  if (typingEl) {
    var texts = JSON.parse(typingEl.getAttribute('data-typing'));
    var textIndex = 0;
    var charIndex = 0;
    var isDeleting = false;
    var typeSpeed = 80;

    function type() {
      var currentText = texts[textIndex];

      if (isDeleting) {
        typingEl.textContent = currentText.substring(0, charIndex - 1);
        charIndex--;
      } else {
        typingEl.textContent = currentText.substring(0, charIndex + 1);
        charIndex++;
      }

      if (!isDeleting && charIndex === currentText.length) {
        typeSpeed = 2000;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % texts.length;
        typeSpeed = 500;
      } else {
        typeSpeed = isDeleting ? 40 : 80;
      }

      setTimeout(type, typeSpeed);
    }

    type();
  }

  /* === Smooth Number Counter on Scroll === */
  var counterEls = document.querySelectorAll('[data-count-up]');

  counterEls.forEach(function(el) {
    var target = parseInt(el.getAttribute('data-count-up'));
    var observer = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting) {
        var start = 0;
        var duration = 2000;
        var startTime = null;

        function step(timestamp) {
          if (!startTime) startTime = timestamp;
          var progress = Math.min((timestamp - startTime) / duration, 1);
          var eased = 1 - Math.pow(1 - progress, 4);
          el.textContent = Math.floor(eased * target).toLocaleString();
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            el.textContent = target.toLocaleString();
          }
        }

        requestAnimationFrame(step);
        observer.disconnect();
      }
    }, { threshold: 0.5 });

    observer.observe(el);
  });

  /* === Stagger Entrance for Grid Items === */
  function initStaggerAnimations() {
    var staggerGroups = document.querySelectorAll('[data-stagger-group]');

    staggerGroups.forEach(function(group) {
      var items = group.children;

      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            Array.from(items).forEach(function(item, i) {
              item.style.opacity = '0';
              item.style.transform = 'translateY(24px)';

              setTimeout(function() {
                item.style.transition = 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
              }, i * 80);
            });

            observer.unobserve(group);
          }
        });
      }, { threshold: 0.1 });

      observer.observe(group);
    });
  }

  initStaggerAnimations();

  /* === Hero Center Visual Pulse === */
  var heroCenter = document.querySelector('.hero-center-visual');
  if (heroCenter) {
    var pulseRing = document.createElement('div');
    pulseRing.style.cssText = 'position:absolute;width:100%;height:100%;border-radius:50%;border:2px solid rgba(63,114,175,0.3);animation:pulse-ring 2s ease-out infinite;pointer-events:none;';
    heroCenter.style.position = 'relative';
    heroCenter.appendChild(pulseRing);

    var style = document.createElement('style');
    style.textContent = '@keyframes pulse-ring { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }';
    document.head.appendChild(style);
  }

  /* === Smooth Page Transitions === */
  document.querySelectorAll('a[href]').forEach(function(link) {
    var href = link.getAttribute('href');
    if (href && href.match(/\.html$/) && !href.startsWith('http')) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.2s ease';

        setTimeout(function() {
          window.location.href = href;
        }, 200);
      });
    }
  });

  /* === Page Load Fade In === */
  window.addEventListener('load', function() {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.4s ease';
    requestAnimationFrame(function() {
      document.body.style.opacity = '1';
    });
  });

  /* === Cursor Glow Effect on Dark Sections === */
  var darkSections = document.querySelectorAll('.newsletter, .auth-visual, .hero-center-visual');

  darkSections.forEach(function(section) {
    var glow = document.createElement('div');
    glow.style.cssText = 'position:absolute;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(63,114,175,0.15) 0%,transparent 70%);pointer-events:none;transform:translate(-50%,-50%);z-index:0;opacity:0;transition:opacity 0.3s;';
    section.style.position = 'relative';
    section.style.overflow = 'hidden';
    section.appendChild(glow);

    section.addEventListener('mousemove', function(e) {
      var rect = this.getBoundingClientRect();
      glow.style.left = (e.clientX - rect.left) + 'px';
      glow.style.top = (e.clientY - rect.top) + 'px';
      glow.style.opacity = '1';
    });

    section.addEventListener('mouseleave', function() {
      glow.style.opacity = '0';
    });
  });

})();
