/* ==========================================
   BITRA - Animations
   Premium Technology Publication Feel
   ========================================== */

document.addEventListener('DOMContentLoaded', function () {

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // ==========================================
    // Smooth Page Load
    // ==========================================
    const loadStyle = document.createElement('style');
    loadStyle.textContent = `
        body { opacity: 0; transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        body.loaded { opacity: 1; }
    `;
    document.head.appendChild(loadStyle);
    requestAnimationFrame(() => document.body.classList.add('loaded'));

    if (prefersReducedMotion.matches) {
        document.querySelectorAll(
            '.article-card, .category-card, .author-card, ' +
            '.section-header, .section-tag, .section-title, ' +
            '.cta-card, .author-stat-card, .comment-item, ' +
            '.profile-card, .author-section'
        ).forEach(function (el) {
            el.style.opacity = '1';
            el.style.transform = 'none';
        });
        return;
    }

    // ==========================================
    // Scroll Reveal (IntersectionObserver)
    // ==========================================
    var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { root: null, rootMargin: '0px 0px -40px 0px', threshold: 0.08 });

    var revealStyle = document.createElement('style');
    revealStyle.textContent = `
        .reveal-up {
            opacity: 0;
            transform: translateY(24px);
            transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1),
                        transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .reveal-up.revealed {
            opacity: 1;
            transform: translateY(0);
        }
        .reveal-scale {
            opacity: 0;
            transform: scale(0.96);
            transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1),
                        transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .reveal-scale.revealed {
            opacity: 1;
            transform: scale(1);
        }
        .reveal-left {
            opacity: 0;
            transform: translateX(-24px);
            transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1),
                        transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .reveal-left.revealed {
            opacity: 1;
            transform: translateX(0);
        }
        .reveal-right {
            opacity: 0;
            transform: translateX(24px);
            transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1),
                        transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .reveal-right.revealed {
            opacity: 1;
            transform: translateX(0);
        }
    `;
    document.head.appendChild(revealStyle);

    function initScrollReveal() {
        // Cards and grid items — staggered up
        var gridItems = document.querySelectorAll(
            '.article-card, .category-card, .author-card, .author-stat-card, .comment-item'
        );
        gridItems.forEach(function (el, i) {
            el.classList.add('reveal-up');
            el.style.transitionDelay = (i % 4) * 0.08 + 's';
            revealObserver.observe(el);
        });

        // Section headers — scale in
        document.querySelectorAll('.section-header, .section-header-center').forEach(function (el) {
            el.classList.add('reveal-scale');
            revealObserver.observe(el);
        });

        // Alternating reveal for side-by-side layouts
        document.querySelectorAll('.article-card-featured').forEach(function (el, i) {
            el.classList.add(i % 2 === 0 ? 'reveal-left' : 'reveal-right');
            revealObserver.observe(el);
        });

        // Static containers — subtle left reveal
        document.querySelectorAll('.cta-card, .profile-card, .author-section, .article-author-section').forEach(function (el) {
            el.classList.add('reveal-up');
            revealObserver.observe(el);
        });
    }

    initScrollReveal();

    // ==========================================
    // Hero Content Stagger Animation
    // ==========================================
    function animateHero() {
        var heroContent = document.querySelector('.hero-content');
        if (!heroContent) return;

        var children = heroContent.children;
        Array.from(children).forEach(function (child, index) {
            child.style.opacity = '0';
            child.style.transform = 'translateY(20px)';
            child.style.transition = 'opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1) ' + (index * 0.1 + 0.15) + 's, transform 0.7s cubic-bezier(0.4, 0, 0.2, 1) ' + (index * 0.1 + 0.15) + 's';

            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    child.style.opacity = '1';
                    child.style.transform = 'translateY(0)';
                });
            });
        });
    }

    animateHero();

    // ==========================================
    // Counter Animation for Stats
    // ==========================================
    function animateCounter(element, target, duration) {
        duration = duration || 2000;
        var start = 0;
        var startTime = null;

        function formatNumber(num) {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'm';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
            return num.toLocaleString();
        }

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / duration, 1);
            // ease-out cubic
            var eased = 1 - Math.pow(1 - progress, 3);
            var current = Math.floor(eased * target);
            element.textContent = formatNumber(current);
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                element.textContent = formatNumber(target);
            }
        }

        requestAnimationFrame(step);
    }

    var statObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting && !entry.target.dataset.animated) {
                entry.target.dataset.animated = 'true';
                var text = entry.target.textContent;
                var num = parseFloat(text.replace(/[^0-9.]/g, ''));
                if (!isNaN(num) && num > 0) {
                    animateCounter(entry.target, num);
                }
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.hero-stat .stat-number, .stat-number').forEach(function (num) {
        statObserver.observe(num);
    });

    // ==========================================
    // Parallax Effect for Hero Background
    // ==========================================
    var heroShapes = document.querySelectorAll('.hero-bg .shape');

    if (heroShapes.length > 0) {
        var ticking = false;
        window.addEventListener('scroll', function () {
            if (!ticking) {
                requestAnimationFrame(function () {
                    var scrolled = window.pageYOffset;
                    heroShapes.forEach(function (shape, index) {
                        var speed = 0.08 + (index * 0.04);
                        shape.style.transform = 'translateY(' + (scrolled * speed) + 'px)';
                    });
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    // ==========================================
    // Card Hover Tilt Effect (subtle)
    // ==========================================
    var cards = document.querySelectorAll('.article-card, .category-card, .author-card');

    cards.forEach(function (card) {
        card.addEventListener('mousemove', function (e) {
            var rect = this.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            var centerX = rect.width / 2;
            var centerY = rect.height / 2;
            var rotateX = (y - centerY) / 30;
            var rotateY = (centerX - x) / 30;

            this.style.transform = 'perspective(800px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-4px)';
            this.style.transition = 'transform 0.15s ease-out';
        });

        card.addEventListener('mouseleave', function () {
            this.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateY(0)';
            this.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        });
    });

    // ==========================================
    // Glitch Effect for 404 Page
    // ==========================================
    var glitchElement = document.querySelector('.glitch');

    if (glitchElement) {
        setInterval(function () {
            glitchElement.classList.add('glitch-active');
            setTimeout(function () {
                glitchElement.classList.remove('glitch-active');
            }, 200);
        }, 3000);
    }

    // ==========================================
    // Typing Effect for Hero Subtitle
    // ==========================================
    var heroSubtitle = document.querySelector('.hero-subtitle');

    if (heroSubtitle) {
        var text = heroSubtitle.textContent;
        heroSubtitle.textContent = '';
        heroSubtitle.style.visibility = 'visible';

        var typeIndex = 0;
        var typeDelay = 800;

        setTimeout(function typeWriter() {
            if (typeIndex < text.length) {
                heroSubtitle.textContent += text.charAt(typeIndex);
                typeIndex++;
                setTimeout(typeWriter, 18);
            }
        }, typeDelay);
    }

    // ==========================================
    // Scroll Progress Indicator (Reading Progress)
    // ==========================================
    function updateScrollProgress() {
        var scrollTop = window.pageYOffset;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        var scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        document.documentElement.style.setProperty('--scroll-progress', scrollPercent + '%');
    }

    window.addEventListener('scroll', updateScrollProgress, { passive: true });

    // ==========================================
    // Animated Gradient Text
    // ==========================================
    var gradientTexts = document.querySelectorAll('.gradient-text');

    gradientTexts.forEach(function (text) {
        text.style.backgroundSize = '200% 200%';
        text.style.animation = 'gradientShift 4s ease infinite';
    });

    var gradientStyle = document.createElement('style');
    gradientStyle.textContent = `
        @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
    `;
    document.head.appendChild(gradientStyle);

    // ==========================================
    // Magnetic Button Effect
    // ==========================================
    var magneticBtns = document.querySelectorAll('.btn-primary, .btn-glass');

    magneticBtns.forEach(function (btn) {
        btn.addEventListener('mousemove', function (e) {
            var rect = this.getBoundingClientRect();
            var x = e.clientX - rect.left - rect.width / 2;
            var y = e.clientY - rect.top - rect.height / 2;
            this.style.transform = 'translate(' + (x * 0.15) + 'px, ' + (y * 0.15) + 'px)';
        });

        btn.addEventListener('mouseleave', function () {
            this.style.transform = 'translate(0, 0)';
            this.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        });

        btn.addEventListener('mouseenter', function () {
            this.style.transition = 'transform 0.15s ease-out';
        });
    });

    // ==========================================
    // Ripple Effect on Buttons
    // ==========================================
    document.querySelectorAll('.btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            var rect = this.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;

            var ripple = document.createElement('span');
            ripple.className = 'btn-ripple';
            ripple.style.cssText = 'position:absolute;border-radius:50%;background:rgba(255,255,255,0.3);transform:scale(0);animation:ripple 0.5s ease-out;pointer-events:none;left:' + x + 'px;top:' + y + 'px;width:100px;height:100px;margin-left:-50px;margin-top:-50px;';
            this.appendChild(ripple);

            setTimeout(function () { ripple.remove(); }, 500);
        });
    });

    // Add ripple keyframes
    var rippleStyle = document.createElement('style');
    rippleStyle.textContent = `
        @keyframes ripple {
            to { transform: scale(2.5); opacity: 0; }
        }
        .btn { position: relative; overflow: hidden; }
    `;
    document.head.appendChild(rippleStyle);

    // ==========================================
    // Image Placeholder Hover
    // ==========================================
    var placeholders = document.querySelectorAll('.image-placeholder');

    placeholders.forEach(function (placeholder) {
        var svg = placeholder.querySelector('svg');
        if (!svg) return;

        placeholder.addEventListener('mouseenter', function () {
            svg.style.transform = 'scale(1.08) rotate(3deg)';
            svg.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        });

        placeholder.addEventListener('mouseleave', function () {
            svg.style.transform = 'scale(1) rotate(0)';
        });
    });

    // ==========================================
    // Floating Shapes - Subtle Mouse Following
    // ==========================================
    var heroShapes2 = document.querySelectorAll('.hero-bg .shape');

    if (heroShapes2.length > 0) {
        document.addEventListener('mousemove', function (e) {
            var x = e.clientX / window.innerWidth - 0.5;
            var y = e.clientY / window.innerHeight - 0.5;

            heroShapes2.forEach(function (shape, index) {
                var factor = (index + 1) * 0.5;
                shape.style.transform = 'translate(' + (x * 30 * factor) + 'px, ' + (y * 20 * factor) + 'px)';
            });
        });
    }

    // ==========================================
    // Smooth Focus Visible Polyfill
    // ==========================================
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-nav');
        }
    });

    document.addEventListener('mousedown', function () {
        document.body.classList.remove('keyboard-nav');
    });

    // ==========================================
    // Reading Progress Bar (Article Detail)
    // ==========================================
    function updateReadingProgress() {
        var article = document.querySelector('.article-content-wrapper');
        if (!article) return;

        var articleTop = article.getBoundingClientRect().top;
        var articleHeight = article.offsetHeight;
        var windowHeight = window.innerHeight;

        // Progress when article is in view
        if (articleTop < windowHeight && articleTop + articleHeight > 0) {
            var scrolled = windowHeight - articleTop;
            var progress = Math.max(0, Math.min(100, (scrolled / (articleHeight + windowHeight)) * 100));
            document.documentElement.style.setProperty('--reading-progress', progress + '%');
        }
    }

    window.addEventListener('scroll', updateReadingProgress, { passive: true });
});