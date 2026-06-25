/* ================================
   PRODUCTION PORTFOLIO JAVASCRIPT
   Optimized for Performance & UX
   ================================ */

// Performance: scroll spy throttle flag
let navSpyTimer = null;

// Initialize animations on DOM ready
document.addEventListener('DOMContentLoaded', initPortfolio, { once: true });

function initPortfolio() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    document.documentElement.classList.add('reduced-motion');
    revealAllAnimatedElements();
  }

  setupInstantReveal();
  setupMobileNav(); // before setupNavigation so mobileMenu API is ready
  setupNavigation();
  setupNavScroll();
  setupModals();
  setupProjectToggle();
  setupAnimationPausing();

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

// ===== INSTANT REVEAL — no scroll-triggered card motion (prevents scroll jank) =====
function setupInstantReveal() {
  document.querySelectorAll(
    '.featured-project-card, .additional-project-card, .achievement-card, ' +
    '.skill-card, .badge-item, .deploy-card, .deploy-node, ' +
    '.deploy-step-item, .section-title'
  ).forEach((el) => {
    el.classList.add('animate-in');
  });
}

// Legacy alias — kept for reduced-motion path
function setupObservers() {
  setupInstantReveal();
}

// ===== SMOOTH NAVIGATION WITH ACTIVE STATE =====
function getNavOffset() {
  const nav = document.getElementById('mainNav');
  return (nav ? nav.offsetHeight : 68) + 16;
}

function lockNavSpyDuringScroll() {
  navClickLockUntil = Date.now() + 8000;
  let unlocked = false;
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    navClickLockUntil = 0;
    navIndicatorApi?.reposition(true);
  };
  if ('onscrollend' in window) {
    window.addEventListener('scrollend', unlock, { once: true });
    setTimeout(unlock, 1400);
  } else {
    setTimeout(unlock, 750);
  }
}

function scrollToY(targetY) {
  const reduced = document.documentElement.classList.contains('reduced-motion');
  window.scrollTo({
    top: Math.max(0, targetY),
    behavior: reduced ? 'auto' : 'smooth',
  });
  lockNavSpyDuringScroll();
}

function scrollToSection(target) {
  if (!target) return;
  const reduced = document.documentElement.classList.contains('reduced-motion');
  const header = target.querySelector('.section-header');
  const anchor = header || target;
  const top = anchor.getBoundingClientRect().top + window.scrollY - getNavOffset();
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const scrollTop = Math.min(Math.max(0, top), maxScroll);

  window.scrollTo({
    top: scrollTop,
    behavior: reduced ? 'auto' : 'smooth',
  });
  lockNavSpyDuringScroll();
}

// Shared mobile-menu API — setupMobileNav registers, setupNavigation consumes.
let mobileMenu = null;
let navIndicatorApi = null;
let lastNavSection = '';
let navClickLockUntil = 0;

function isMobileNavLayout() {
  return window.matchMedia('(max-width: 768px)').matches;
}

function shouldShowNavIndicator(navLinksContainer) {
  return !isMobileNavLayout() || navLinksContainer.classList.contains('is-open');
}

