/* ================================
   PRODUCTION PORTFOLIO JAVASCRIPT
   Optimized for Performance & UX
   ================================ */

// Performance: Request animation frame for smooth scrolling
let ticking = false;

// Initialize animations on DOM ready
document.addEventListener('DOMContentLoaded', initPortfolio, { once: true });

function initPortfolio() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    document.documentElement.classList.add('reduced-motion');
    revealAllAnimatedElements();
  }

  setupObservers();
  setupMobileNav(); // before setupNavigation so mobileMenu API is ready
  setupNavigation();
  setupNavScroll();
  setupModals();
  setupHoverEffects();
  setupProjectToggle();
  setupAnimationPausing();

  // Hero content visible immediately (animations still run on top)
  document.querySelectorAll(
    '.hero h1, .hero .subtitle, .hero-tags, .hero-credential-card'
  ).forEach((el) => {
    el.classList.add('animate-in');
  });

  // Safety: reveal content if scroll observer never fires
  setTimeout(() => {
    document.querySelectorAll('[data-animate]:not(.animate-in)').forEach((el) => {
      el.classList.add('animate-in');
    });
  }, 2000);
}

function revealAllAnimatedElements() {
  document.querySelectorAll(
    '[data-animate], .featured-project-card, .additional-project-card, ' +
    '.achievement-card, .skill-card, .badge-item, ' +
    '.section-title, .deploy-card, .deploy-node, .deploy-step-item'
  ).forEach((el) => {
    el.classList.add('animate-in');
  });
}

// ===== SMOOTH SCROLL ANIMATIONS WITH INTERSECTION OBSERVER =====
function setupObservers() {
  if (document.documentElement.classList.contains('reduced-motion')) {
    return;
  }

  const observerOptions = {
    threshold: [0, 0.1, 0.25],
    rootMargin: '0px 0px -60px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        el.style.willChange = 'opacity, transform';
        el.classList.add('animate-in');
        
        const onAnimEnd = () => {
          el.style.willChange = 'auto';
          el.removeEventListener('transitionend', onAnimEnd);
        };
        el.addEventListener('transitionend', onAnimEnd, { once: true });
        observer.unobserve(el);
      }
    });
  }, observerOptions);

  // Observe all animated elements
  const animatedElements = Array.from(
    document.querySelectorAll(
      '.featured-project-card, .additional-project-card, ' +
      '.achievement-card, .skill-card, .badge-item, ' +
      '.section-title, .deploy-card, .deploy-node, .deploy-step-item'
    )
  );

  animatedElements.forEach((el) => {
    if (!el.classList.contains('animate-in')) {
      el.dataset.animate = 'scroll';
      observer.observe(el);
    }
  });
}

// ===== SMOOTH NAVIGATION WITH ACTIVE STATE =====
function getScrollOffset() {
  const nav = document.getElementById('mainNav');
  return (nav ? nav.offsetHeight : 76) + 16;
}

let activeScrollAnim = null;

function smoothScrollToY(targetY) {
  targetY = Math.max(0, targetY);

  if (document.documentElement.classList.contains('reduced-motion')) {
    window.scrollTo(0, targetY);
    return;
  }

  if (activeScrollAnim) {
    cancelAnimationFrame(activeScrollAnim);
    activeScrollAnim = null;
  }

  const startY = window.scrollY;
  const diff = targetY - startY;

  if (Math.abs(diff) < 3) {
    window.scrollTo(0, targetY);
    return;
  }

  const duration = Math.min(900, Math.max(480, Math.abs(diff) * 0.42));
  let startTime = null;

  function easeInOutQuart(t) {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    window.scrollTo(0, startY + diff * easeInOutQuart(progress));
    if (progress < 1) {
      activeScrollAnim = requestAnimationFrame(step);
    } else {
      activeScrollAnim = null;
    }
  }

  activeScrollAnim = requestAnimationFrame(step);
}

function scrollToSection(target) {
  const top = target.getBoundingClientRect().top + window.scrollY - getScrollOffset();
  smoothScrollToY(top);
}

