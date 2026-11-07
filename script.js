const navbar = document.getElementById('navbar');
const scrollProgress = document.getElementById('scroll-progress');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

// Native anchors preserve hashes, browser history, and keyboard navigation.
// CSS scroll-margin-top keeps destinations clear of the fixed navigation.
function updateScrollUI() {
    navbar?.classList.toggle('scrolled', window.scrollY > 50);
    const range = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (scrollProgress) scrollProgress.style.width = `${range > 0 ? window.scrollY / range * 100 : 0}%`;
}
window.addEventListener('scroll', updateScrollUI, { passive: true });
window.addEventListener('resize', updateScrollUI);
updateScrollUI();

// Reveal once; leave content visible when motion is reduced or the API is absent.
let revealObserver;
if ('IntersectionObserver' in window && !motionPreference.matches) {
    revealObserver = new IntersectionObserver(entries => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
            }
        }
    }, { threshold: 0.1 });
    document.querySelectorAll('.project-card, .experience-item, .section-header, .about-content').forEach(element => {
        element.classList.add('scroll-reveal');
        revealObserver.observe(element);
    });
}
motionPreference.addEventListener('change', () => {
    if (motionPreference.matches) {
        revealObserver?.disconnect();
        document.querySelectorAll('.scroll-reveal').forEach(element => element.classList.add('is-visible'));
    }
});

const menuButton = document.getElementById('mobile-menu');
const navLinks = document.getElementById('navigation-links');
const mobileViewport = window.matchMedia('(max-width: 768px)');
if (menuButton && navLinks) {
    menuButton.dataset.enhanced = '';
    navLinks.dataset.enhanced = '';
    function setMenu(open, restoreFocus = false) {
        const expanded = mobileViewport.matches && open;
        navLinks.classList.toggle('active', expanded);
        navLinks.inert = mobileViewport.matches && !expanded;
        menuButton.setAttribute('aria-expanded', String(expanded));
        menuButton.setAttribute('aria-label', expanded ? 'Close navigation' : 'Open navigation');
        menuButton.querySelector('.menu-symbol').textContent = expanded ? '×' : '☰';
        if (restoreFocus) menuButton.focus();
    }
    menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
    navLinks.addEventListener('click', event => {
        if (event.target.closest('a')) setMenu(false, mobileViewport.matches);
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') setMenu(false, true);
    });
    document.addEventListener('click', event => {
        if (!navbar.contains(event.target) && menuButton.getAttribute('aria-expanded') === 'true') {
            setMenu(false, navLinks.contains(document.activeElement));
        }
    });
    mobileViewport.addEventListener('change', () => {
        const focusWasInMenu = navLinks.contains(document.activeElement);
        const focusWasOnButton = document.activeElement === menuButton;
        setMenu(false, mobileViewport.matches && focusWasInMenu);
        if (!mobileViewport.matches && focusWasOnButton) navLinks.querySelector('a').focus();
    });
    setMenu(false);
}

// A bounded particle field preserves the neural aesthetic on large displays.
const canvas = document.getElementById('neural-canvas');
const ctx = canvas?.getContext('2d');
if (ctx) {
    let width = 0;
    let height = 0;
    let particles = [];
    let frameId = null;
    let previousTime = null;
    const mouse = { x: null, y: null, radius: 150 };
    const connectionRadius = 100;

    function resizeCanvas() {
        width = window.innerWidth;
        height = window.innerHeight;
        const scale = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        const count = Math.min(100, Math.ceil(width * height / 12000));
        particles = Array.from({ length: count }, () => ({
            x: Math.random() * width, y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.7, vy: (Math.random() - 0.5) * 0.7,
            radius: Math.random() * 1.5 + 0.5
        }));
        draw(0);
    }

    function connect(a, b, radius, color, opacity) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared >= radius * radius) return;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${color}, ${opacity * (1 - Math.sqrt(distanceSquared) / radius)})`;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
    }

    function draw(step) {
        ctx.clearRect(0, 0, width, height);
        ctx.lineWidth = 0.5;
        for (const particle of particles) {
            particle.x += particle.vx * step;
            particle.y += particle.vy * step;
            if (particle.x < 0 || particle.x > width) {
                particle.x = Math.max(0, Math.min(width, particle.x));
                particle.vx *= -1;
            }
            if (particle.y < 0 || particle.y > height) {
                particle.y = Math.max(0, Math.min(height, particle.y));
                particle.vy *= -1;
            }
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 210, 255, 0.5)';
            ctx.fill();
        }
        // Test each pair once; reject distant pairs before taking a square root.
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                connect(particles[i], particles[j], connectionRadius, '0, 210, 255', 0.3);
            }
            if (mouse.x !== null && !motionPreference.matches) {
                connect(particles[i], mouse, mouse.radius, '0, 255, 159', 0.5);
            }
        }
    }

    function animate(time) {
        if (document.hidden || motionPreference.matches) {
            frameId = null;
            previousTime = null;
            return;
        }
        if (previousTime === null || time - previousTime >= 1000 / 30) {
            const step = previousTime === null ? 0 : Math.min((time - previousTime) / (1000 / 60), 3);
            draw(step);
            previousTime = time;
        }
        frameId = requestAnimationFrame(animate);
    }
    function syncAnimation() {
        if (frameId !== null) cancelAnimationFrame(frameId);
        frameId = null;
        previousTime = null;
        if (!document.hidden) {
            if (motionPreference.matches) draw(0);
            else frameId = requestAnimationFrame(animate);
        }
    }
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('pointermove', event => {
        if (event.pointerType === 'mouse') { mouse.x = event.clientX; mouse.y = event.clientY; }
    }, { passive: true });
    window.addEventListener('pointerout', event => {
        if (!event.relatedTarget) { mouse.x = null; mouse.y = null; }
    });
    window.addEventListener('blur', () => { mouse.x = null; mouse.y = null; });
    document.addEventListener('visibilitychange', syncAnimation);
    motionPreference.addEventListener('change', syncAnimation);
    resizeCanvas();
    syncAnimation();
}