function getNavLinkMetrics(link, navLinksContainer) {
  const containerRect = navLinksContainer.getBoundingClientRect();
  const linkRect = link.getBoundingClientRect();
  return {
    x: linkRect.left - containerRect.left,
    y: linkRect.top - containerRect.top,
    w: linkRect.width,
    h: linkRect.height,
  };
}

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
    if (
      !link ||
      link.classList.contains('cta-nav') ||
      !navLinksContainer.contains(link) ||
      !shouldShowNavIndicator(navLinksContainer)
    ) {
      stopAnim();
      indicator.style.opacity = '0';
      return;
    }

    const { x, y, w, h } = getNavLinkMetrics(link, navLinksContainer);
    const reduced = document.documentElement.classList.contains('reduced-motion');
    const isHidden =
      indicator.style.opacity === '0' ||
      window.getComputedStyle(indicator).opacity === '0';

    if (instant || reduced || isHidden) {
      jumpTo(x, y, w, h);
      return;
    }

    jumpTo(x, y, w, h);
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

  function setActiveSection(sectionId, animateIndicator = false) {
    if (sectionId === 'top') {
      setHomeNav();
      return;
    }

    if (sectionId === lastNavSection && !animateIndicator) return;

    let navLink = null;

    navLinks.forEach((link) => {
      const href = link.getAttribute('href').slice(1);
      const isActive = href === sectionId;
      link.classList.toggle('active', isActive);
      if (isActive) navLink = link;
    });

    lastNavSection = sectionId;

    if (sectionId === 'contact' || (navLink && navLink.classList.contains('cta-nav'))) {
      indicatorApi?.moveTo(null);
    } else if (navLink) {
      indicatorApi?.moveTo(navLink, !animateIndicator);
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
        setActiveSection(sectionId, true);
      }

      if (mobileMenu?.isOpen()) {
        mobileMenu.navigateTo(target);
        return;
      }

      if (sectionId === 'top') {
        scrollToY(0);
      } else {
        scrollToSection(target);
      }
    });
  });

  window.addEventListener('scroll', scheduleNavSpy, { passive: true });

  function scheduleNavSpy() {
    if (Date.now() < navClickLockUntil) return;
    if (navSpyTimer) return;
    navSpyTimer = setTimeout(() => {
      navSpyTimer = null;
      updateActiveNavNow();
    }, 100);
  }

  function updateActiveNavNow() {
    if (window.scrollY < 90) {
      if (lastNavSection !== 'top') setHomeNav();
      return;
    }

    const scrollMarker = window.scrollY + getNavOffset() + 20;
    let current = '';

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionBottom = sectionTop + section.offsetHeight;
      if (scrollMarker >= sectionTop && scrollMarker < sectionBottom) {
        current = section.getAttribute('id');
      }
    });

    const nearBottom =
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 48;
    if (nearBottom) {
      const lastSection = sections[sections.length - 1];
      if (lastSection) current = lastSection.getAttribute('id');
    }

    if (current === 'top') {
      setHomeNav();
    } else if (current) {
      setActiveSection(current, false);
    }
  }

  function updateActiveNav() {
    scheduleNavSpy();
  }

  const logo = document.getElementById('logo-aws-btn');
  if (logo) {
    logo.addEventListener('click', () => {
      setHomeNav();
      scrollToY(0);
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
    navIndicatorApi?.moveTo(null);
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
      requestAnimationFrame(() => {
        const id = targetEl.getAttribute('id');
        if (id === 'top') {
          scrollToY(0);
        } else {
          scrollToSection(targetEl);
        }
      });
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

  let lastScrolled = false;
  let scrollClassTimer = null;

  const applyScrolled = () => {
    const scrolled = window.scrollY > 24;
    if (scrolled !== lastScrolled) {
      nav.classList.toggle('scrolled', scrolled);
      lastScrolled = scrolled;
    }
  };

  const onScroll = () => {
    if (scrollClassTimer) return;
    scrollClassTimer = setTimeout(() => {
      scrollClassTimer = null;
      applyScrolled();
    }, 80);
  };

  applyScrolled();
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

// ===== PROJECT DETAILS TOGGLE =====
function setupProjectToggle() {
  window.toggleProjectDetails = function(button) {
    const card = button.closest('.additional-project-card');
    if (!card) return;

    button.blur();

    const isExpanded = card.classList.contains('expanded');
    const label = button.querySelector('span');

    if (!isExpanded) {
      card.classList.add('expanded');
      if (label) label.textContent = 'Hide Details';
      requestAnimationFrame(() => {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
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
document.querySelectorAll(
  '.contact-buttons a, .verify-link, .hero-verify-credly, .cta-nav'
).forEach((button) => {
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
