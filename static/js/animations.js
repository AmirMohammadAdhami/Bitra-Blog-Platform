/* ==========================================
   BITRA - Animations
   Premium Glassmorphism Green Theme
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
        // Make everything visible immediately
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
            transition: opacity 0.55s cubic-bezier(0.4, 0, 0.2, 1),
                        transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
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

        // Static containers — subtle left reveal
        document.querySelectorAll('.cta-card, .profile-card, .author-section').forEach(function (el) {
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
            child.style.transform = 'translateY(18px)';
            child.style.transition = 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1) ' + (index * 0.12 + 0.15) + 's, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1) ' + (index * 0.12 + 0.15) + 's';

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
        duration = duration || 1800;
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
    var cards = document.querySelectorAll('.article-card, .category-card');

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
            this.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
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
    // Scroll Progress Indicator
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
    // Magnetic Button Effect (subtle)
    // ==========================================
    var magneticBtns = document.querySelectorAll('.btn-primary.btn-lg, .btn-glass.btn-lg');

    magneticBtns.forEach(function (btn) {
        btn.addEventListener('mousemove', function (e) {
            var rect = this.getBoundingClientRect();
            var x = e.clientX - rect.left - rect.width / 2;
            var y = e.clientY - rect.top - rect.height / 2;
            this.style.transform = 'translate(' + (x * 0.1) + 'px, ' + (y * 0.1) + 'px)';
        });

        btn.addEventListener('mouseleave', function () {
            this.style.transform = 'translate(0, 0)';
            this.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
        });

        btn.addEventListener('mouseenter', function () {
            this.style.transition = 'transform 0.15s ease-out';
        });
    });

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
});
