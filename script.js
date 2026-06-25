/* ================================
   PRODUCTION PORTFOLIO JAVASCRIPT
   Optimized for Performance & UX
   ================================ */

// Scroll layout cache + idle scheduling
let sectionBounds = [];
let scrollDocHeight = 0;

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
  setupRipples();

  // Safety: reveal content if scroll observer never fires
  setTimeout(() => {
    document.querySelectorAll('[data-animate]:not(.animate-in)').forEach((el) => {
      el.classList.add('animate-in');
    });
  }, 800);
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
  return navOffsetCached;
}

function cacheScrollLayout(sections) {
  const nav = document.getElementById('mainNav');
  navOffsetCached = (nav ? nav.offsetHeight : 68) + 16;
  scrollDocHeight = document.documentElement.scrollHeight;
  if (!sections) return;
  sectionBounds = Array.from(sections).map((section) => ({
    id: section.id,
    top: section.offsetTop,
    bottom: section.offsetTop + section.offsetHeight,
  }));
}

function getCurrentSectionFromCache() {
  const scrollY = window.scrollY;
  if (scrollY < 90) return 'top';

  const marker = scrollY + navOffsetCached + 20;
  let current = '';

  for (let i = 0; i < sectionBounds.length; i++) {
    const section = sectionBounds[i];
    if (marker >= section.top && marker < section.bottom) {
      current = section.id;
      break;
    }
  }

  if (window.innerHeight + scrollY >= scrollDocHeight - 48) {
    const last = sectionBounds[sectionBounds.length - 1];
    if (last) current = last.id;
  }

  return current || null;
}

