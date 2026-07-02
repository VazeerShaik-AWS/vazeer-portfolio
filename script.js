/* ================================
   PRODUCTION PORTFOLIO JAVASCRIPT
   Optimized for Performance & UX
   ================================ */

// Scroll layout cache + idle scheduling
let sectionBounds = [];
let scrollDocHeight = 0;
let navOffsetCached = 72;

// Initialize animations on DOM ready
document.addEventListener('DOMContentLoaded', initPortfolio, { once: true });

function initPortfolio() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    document.documentElement.classList.add('reduced-motion');
    revealAllAnimatedElements();
  }

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      document.documentElement.classList.add('fonts-ready');
    });
  } else {
    document.documentElement.classList.add('fonts-ready');
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
  navOffsetCached = (nav ? nav.offsetHeight : 68) + (isMobileNavLayout() ? 12 : 16);
  scrollDocHeight = document.documentElement.scrollHeight;
  if (!sections) return;
  sectionBounds = Array.from(sections).map((section) => ({
    id: section.id,
    top: section.offsetTop,
    bottom: section.offsetTop + section.offsetHeight,
  }));
}

function revealSectionsForScroll() {
  document.querySelectorAll('section[id]:not(#top)').forEach((section) => {
    section.style.contentVisibility = 'visible';
  });
  void document.documentElement.offsetHeight;
}

function restoreSectionVisibility() {
  document.querySelectorAll('section[id]:not(#top)').forEach((section) => {
    section.style.contentVisibility = '';
  });
}

function getSectionScrollTop(target) {
  if (!target) return 0;

  const section = target.matches?.('section[id]')
    ? target
    : target.closest?.('section[id]') || target;

  revealSectionsForScroll();
  cacheScrollLayout(document.querySelectorAll('section[id]'));

  const header = section.querySelector?.('.section-header');
  const anchor = header || section;
  const navGap = isMobileNavLayout() ? 10 : 8;
  const top = anchor.getBoundingClientRect().top + window.scrollY - navOffsetCached - navGap;
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return Math.min(Math.max(0, top), maxScroll);
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

let navClickLockUntil = 0;
let navSpyPaused = false;
let navScrollUnlockTimer = null;
let userNavTarget = null;

function clearNavScrollLock() {
  navClickLockUntil = 0;
  navSpyPaused = false;
  if (navScrollUnlockTimer) {
    clearTimeout(navScrollUnlockTimer);
    navScrollUnlockTimer = null;
  }
}

function lockNavSpyDuringScroll() {
  navSpyPaused = true;
  navClickLockUntil = Date.now() + 6000;
  if (navScrollUnlockTimer) clearTimeout(navScrollUnlockTimer);
  if (!('onscrollend' in window)) {
    navScrollUnlockTimer = setTimeout(clearNavScrollLock, 900);
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
  const scrollTop = getSectionScrollTop(target);

  window.scrollTo({
    top: scrollTop,
    behavior: reduced ? 'auto' : 'smooth',
  });
  lockNavSpyDuringScroll();

  const restoreAfterScroll = () => {
    restoreSectionVisibility();
    cacheScrollLayout(document.querySelectorAll('section[id]'));
  };

  if ('onscrollend' in window) {
    window.addEventListener('scrollend', restoreAfterScroll, { once: true });
    setTimeout(restoreAfterScroll, reduced ? 0 : 1200);
  } else {
    setTimeout(restoreAfterScroll, reduced ? 0 : 700);
  }
}

// Shared mobile-menu API — setupMobileNav registers, setupNavigation consumes.
let mobileMenu = null;
let navIndicatorApi = null;
let navSpyApi = null;
let lastNavSection = '';

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
  let springEndHandler = null;

  function clearSpringEnd() {
    if (springEndHandler) {
      indicator.removeEventListener('transitionend', springEndHandler);
      springEndHandler = null;
    }
    indicator.classList.remove('is-springing');
  }

  function watchSpringEnd() {
    clearSpringEnd();
    indicator.classList.add('is-springing');
    springEndHandler = (e) => {
      if (e.target !== indicator) return;
      if (e.propertyName !== 'transform' && e.propertyName !== 'width') return;
      clearSpringEnd();
    };
    indicator.addEventListener('transitionend', springEndHandler);
  }

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

  function freezeToVisualPosition() {
    indicator.classList.add('is-instant');
    const cr = navLinksContainer.getBoundingClientRect();
    const ir = indicator.getBoundingClientRect();
    applyMetrics(
      ir.left - cr.left,
      ir.top - cr.top,
      ir.width,
      ir.height
    );
    void indicator.offsetHeight;
  }

  function show() {
    indicator.style.opacity = '1';
    indicatorVisible = true;
  }

  function hide() {
    indicator.classList.add('is-instant');
    indicator.style.opacity = '0';
    indicatorVisible = false;
    void indicator.offsetHeight;
    indicator.classList.remove('is-instant');
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
      clearSpringEnd();
      freezeToVisualPosition();
      hide();
      return;
    }

    refreshMetrics();
    const { x, y, w, h } = getMetrics(link);
    const isFirstShow = !indicatorVisible;
    const useInstant = instant || !canSpring() || isFirstShow;

    clearSpringEnd();

    if (useInstant) {
      indicator.classList.add('is-instant');
      applyMetrics(x, y, w, h);
      show();
      void indicator.offsetHeight;
      indicator.classList.remove('is-instant');
      return;
    }

    if (indicatorVisible) {
      freezeToVisualPosition();
    }
    indicator.classList.remove('is-instant');
    applyMetrics(x, y, w, h);
    show();
    watchSpringEnd();
  }

  function stopAnim() {
    if (!indicatorVisible) return;
    freezeToVisualPosition();
  }

  function reposition(instant = true) {
    refreshMetrics();
    const active = navLinksContainer.querySelector('a.active:not(.cta-nav)');
    if (active) moveTo(active, instant);
    else hide();
  }

  function commitToActive(spring = false) {
    refreshMetrics();
    const active = navLinksContainer.querySelector('a.active:not(.cta-nav)');
    if (active) moveTo(active, !spring);
    else hide();
  }

  refreshMetrics();

  window.addEventListener('resize', () => {
    refreshMetrics();
    reposition(true);
  }, { passive: true });

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      document.documentElement.classList.add('fonts-ready');
      refreshMetrics();
    });
  }

  return { moveTo, reposition, stopAnim, refreshMetrics, commitToActive };
}

