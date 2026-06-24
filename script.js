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

function scrollToSection(target) {
  const top = target.getBoundingClientRect().top + window.scrollY - getScrollOffset();
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

// Shared mobile-menu API — setupMobileNav registers, setupNavigation consumes.
let mobileMenu = null;
let navIndicatorApi = null;
let lastNavSection = '';
let navClickLockUntil = 0;

function setupNavIndicator(navLinksContainer) {
  const indicator = document.getElementById('navIndicator');
  if (!indicator || !navLinksContainer) return null;

  function setInstant(on) {
    indicator.classList.toggle('is-instant', on);
  }

  function jumpTo(x, y, w, h) {
    setInstant(true);
    indicator.style.opacity = '1';
    indicator.style.width = `${w}px`;
    indicator.style.height = `${h}px`;
    indicator.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1, 1)`;
    requestAnimationFrame(() => setInstant(false));
  }

  function moveTo(link, instant = false) {
    if (!link || link.classList.contains('cta-nav')) {
      indicator.style.opacity = '0';
      return;
    }

    const x = link.offsetLeft;
    const y = link.offsetTop;
    const w = link.offsetWidth;
    const h = link.offsetHeight;
    const reduced = document.documentElement.classList.contains('reduced-motion');
    const isHidden = indicator.style.opacity === '0' ||
      window.getComputedStyle(indicator).opacity === '0';

    if (instant || reduced || isHidden) {
      jumpTo(x, y, w, h);
      return;
    }

    // FLIP: animate only transform — width/height snap instantly.
    // Fixes right-to-left stutter caused by width + position fighting.
    const first = indicator.getBoundingClientRect();

    setInstant(true);
    indicator.style.opacity = '1';
    indicator.style.width = `${w}px`;
    indicator.style.height = `${h}px`;
    indicator.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1, 1)`;

    const last = indicator.getBoundingClientRect();
    const invertX = first.left - last.left;
    const invertY = first.top - last.top;
    const scaleX = first.width / (last.width || 1);
    const scaleY = first.height / (last.height || 1);

    indicator.style.transform =
      `translate3d(${x + invertX}px, ${y + invertY}px, 0) scale(${scaleX}, ${scaleY})`;

    setInstant(false);
    indicator.getBoundingClientRect(); // flush layout before play
    indicator.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1, 1)`;
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

  function setActiveSection(sectionId, clickedLink = null, animateIndicator = false) {
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
        navClickLockUntil = Date.now() + 1500;
        setActiveSection(sectionId, link, true);
      }

      if (mobileMenu?.isOpen()) {
        mobileMenu.navigateTo(target);
        return;
      }

      scrollToSection(target);
    });
  });

  window.addEventListener('scroll', updateActiveNav, { passive: true });

  function updateActiveNav() {
    if (Date.now() < navClickLockUntil) return;

    if (!ticking) {
      window.requestAnimationFrame(() => {
        let current = '';

        sections.forEach((section) => {
          const rect = section.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom >= 150) {
            current = section.getAttribute('id');
          }
        });

        if (current) setActiveSection(current, null, false);

        ticking = false;
      });
      ticking = true;
    }
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
      scrollToSection(targetEl);
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

// ===== LOGO CLICK SCROLL TO TOP =====
const logo = document.querySelector('.logo');
if (logo) {
  logo.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  logo.style.cursor = 'pointer';
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

// ===== SMOOTH SCROLL POLYFILL (iOS Safari < 15.4, old Android) =====
// Our smoothScrollTo already uses scrollTo({behavior:'smooth'}).
// For browsers without native smooth scroll, fall back to RAF easing.
(function() {
  if ('scrollBehavior' in document.documentElement.style) return;

  const nativeScrollTo = window.scrollTo.bind(window);
  const duration = 480;

  window.scrollTo = function(xOrOptions, yPos) {
    let targetY = 0;
    if (typeof xOrOptions === 'object' && xOrOptions !== null) {
      if (xOrOptions.behavior !== 'smooth') {
        nativeScrollTo(xOrOptions.left || 0, xOrOptions.top || 0);
        return;
      }
      targetY = xOrOptions.top != null ? xOrOptions.top : window.pageYOffset;
    } else {
      nativeScrollTo(xOrOptions, yPos);
      return;
    }

    const startY = window.pageYOffset;
    const diff = targetY - startY;
    let startTime = null;

    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      nativeScrollTo(0, startY + diff * easeInOutCubic(progress));
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  };
})();

// Anchor scroll is handled by setupNavigation — no duplicate listener needed.