// Shared mobile-menu API — setupMobileNav registers, setupNavigation consumes.
let mobileMenu = null;
let navIndicatorApi = null;
let lastNavSection = '';
let navClickLockUntil = 0;

function setupNavIndicator(navLinksContainer) {
  const indicator = document.getElementById('navIndicator');
  if (!indicator || !navLinksContainer) return null;

  const spring = { stiffness: 260, damping: 26 };
  let animRaf = null;
  let pill = { x: 0, y: 0, w: 0, h: 0, vx: 0, vy: 0, vw: 0, vh: 0 };

  function applyPill() {
    indicator.style.width = `${pill.w}px`;
    indicator.style.height = `${pill.h}px`;
    indicator.style.transform = `translate3d(${pill.x}px, ${pill.y}px, 0)`;
  }

  function readPillFromDom() {
    const m = indicator.style.transform.match(
      /translate3d\(([-\d.]+)px,\s*([-\d.]+)px/
    );
    pill.x = m ? parseFloat(m[1]) : 0;
    pill.y = m ? parseFloat(m[2]) : 0;
    pill.w = indicator.offsetWidth || pill.w;
    pill.h = indicator.offsetHeight || pill.h;
  }

  function springStep(current, velocity, target, dt) {
    const force = spring.stiffness * (target - current);
    velocity += (force - spring.damping * velocity) * dt;
    current += velocity * dt;
    return { current, velocity };
  }

  function stopAnim() {
    if (animRaf) {
      cancelAnimationFrame(animRaf);
      animRaf = null;
    }
  }

  function jumpTo(x, y, w, h) {
    stopAnim();
    pill = { x, y, w, h, vx: 0, vy: 0, vw: 0, vh: 0 };
    indicator.style.opacity = '1';
    applyPill();
  }

  function springTo(x, y, w, h) {
    stopAnim();
    readPillFromDom();
    indicator.style.opacity = '1';

    let lastTime = null;

    function tick(time) {
      if (!lastTime) lastTime = time;
      const dt = Math.min((time - lastTime) / 1000, 0.032);
      lastTime = time;

      const rx = springStep(pill.x, pill.vx, x, dt);
      pill.x = rx.current;
      pill.vx = rx.velocity;

      const ry = springStep(pill.y, pill.vy, y, dt);
      pill.y = ry.current;
      pill.vy = ry.velocity;

      const rw = springStep(pill.w, pill.vw, w, dt);
      pill.w = rw.current;
      pill.vw = rw.velocity;

      const rh = springStep(pill.h, pill.vh, h, dt);
      pill.h = rh.current;
      pill.vh = rh.velocity;

      applyPill();

      const settled =
        Math.abs(pill.x - x) < 0.4 &&
        Math.abs(pill.y - y) < 0.4 &&
        Math.abs(pill.w - w) < 0.4 &&
        Math.abs(pill.h - h) < 0.4 &&
        Math.abs(pill.vx) < 0.05 &&
        Math.abs(pill.vy) < 0.05 &&
        Math.abs(pill.vw) < 0.05 &&
        Math.abs(pill.vh) < 0.05;

      if (!settled) {
        animRaf = requestAnimationFrame(tick);
      } else {
        pill = { x, y, w, h, vx: 0, vy: 0, vw: 0, vh: 0 };
        applyPill();
        animRaf = null;
      }
    }

    animRaf = requestAnimationFrame(tick);
  }

  function moveTo(link, instant = false) {
    if (!link || link.classList.contains('cta-nav')) {
      stopAnim();
      indicator.style.opacity = '0';
      return;
    }

    const x = link.offsetLeft;
    const y = link.offsetTop;
    const w = link.offsetWidth;
    const h = link.offsetHeight;
    const reduced = document.documentElement.classList.contains('reduced-motion');
    const isHidden =
      indicator.style.opacity === '0' ||
      window.getComputedStyle(indicator).opacity === '0';

    if (instant || reduced || isHidden) {
      jumpTo(x, y, w, h);
      return;
    }

    springTo(x, y, w, h);
  }

  function reposition(instant = true) {
    const active = navLinksContainer.querySelector('a.active:not(.cta-nav)');
    if (active) moveTo(active, instant);
  }

  window.addEventListener('resize', () => reposition(true), { passive: true });

  return { moveTo, reposition };
}

function setupNavigation() {
  const navLinksContainer = document.getElementById('navLinks');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  const sections = document.querySelectorAll('section[id]');
  const indicatorApi = setupNavIndicator(navLinksContainer);
  navIndicatorApi = indicatorApi;

  function setHomeNav() {
    navLinks.forEach((link) => link.classList.remove('active'));
    lastNavSection = 'top';
    indicatorApi?.moveTo(null);
  }

  function setActiveSection(sectionId, clickedLink = null, animateIndicator = false) {
    if (sectionId === 'top') {
      setHomeNav();
      return;
    }

    if (sectionId === lastNavSection && !clickedLink) return;

    let activeLink = clickedLink;

    navLinks.forEach((link) => {
      const href = link.getAttribute('href').slice(1);
      const isActive = href === sectionId;
      link.classList.toggle('active', isActive);
      if (isActive && !activeLink) activeLink = link;
    });

    lastNavSection = sectionId;

    if (sectionId === 'contact' || (activeLink && activeLink.classList.contains('cta-nav'))) {
      indicatorApi?.moveTo(null);
    } else if (activeLink) {
      indicatorApi?.moveTo(activeLink, !animateIndicator);
    }
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      const target = href && href !== '#' ? document.querySelector(href) : null;
      if (!target) return;

      e.preventDefault();

      const sectionId = target.getAttribute('id');
      if (sectionId) {
        navClickLockUntil = Date.now() + 1700;
        setActiveSection(sectionId, link, true);
      }

      if (mobileMenu?.isOpen()) {
        mobileMenu.navigateTo(target);
        return;
      }

      if (sectionId === 'top') {
        smoothScrollToY(0);
      } else {
        scrollToSection(target);
      }
    });
  });

  window.addEventListener('scroll', updateActiveNav, { passive: true });

  function updateActiveNav() {
    if (Date.now() < navClickLockUntil) return;

    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (window.scrollY < 90) {
          if (lastNavSection !== 'top') setHomeNav();
          ticking = false;
          return;
        }

        let current = '';

        sections.forEach((section) => {
          const rect = section.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom >= 150) {
            current = section.getAttribute('id');
          }
        });

        if (current === 'top') {
          setHomeNav();
        } else if (current) {
          setActiveSection(current, null, false);
        }

        ticking = false;
      });
      ticking = true;
    }
  }

  const logo = document.getElementById('logo-aws-btn');
  if (logo) {
    logo.addEventListener('click', () => {
      navClickLockUntil = Date.now() + 1700;
      setHomeNav();
      smoothScrollToY(0);
    });
    logo.style.cursor = 'pointer';
  }

  updateActiveNav();
}