/** Apple-tier: IntersectionObserver nav spy — zero scroll-frame JS work */
function setupIntersectionNavSpy(sections, mainNav, indicatorApi, setActiveSection, setHomeNav) {
  const sectionList = Array.from(sections).filter((s) => s.id && s.id !== 'top');
  const sectionRatios = new Map();
  let syncRaf = null;

  function pickSection() {
    if (window.scrollY < 72) return 'top';

    const doc = document.documentElement;
    if (window.innerHeight + window.scrollY >= doc.scrollHeight - 40) {
      return sectionList[sectionList.length - 1]?.id || null;
    }

    let bestId = null;
    let bestRatio = 0;
    sectionRatios.forEach((ratio, id) => {
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestId = id;
      }
    });
    return bestId;
  }

  function syncNav(fromScrollEnd = false) {
    if (syncRaf) cancelAnimationFrame(syncRaf);
    syncRaf = requestAnimationFrame(() => {
      syncRaf = null;
      if (navSpyPaused && !fromScrollEnd) return;
      if (!fromScrollEnd && Date.now() < navClickLockUntil) return;

      const current = pickSection();
      if (current === 'top') {
        if (lastNavSection !== 'top') setHomeNav();
        if (userNavTarget === 'top') userNavTarget = null;
        return;
      }
      if (!current) return;

      if (
        fromScrollEnd &&
        userNavTarget &&
        lastNavSection === userNavTarget &&
        current !== userNavTarget
      ) {
        return;
      }

      if (userNavTarget && current === userNavTarget) {
        userNavTarget = null;
      }

      const spring = fromScrollEnd && canSpringNavIndicator();
      if (current !== lastNavSection) {
        indicatorApi?.refreshMetrics?.();
        setActiveSection(current, { animate: spring, moveIndicator: true });
      }
    });
  }

  const hero = document.getElementById('top');
  if (hero && mainNav) {
    const heroObs = new IntersectionObserver(
      ([entry]) => {
        const pastHero = !entry.isIntersecting || entry.intersectionRatio < 0.9;
        mainNav.classList.toggle('scrolled', pastHero);
      },
      { threshold: [0, 0.25, 0.5, 0.9, 1] }
    );
    heroObs.observe(hero);
  }

  const marginTop = -(navOffsetCached + 8);
  const spyObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const id = entry.target.id;
        if (entry.isIntersecting) {
          sectionRatios.set(id, entry.intersectionRatio);
        } else {
          sectionRatios.delete(id);
        }
      });
      syncNav(false);
    },
    {
      rootMargin: `${marginTop}px 0px -42% 0px`,
      threshold: [0, 0.05, 0.12, 0.2, 0.35, 0.5, 0.65],
    }
  );

  sectionList.forEach((section) => spyObs.observe(section));

  if ('onscrollend' in window) {
    window.addEventListener(
      'scrollend',
      () => {
        clearNavScrollLock();
        syncNav(true);
      },
      { passive: true }
    );
  } else {
    let scrollEndTimer = null;
    window.addEventListener(
      'scroll',
      () => {
        clearTimeout(scrollEndTimer);
        scrollEndTimer = setTimeout(() => {
          clearNavScrollLock();
          syncNav(true);
        }, 160);
      },
      { passive: true }
    );
  }

  window.addEventListener(
    'resize',
    () => syncNav(false),
    { passive: true }
  );

  syncNav(false);
  return { sync: syncNav };
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

  const mainNav = document.getElementById('mainNav');
  navSpyApi = setupIntersectionNavSpy(
    sections,
    mainNav,
    indicatorApi,
    setActiveSection,
    setHomeNav
  );

  cacheScrollLayout(sections);
  window.addEventListener('resize', () => cacheScrollLayout(sections), { passive: true });
  window.addEventListener('orientationchange', () => {
    setTimeout(() => cacheScrollLayout(sections), 120);
  }, { passive: true });

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      document.documentElement.classList.add('fonts-ready');
      cacheScrollLayout(sections);
      indicatorApi?.refreshMetrics?.();
      navSpyApi?.sync(false);
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      const target = href && href !== '#' ? document.querySelector(href) : null;
      if (!target) return;

      e.preventDefault();

      const sectionId = target.getAttribute('id');
      if (sectionId) {
        userNavTarget = sectionId;
        navIndicatorApi?.stopAnim?.();
        navIndicatorApi?.refreshMetrics?.();
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
}

