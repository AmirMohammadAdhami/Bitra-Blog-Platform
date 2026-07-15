/* ==========================================
   BITRA - Animations
   ========================================== */

document.addEventListener('DOMContentLoaded', function() {

    // ==========================================
    // Intersection Observer for Scroll Reveal
    // ==========================================
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const revealObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Add reveal animation classes
    function initScrollReveal() {
        const elements = document.querySelectorAll(
            '.article-card, .category-card, .author-card, ' +
            '.section-header, .section-tag, .section-title, ' +
            '.cta-card, .author-stat-card, .comment-item, ' +
            '.profile-card, .author-section'
        );

        elements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = `opacity 0.6s ease ${index % 3 * 0.1}s, transform 0.6s ease ${index % 3 * 0.1}s`;
            revealObserver.observe(el);
        });
    }

    // Revealed state
    const style = document.createElement('style');
    style.textContent = `
        .revealed {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (!prefersReducedMotion.matches) {
        initScrollReveal();
    } else {
        // Show all elements immediately if reduced motion is preferred
        document.querySelectorAll(
            '.article-card, .category-card, .author-card, ' +
            '.section-header, .section-tag, .section-title, ' +
            '.cta-card, .author-stat-card, .comment-item, ' +
            '.profile-card, .author-section'
        ).forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'none';
        });
    }

    // ==========================================
    // Hero Content Animation
    // ==========================================
    function animateHero() {
        const heroContent = document.querySelector('.hero-content');
        if (!heroContent) return;

        const children = heroContent.children;
        Array.from(children).forEach((child, index) => {
            child.style.opacity = '0';
            child.style.transform = 'translateY(20px)';
            child.style.transition = `opacity 0.8s ease ${index * 0.15}s, transform 0.8s ease ${index * 0.15}s`;

            setTimeout(() => {
                child.style.opacity = '1';
                child.style.transform = 'translateY(0)';
            }, 100);
        });
    }

    if (!prefersReducedMotion.matches) {
        animateHero();
    }

    // ==========================================
    // Counter Animation for Stats
    // ==========================================
    function animateCounter(element, target, duration = 2000) {
        let start = 0;
        const increment = target / (duration / 16);
        const suffix = element.textContent.replace(/[\d,.]+/, '');

        function updateCounter() {
            start += increment;
            if (start < target) {
                element.textContent = formatNumber(Math.floor(start)) + suffix;
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = formatNumber(target) + suffix;
            }
        }

        updateCounter();
    }

    function formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'm';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num.toLocaleString();
    }

    // Observe stat numbers
    const statNumbers = document.querySelectorAll('.hero-stat .stat-number, .stat-number');
    const statObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.dataset.animated) {
                entry.target.dataset.animated = 'true';
                const text = entry.target.textContent;
                const num = parseFloat(text.replace(/[^0-9.]/g, ''));
                if (!isNaN(num) && num > 0) {
                    animateCounter(entry.target, num);
                }
            }
        });
    }, { threshold: 0.5 });

    statNumbers.forEach(num => statObserver.observe(num));

    // ==========================================
    // Parallax Effect for Hero Background
    // ==========================================
    const heroShapes = document.querySelectorAll('.hero-bg .shape');

    if (!prefersReducedMotion.matches && heroShapes.length > 0) {
        window.addEventListener('scroll', function() {
            const scrolled = window.pageYOffset;
            heroShapes.forEach((shape, index) => {
                const speed = 0.1 + (index * 0.05);
                shape.style.transform = `translateY(${scrolled * speed}px)`;
            });
        }, { passive: true });
    }

    // ==========================================
    // Card Hover Tilt Effect
    // ==========================================
    const cards = document.querySelectorAll('.article-card, .category-card');

    if (!prefersReducedMotion.matches) {
        cards.forEach(card => {
            card.addEventListener('mousemove', function(e) {
                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = (y - centerY) / 20;
                const rotateY = (centerX - x) / 20;

                this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
            });

            card.addEventListener('mouseleave', function() {
                this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
            });
        });
    }

    // ==========================================
    // Glitch Effect for 404 Page
    // ==========================================
    const glitchElement = document.querySelector('.glitch');

    if (glitchElement && !prefersReducedMotion.matches) {
        setInterval(() => {
            glitchElement.classList.add('glitch-active');
            setTimeout(() => {
                glitchElement.classList.remove('glitch-active');
            }, 200);
        }, 3000);
    }

    // ==========================================
    // Typing Effect for Hero Subtitle
    // ==========================================
    const heroSubtitle = document.querySelector('.hero-subtitle');

    if (heroSubtitle && !prefersReducedMotion.matches) {
        const text = heroSubtitle.textContent;
        heroSubtitle.textContent = '';
        heroSubtitle.style.visibility = 'visible';

        let index = 0;
        function typeWriter() {
            if (index < text.length) {
                heroSubtitle.textContent += text.charAt(index);
                index++;
                setTimeout(typeWriter, 20);
            }
        }

        setTimeout(typeWriter, 1000);
    }

    // ==========================================
    // Smooth Loading Animation
    // ==========================================
    document.body.classList.add('loaded');

    const loadStyle = document.createElement('style');
    loadStyle.textContent = `
        body {
            opacity: 0;
            transition: opacity 0.5s ease;
        }
        body.loaded {
            opacity: 1;
        }
    `;
    document.head.appendChild(loadStyle);

    // ==========================================
    // Magnetic Button Effect
    // ==========================================
    const magneticBtns = document.querySelectorAll('.btn-primary, .btn-glass');

    if (!prefersReducedMotion.matches) {
        magneticBtns.forEach(btn => {
            btn.addEventListener('mousemove', function(e) {
                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;

                this.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
            });

            btn.addEventListener('mouseleave', function() {
                this.style.transform = 'translate(0, 0)';
            });
        });
    }

    // ==========================================
    // Staggered Grid Animation
    // ==========================================
    const grids = document.querySelectorAll('.articles-grid, .categories-grid');

    grids.forEach(grid => {
        const children = grid.children;
        Array.from(children).forEach((child, index) => {
            child.style.animationDelay = `${index * 0.1}s`;
        });
    });

    // ==========================================
    // Image Placeholder Animation
    // ==========================================
    const placeholders = document.querySelectorAll('.image-placeholder');

    placeholders.forEach(placeholder => {
        placeholder.addEventListener('mouseenter', function() {
            this.querySelector('svg').style.transform = 'scale(1.1) rotate(5deg)';
            this.querySelector('svg').style.transition = 'transform 0.3s ease';
        });

        placeholder.addEventListener('mouseleave', function() {
            this.querySelector('svg').style.transform = 'scale(1) rotate(0)';
        });
    });

    // ==========================================
    // Scroll Progress Indicator
    // ==========================================
    function updateScrollProgress() {
        const scrollTop = window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;

        document.documentElement.style.setProperty('--scroll-progress', `${scrollPercent}%`);
    }

    window.addEventListener('scroll', updateScrollProgress, { passive: true });

    // ==========================================
    // Animated Gradient Text
    // ==========================================
    const gradientTexts = document.querySelectorAll('.gradient-text');

    gradientTexts.forEach(text => {
        text.style.backgroundSize = '200% 200%';
        text.style.animation = 'gradientShift 3s ease infinite';
    });

    const gradientStyle = document.createElement('style');
    gradientStyle.textContent = `
        @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
    `;
    document.head.appendChild(gradientStyle);

});