// ===== MOBILE NAVIGATION =====
function setupMobileNav() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  const overlay = document.getElementById('navOverlay');
  const root = document.documentElement;

  if (!toggle || !links) return;

  function isOpen() {
    return links.classList.contains('is-open');
  }

  function unlockBody() {
    root.classList.remove('menu-open');
    root.style.overflow = '';
    document.body.style.overflow = '';
  }

  function closeMenuUI() {
    links.classList.remove('is-open');
    overlay?.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    const icon = toggle.querySelector('i');
    if (icon) icon.className = 'fas fa-bars';
  }

  function closeMenu() {
    if (!isOpen()) return;
    closeMenuUI();
    unlockBody();
  }

  function navigateTo(targetEl) {
    closeMenuUI();
    unlockBody();
    requestAnimationFrame(() => {
      const id = targetEl.getAttribute('id');
      if (id === 'top') {
        smoothScrollToY(0);
      } else {
        scrollToSection(targetEl);
      }
      requestAnimationFrame(() => navIndicatorApi?.reposition());
    });
  }

  function openMenu() {
    root.classList.add('menu-open');
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    links.classList.add('is-open');
    overlay?.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    const icon = toggle.querySelector('i');
    if (icon) icon.className = 'fas fa-times';
    requestAnimationFrame(() => navIndicatorApi?.reposition());
  }

  mobileMenu = { isOpen, navigateTo, closeMenu };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    isOpen() ? closeMenu() : openMenu();
  });

  overlay?.addEventListener('click', closeMenu);

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeMenu();
  }, { passive: true });

  window.addEventListener('orientationchange', () => {
    setTimeout(closeMenu, 100);
  }, { passive: true });
}