// ===== MOBILE NAVIGATION =====
function setupMobileNav() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  const overlay = document.getElementById('navOverlay');
  const mainNav = document.getElementById('mainNav');
  const root = document.documentElement;

  if (!toggle || !links) return;

  function isOpen() {
    return links.classList.contains('is-open');
  }

  function unlockBody() {
    root.classList.remove('menu-open');
    mainNav?.classList.remove('menu-is-open');
    links.setAttribute('aria-hidden', 'true');
  }

  function lockBody() {
    root.classList.add('menu-open');
    mainNav?.classList.add('menu-is-open');
    links.setAttribute('aria-hidden', 'false');
  }

  function closeMenuUI() {
    links.classList.remove('is-open');
    overlay?.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
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
    const sectionId = targetEl?.getAttribute?.('id') || null;
    closeMenuUI();
    unlockBody();

    const performScroll = () => {
      if (sectionId === 'top') {
        scrollToY(0);
        return;
      }
      scrollToSection(targetEl);
    };

    if (isMobileNavLayout()) {
      setTimeout(performScroll, 90);
    } else {
      requestAnimationFrame(() => requestAnimationFrame(performScroll));
    }
  }

  function openMenu() {
    lockBody();
    links.classList.add('is-open');
    overlay?.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    const icon = toggle.querySelector('i');
    if (icon) icon.className = 'fas fa-times';
    requestAnimationFrame(() => {
      navIndicatorApi?.refreshMetrics?.();
      navIndicatorApi?.reposition(true);
      requestAnimationFrame(() => {
        navIndicatorApi?.refreshMetrics?.();
        navIndicatorApi?.reposition(!canSpringNavIndicator());
      });
    });
  }

  mobileMenu = { isOpen, navigateTo, closeMenu };

  if (isMobileNavLayout()) {
    links.setAttribute('aria-hidden', 'true');
  } else {
    links.removeAttribute('aria-hidden');
  }

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isOpen() ? closeMenu() : openMenu();
  });

  overlay?.addEventListener('click', closeMenu);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      closeMenu();
      links.removeAttribute('aria-hidden');
    } else if (!isOpen()) {
      links.setAttribute('aria-hidden', 'true');
    }
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

  function resolveModalCaption(triggerEl, fallbackAlt) {
    const card = triggerEl?.closest('.featured-project-card');
    if (card) {
      const title = card.querySelector('.featured-project-content h3');
      const name = title?.textContent?.trim();
      if (name) return name;
    }
    return fallbackAlt || '';
  }

  function openModal(src, alt, triggerEl) {
    const resolvedSrc = resolveImageSrc(triggerEl, src);
    const resolvedAlt = resolveModalCaption(triggerEl, alt);
    if (!resolvedSrc || !modal || !modalImage) return;

    lastActive = document.activeElement;
    const token = ++imageLoadToken;

    modalImage.alt = resolvedAlt || 'Image preview';

    if (modalCaption) {
      if (resolvedAlt) {
        modalCaption.textContent = resolvedAlt;
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
    els.forEach((el) => { el.style.animationPlayState = 'paused'; });
  }

  watchSection('portfolio-deployment', '.deploy-line, .deploy-connector i');
  watchSection('contact', '.contact-status-dot, .contact-eyebrow i');

  const nav = document.getElementById('mainNav');
  const liveDot = nav?.querySelector('.nav-live-dot');
  if (liveDot) {
    const obs = new IntersectionObserver((entries) => {
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