function lockNavSpyDuringScroll() {
  navClickLockUntil = Date.now() + 8000;
  let unlocked = false;
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    navClickLockUntil = 0;
    document.documentElement.classList.remove('is-scrolling');
    const spring = canSpringNavIndicator();
    navIndicatorApi?.refreshMetrics?.();
    navIndicatorApi?.reposition(!spring);
  };
  if ('onscrollend' in window) {
    window.addEventListener('scrollend', unlock, { once: true });
    setTimeout(unlock, 1200);
  } else {
    setTimeout(unlock, 800);
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
  cacheScrollLayout(document.querySelectorAll('section[id]'));
  const reduced = document.documentElement.classList.contains('reduced-motion');
  const header = target.querySelector('.section-header');
  const anchor = header || target;
  const top = anchor.getBoundingClientRect().top + window.scrollY - navOffsetCached;
  const maxScroll = scrollDocHeight - window.innerHeight;
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

function canSpringNavIndicator() {
  return !document.documentElement.classList.contains('reduced-motion');
}

function shouldShowNavIndicator(navLinksContainer) {
  return !isMobileNavLayout() || navLinksContainer.classList.contains('is-open');
}

function setupNavIndicator(navLinksContainer) {
  const indicator = document.getElementById('navIndicator');
  if (!indicator || !navLinksContainer) return null;

  const navLinks = navLinksContainer.querySelectorAll('a[href^="#"]:not(.cta-nav)');
  let metricsCache = new Map();
  let indicatorVisible = false;

  function refreshMetrics() {
    metricsCache.clear();
    navLinks.forEach((link) => {
      metricsCache.set(link, {
        x: link.offsetLeft,
        y: link.offsetTop,
        w: link.offsetWidth,
        h: link.offsetHeight,
      });
    });
  }

  function getMetrics(link) {
    if (metricsCache.has(link)) return metricsCache.get(link);
    const m = {
      x: link.offsetLeft,
      y: link.offsetTop,
      w: link.offsetWidth,
      h: link.offsetHeight,
    };
    metricsCache.set(link, m);
    return m;
  }

  function applyMetrics(x, y, w, h) {
    indicator.style.width = `${w}px`;
    indicator.style.height = `${h}px`;
    indicator.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  function show() {
    indicator.style.opacity = '1';
    indicatorVisible = true;
  }

  function hide() {
    indicator.style.opacity = '0';
    indicatorVisible = false;
  }

  function snapInstant() {
    indicator.classList.add('is-instant');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        indicator.classList.remove('is-instant');
      });
    });
  }

  function stopAnim() {
    indicator.classList.remove('is-scrolling');
    const active = navLinksContainer.querySelector('a.active:not(.cta-nav)');
    if (active && indicatorVisible) {
      indicator.classList.add('is-instant');
      const { x, y, w, h } = getMetrics(active);
      applyMetrics(x, y, w, h);
      snapInstant();
    }
  }

  function hideDuringScroll() {
    indicator.classList.add('is-scrolling');
  }

  function canSpring() {
    return !document.documentElement.classList.contains('reduced-motion');
  }

  function moveTo(link, instant = false) {
    if (
      !link ||
      link.classList.contains('cta-nav') ||
      !navLinksContainer.contains(link) ||
      !shouldShowNavIndicator(navLinksContainer)
    ) {
      indicator.classList.add('is-instant');
      hide();
      snapInstant();
      return;
    }

    refreshMetrics();
    const { x, y, w, h } = getMetrics(link);
    const isFirstShow = !indicatorVisible;
    const useInstant = instant || !canSpring() || isFirstShow;

    indicator.classList.remove('is-scrolling');

    if (useInstant) {
      indicator.classList.add('is-instant');
      applyMetrics(x, y, w, h);
      show();
      snapInstant();
      return;
    }

    indicator.classList.remove('is-instant');
    applyMetrics(x, y, w, h);
    show();
  }

  function reposition(instant = true) {
    refreshMetrics();
    const active = navLinksContainer.querySelector('a.active:not(.cta-nav)');
    if (active) moveTo(active, instant);
    else hide();
  }

  refreshMetrics();

  window.addEventListener('resize', () => {
    refreshMetrics();
    reposition(true);
  }, { passive: true });

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      refreshMetrics();
      reposition(true);
    });
  }

  return { moveTo, reposition, stopAnim, hideDuringScroll, refreshMetrics };
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

  function setActiveSection(sectionId, options = {}) {
    const { animate = false, moveIndicator = true } = options;

    if (sectionId === 'top') {
      setHomeNav();
      return;
    }

    let navLink = null;

    navLinks.forEach((link) => {
      const href = link.getAttribute('href').slice(1);
      const isActive = href === sectionId;
      link.classList.toggle('active', isActive);
      if (isActive) navLink = link;
    });

    lastNavSection = sectionId;

    if (!moveIndicator) return;

    if (sectionId === 'contact' || (navLink && navLink.classList.contains('cta-nav'))) {
      indicatorApi?.moveTo(null);
    } else if (navLink) {
      indicatorApi?.moveTo(navLink, !animate);
    }
  }

  function getCurrentSection() {
    return getCurrentSectionFromCache();
  }

  let scrollIdleTimer = null;
  let scrollIdleToken = 0;
  let isUserScrolling = false;
  let lastNavScrolled = false;
  let scrollRafPending = false;
  let scrollEndBound = false;

  function applyNavScrolled() {
    const nav = document.getElementById('mainNav');
    if (!nav) return;
    const scrolled = window.scrollY > 24;
    if (scrolled !== lastNavScrolled) {
      nav.classList.toggle('scrolled', scrolled);
      lastNavScrolled = scrolled;
    }
  }

  function markScrolling() {
    if (!document.documentElement.classList.contains('is-scrolling')) {
      document.documentElement.classList.add('is-scrolling');
    }
  }

  function clearScrolling() {
    document.documentElement.classList.remove('is-scrolling');
  }

  function scheduleScrollIdle() {
    const token = ++scrollIdleToken;
    clearTimeout(scrollIdleTimer);
    scrollIdleTimer = setTimeout(() => {
      if (token !== scrollIdleToken) return;
      onScrollIdle();
    }, 100);
  }

  function onScrollActivity() {
    markScrolling();
    applyNavScrolled();

    if (Date.now() >= navClickLockUntil) {
      const current = getCurrentSection();
      if (current === 'top' && lastNavSection !== 'top') {
        setHomeNav();
      } else if (current && current !== lastNavSection) {
        setActiveSection(current, { animate: false, moveIndicator: false });
      }
    }

    if (Date.now() < navClickLockUntil) {
      scheduleScrollIdle();
      return;
    }

    if (!isUserScrolling) {
      isUserScrolling = true;
      indicatorApi?.hideDuringScroll();
    }
    scheduleScrollIdle();
  }

  function onScrollIdle() {
    scrollIdleToken++;
    isUserScrolling = false;
    clearScrolling();

    if (Date.now() < navClickLockUntil) return;

    const current = getCurrentSection();
    if (current === 'top') {
      if (lastNavSection !== 'top') setHomeNav();
      return;
    }

    if (!current) return;

    if (current !== lastNavSection) {
      indicatorApi?.refreshMetrics?.();
      setActiveSection(current, {
        animate: canSpringNavIndicator(),
        moveIndicator: true,
      });
      return;
    }

    indicatorApi?.reposition(!canSpringNavIndicator());
  }

  function bindScrollEnd() {
    if (scrollEndBound || !('onscrollend' in window)) return;
    scrollEndBound = true;
    window.addEventListener('scrollend', () => {
      scrollIdleToken++;
      clearTimeout(scrollIdleTimer);
      onScrollIdle();
    }, { passive: true });
  }

  bindScrollEnd();

  cacheScrollLayout(sections);
  window.addEventListener('resize', () => cacheScrollLayout(sections), { passive: true });
  window.addEventListener('orientationchange', () => {
    setTimeout(() => cacheScrollLayout(sections), 120);
  }, { passive: true });

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => cacheScrollLayout(sections));
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      const target = href && href !== '#' ? document.querySelector(href) : null;
      if (!target) return;

      e.preventDefault();

      const sectionId = target.getAttribute('id');
      if (sectionId) {
        setActiveSection(sectionId, {
          animate: canSpringNavIndicator(),
          moveIndicator: true,
        });
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

  window.addEventListener('scroll', () => {
    if (scrollRafPending) return;
    scrollRafPending = true;
    requestAnimationFrame(() => {
      scrollRafPending = false;
      onScrollActivity();
    });
  }, { passive: true });

  function updateActiveNavNow(moveIndicator = true) {
    const current = getCurrentSection();

    if (current === 'top') {
      if (lastNavSection !== 'top') setHomeNav();
      return;
    }

    if (current) {
      setActiveSection(current, { animate: false, moveIndicator });
    }
  }

  const logo = document.getElementById('logo-aws-btn');
  if (logo) {
    logo.addEventListener('click', () => {
      setHomeNav();
      scrollToY(0);
    });
    logo.style.cursor = 'pointer';
  }

  updateActiveNavNow(true);
  applyNavScrolled();
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
    requestAnimationFrame(() => {
      navIndicatorApi?.refreshMetrics?.();
      navIndicatorApi?.reposition(true);
      setTimeout(() => {
        navIndicatorApi?.refreshMetrics?.();
        navIndicatorApi?.reposition(!canSpringNavIndicator());
      }, 380);
    });
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
// Scrolled class toggled in setupNavigation scroll listener (single passive handler).
function setupNavScroll() {}

// ===== IMAGE MODAL WITH ACCESSIBILITY =====
function setupModals() {
  const modal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');
  const modalCaption = document.getElementById('modalCaption');
  const closeBtn = modal?.querySelector('.modal-close');
  let lastActive = null;
  let imageLoadToken = 0;

  function resolveImageSrc(triggerEl, fallbackSrc) {
    if (!triggerEl) return fallbackSrc;
    const img = triggerEl.querySelector('img');
    if (img) {
      const resolved = img.currentSrc || img.getAttribute('src');
      if (resolved) return resolved;
    }
    return fallbackSrc;
  }

  function openModal(src, alt, triggerEl) {
    const resolvedSrc = resolveImageSrc(triggerEl, src);
    if (!resolvedSrc || !modal || !modalImage) return;

    lastActive = document.activeElement;
    const token = ++imageLoadToken;

    modalImage.alt = alt || 'Image preview';

    if (modalCaption) {
      if (alt) {
        modalCaption.textContent = alt;
        modalCaption.hidden = false;
      } else {
        modalCaption.textContent = '';
        modalCaption.hidden = true;
      }
    }

    const finishLoad = () => {
      if (token !== imageLoadToken) return;
    };

    modalImage.onload = finishLoad;
    modalImage.onerror = finishLoad;

    if (modalImage.src !== resolvedSrc) {
      modalImage.src = resolvedSrc;
    } else {
      modalImage.src = '';
      modalImage.src = resolvedSrc;
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('modal-open');

    requestAnimationFrame(() => closeBtn?.focus());
  }

  function closeModal() {
    if (!modal || !modal.classList.contains('is-open')) return;

    imageLoadToken++;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('modal-open');

    if (modalImage) {
      modalImage.onload = null;
      modalImage.onerror = null;
      modalImage.removeAttribute('src');
      modalImage.alt = '';
    }

    if (modalCaption) {
      modalCaption.textContent = '';
      modalCaption.hidden = true;
    }

    if (lastActive && typeof lastActive.focus === 'function') {
      lastActive.focus();
    }
  }

  if (modal) {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }
  document.documentElement.classList.remove('modal-open');

  document.querySelectorAll('.clickable-image').forEach((el) => {
    const dataSrc = el.dataset.image;
    if (!dataSrc) return;

    if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    el.style.cursor = 'pointer';

    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openModal(dataSrc, el.dataset.alt, el);
    });

    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(dataSrc, el.dataset.alt, el);
      }
    });
  });

  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeModal();
  });

  modal?.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
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
      if (document.documentElement.classList.contains('is-scrolling')) return;
      const state = entries[0].isIntersecting ? 'running' : 'paused';
      els.forEach((el) => { el.style.animationPlayState = state; });
    }, { threshold: 0.05 });
    obs.observe(section);
    els.forEach((el) => { el.style.animationPlayState = 'paused'; });
  }

  watchSection('portfolio-deployment', '.deploy-line, .deploy-connector i');
  watchSection('contact', '.contact-status-dot, .contact-eyebrow i');

  const nav = document.getElementById('mainNav');
  const liveDot = nav?.querySelector('.nav-live-dot');
  if (liveDot) {
    const obs = new IntersectionObserver((entries) => {
      if (document.documentElement.classList.contains('is-scrolling')) return;
      liveDot.style.animationPlayState = entries[0].isIntersecting ? 'running' : 'paused';
    }, { threshold: 0 });
    obs.observe(nav);
    liveDot.style.animationPlayState = 'paused';
    requestAnimationFrame(() => {
      liveDot.style.animationPlayState = 'running';
    });
  }
}

// ===== RIPPLE EFFECT ON BUTTONS =====
function setupRipples() {
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
}

// Navigation + smooth scroll handled in setupNavigation — no duplicate listeners needed.