// ===== NAV SCROLL GLASS EFFECT =====
function setupNavScroll() {
  const nav = document.getElementById('mainNav');
  if (!nav) return;

  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 24);
  };

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

// ===== IMAGE MODAL WITH ACCESSIBILITY =====
function setupModals() {
  const modal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');
  const closeBtn = document.querySelector('.modal-close');
  let lastActive = null;

  function openModal(src, alt) {
    if (!src || !modal || !modalImage) return;

    lastActive = document.activeElement;
    modalImage.src = src;
    modalImage.alt = alt || 'Project image';
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => closeBtn?.focus(), 50);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (modalImage) {
      modalImage.removeAttribute('src');
      modalImage.alt = '';
    }
    if (lastActive && typeof lastActive.focus === 'function') {
      lastActive.focus();
    }
  }

  // Always start clean — modal hidden, scroll free
  if (modal) {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }
  document.body.style.overflow = '';

  // Clickable images
  document.querySelectorAll('.clickable-image').forEach((el) => {
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.style.cursor = 'pointer';
    
    el.addEventListener('click', () => {
      openModal(el.dataset.image, el.dataset.alt);
    });
    
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(el.dataset.image, el.dataset.alt);
      }
    });
  });

  // Modal close handlers
  closeBtn?.addEventListener('click', closeModal);
  
  modal?.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('modal-overlay')) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('is-open')) {
      closeModal();
    }
  });
}

// ===== SMOOTH HOVER EFFECTS =====
function setupHoverEffects() {
  const hoverElements = document.querySelectorAll(
    '.skill-item, .tech-tag'
  );

  hoverElements.forEach((el) => {
    el.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-3px) scale(1.05)';
    });

    el.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
    });
  });
}

// ===== PROJECT DETAILS TOGGLE =====
function setupProjectToggle() {
  window.toggleProjectDetails = function(button) {
    const card = button.closest('.additional-project-card');
    if (!card) return;

    const isExpanded = card.classList.contains('expanded');

    const label = button.querySelector('span');
    if (!isExpanded) {
      card.classList.add('expanded');
      if (label) label.textContent = 'Hide Details';
      setTimeout(() => {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 150);
    } else {
      card.classList.remove('expanded');
      if (label) label.textContent = 'View Details';
    }
  };
}

// ===== PAUSE CONTINUOUS ANIMATIONS WHEN OFF-SCREEN =====
// CI/CD flow lines + arrows run every frame — no point paying GPU cost when the section isn't visible.
// Contact pulsing dot is cheap but consistency is good.
function setupAnimationPausing() {
  function watchSection(sectionId, selector) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const els = section.querySelectorAll(selector);
    if (!els.length) return;
    const obs = new IntersectionObserver((entries) => {
      const state = entries[0].isIntersecting ? 'running' : 'paused';
      els.forEach((el) => { el.style.animationPlayState = state; });
    }, { threshold: 0.05 });
    obs.observe(section);
    // Start paused — let observer enable them when scrolled into view
    els.forEach((el) => { el.style.animationPlayState = 'paused'; });
  }

  watchSection('portfolio-deployment', '.deploy-line, .deploy-connector i');
  watchSection('contact', '.contact-status-dot, .contact-eyebrow i');
}

// ===== RIPPLE EFFECT ON BUTTONS =====
document.querySelectorAll('.github-link, .contact-buttons a, .verify-link').forEach((button) => {
  button.addEventListener('click', function(e) {
    if (e.clientX === 0 && e.clientY === 0) return;

    const ripple = document.createElement('span');
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');

    this.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
});

// Navigation + smooth scroll handled in setupNavigation — no duplicate listeners needed.
