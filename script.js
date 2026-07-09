/* ================================
   PRODUCTION PORTFOLIO JAVASCRIPT
   Optimized for Performance & UX
   ================================ */

// Scroll layout cache + idle scheduling
let sectionBounds = [];
let scrollDocHeight = 0;
let navOffsetCached = 64;

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
  refreshNavMetrics();
  setupMobileNav(); // before setupNavigation so mobileMenu API is ready
  setupNavigation();
  setupModals();
  setupAnimationPausing();
  setupRipples();
  setupImageLayoutRefresh();
  setupFastTouch();
  setupScrollPerf();

  window.addEventListener('load', () => {
    refreshNavMetrics();
    cacheScrollLayout(document.querySelectorAll('section[id]'));
    navSpyApi?.refreshSpy?.();
    mobileMenu?.updateMobileMenuAnchor?.();
  }, { once: true });

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

// ===== SMOOTH NAVIGATION WITH ACTIVE STATE =====
function getNavOffset() {
  return navOffsetCached;
}

function resolveSection(target) {
  if (!target) return null;
  if (target.matches?.('section[id]')) return target;
  return target.closest?.('section[id]') || target;
}

function getScrollGap() {
  return isMobileNavLayout() ? 32 : 56;
}

function getSectionFocusAnchor(section) {
  if (!section) return null;
  return (
    section.querySelector('.section-header .section-title') ||
    section.querySelector('.section-header') ||
    section
  );
}

function refreshNavMetrics() {
  const nav = document.getElementById('mainNav');
  const inner = nav?.querySelector('.nav-inner');
  const rect = (inner || nav)?.getBoundingClientRect();
  navOffsetCached = rect?.bottom ?? (isMobileNavLayout() ? 70 : 64);

  const clearance = Math.round(navOffsetCached + getScrollGap());
  document.documentElement.style.setProperty('--scroll-clearance', `${clearance}px`);
}

function getNavScrollClearance() {
  return navOffsetCached + getScrollGap();
}

function cacheScrollLayout(sections) {
  refreshNavMetrics();
  scrollDocHeight = document.documentElement.scrollHeight;
  if (!sections) return;
  const scrollY = window.scrollY;
  sectionBounds = Array.from(sections).map((section) => {
    const top = section.getBoundingClientRect().top + scrollY;
    return {
      id: section.id,
      top,
      bottom: top + section.offsetHeight,
    };
  });
}

function getSectionScrollTop(target) {
  const section = resolveSection(target);
  if (!section || section.id === 'top') return 0;

  refreshNavMetrics();

  const clearance = getNavScrollClearance();
  const scrollY = window.scrollY;
  const anchor = getSectionFocusAnchor(section);
  const anchorTop = anchor.getBoundingClientRect().top + scrollY;

  // Section title always lands with premium breathing room below nav — never flush
  const top = anchorTop - clearance;

  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return Math.min(Math.max(0, top), maxScroll);
}

function easeApplePremium(t) {
  return 1 - Math.pow(1 - t, 3);
}

function getScrollDuration(delta) {
  const distance = Math.abs(delta);
  const mobile = isMobileNavLayout();

  if (distance < 100) return mobile ? 340 : 360;
  if (distance < 240) return mobile ? 420 : 440;

  const min = mobile ? 440 : 500;
  const max = mobile ? 980 : 1060;
  const rate = mobile ? 0.6 : 0.66;

  return Math.min(max, Math.max(min, distance * rate));
}

function scrollWindowTo(y) {
  window.scrollTo({ top: y, left: 0, behavior: 'auto' });
}

function runProgrammaticScroll(targetY, options = {}) {
  const { preserveNavBubble = false } = options;
  if (navScrollAnimating && smoothScrollCancel) smoothScrollCancel();

  const reduced = document.documentElement.classList.contains('reduced-motion');
  const clampedY = Math.max(0, targetY);
  lockNavSpyDuringScroll();
  navScrollAnimating = true;
  document.documentElement.classList.add('is-scrolling');
  if (!preserveNavBubble) navIndicatorApi?.stopAnim?.();

  if (reduced || Math.abs(window.scrollY - clampedY) < 2) {
    scrollWindowTo(clampedY);
    requestAnimationFrame(finishProgrammaticScroll);
    return;
  }

  smoothScrollToExact(clampedY).then(finishProgrammaticScroll);
}

function getCurrentSectionFromCache() {
  const scrollY = window.scrollY;
  if (scrollY < 90) return 'top';

  const marker = scrollY + getNavScrollClearance() + 8;
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
let navScrollAnimating = false;
let smoothScrollCancel = null;


function smoothScrollToExact(targetY) {
  if (smoothScrollCancel) smoothScrollCancel();

  const startY = window.scrollY;
  const delta = targetY - startY;
  if (Math.abs(delta) < 1) return Promise.resolve();

  const duration = getScrollDuration(delta);
  let cancelled = false;
  let rafId = 0;

  smoothScrollCancel = () => {
    cancelled = true;
    if (rafId) cancelAnimationFrame(rafId);
    smoothScrollCancel = null;
  };

  return new Promise((resolve) => {
    const startTime = performance.now();

    function frame(now) {
      if (cancelled) {
        resolve();
        return;
      }

      const progress = Math.min((now - startTime) / duration, 1);
      const eased = easeApplePremium(progress);
      scrollWindowTo(startY + delta * eased);

      if (progress < 1) {
        rafId = requestAnimationFrame(frame);
        return;
      }

      scrollWindowTo(targetY);
      smoothScrollCancel = null;
      resolve();
    }

    rafId = requestAnimationFrame(frame);
  });
}

function finishProgrammaticScroll() {
  navScrollAnimating = false;
  cacheScrollLayout(document.querySelectorAll('section[id]'));
  navSpyApi?.sync?.(true);
  navIndicatorApi?.commitToActive?.(canSpringNavIndicator());
  clearNavScrollLock();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!navScrollAnimating) {
        document.documentElement.classList.remove('is-scrolling');
      }
    });
  });
}

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
  const lockMs = isMobileNavLayout() ? 1120 : 1180;
  navClickLockUntil = Date.now() + lockMs;
  if (navScrollUnlockTimer) clearTimeout(navScrollUnlockTimer);
  if (!('onscrollend' in window)) {
    navScrollUnlockTimer = setTimeout(clearNavScrollLock, lockMs - 40);
  }
}

function scrollToY(targetY, options = {}) {
  runProgrammaticScroll(targetY, options);
}

function scrollToSection(target, options = {}) {
  if (!target) return;
  refreshNavMetrics();
  runProgrammaticScroll(getSectionScrollTop(target), options);
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
    indicator.classList.remove('is-springing', 'is-sliding');
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
    const containerRect = navLinksContainer.getBoundingClientRect();
    navLinks.forEach((link) => {
      const linkRect = link.getBoundingClientRect();
      metricsCache.set(link, {
        x: linkRect.left - containerRect.left,
        y: linkRect.top - containerRect.top,
        w: linkRect.width,
        h: linkRect.height,
      });
    });
  }

  function getMetrics(link) {
    if (metricsCache.has(link)) return metricsCache.get(link);
    const containerRect = navLinksContainer.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const m = {
      x: linkRect.left - containerRect.left,
      y: linkRect.top - containerRect.top,
      w: linkRect.width,
      h: linkRect.height,
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
      indicator.classList.remove('is-sliding');
      freezeToVisualPosition();
      hide();
      return;
    }

    refreshMetrics();
    const { x, y, w, h } = getMetrics(link);
    const isFirstShow = !indicatorVisible;
    const desktopSpring = !isMobileNavLayout() && !instant && canSpring();
    const useInstant = instant || !canSpring() || (isFirstShow && isMobileNavLayout());

    clearSpringEnd();
    indicator.classList.toggle('is-sliding', desktopSpring);

    if (useInstant) {
      indicator.classList.add('is-instant');
      applyMetrics(x, y, w, h);
      show();
      void indicator.offsetHeight;
      indicator.classList.remove('is-instant', 'is-sliding');
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
  let spyObs = null;

  function getSpyRootMargin() {
    refreshNavMetrics();
    const clearance = Math.round(getNavScrollClearance());
    return `${-clearance}px 0px -42% 0px`;
  }

  function attachSpyObserver() {
    if (spyObs) {
      sectionList.forEach((section) => spyObs.unobserve(section));
      spyObs.disconnect();
      sectionRatios.clear();
    }

    spyObs = new IntersectionObserver(
      (entries) => {
        if (document.documentElement.classList.contains('is-scrolling')) return;
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
        rootMargin: getSpyRootMargin(),
        threshold: [0, 0.4, 0.65],
      }
    );

    sectionList.forEach((section) => spyObs.observe(section));
  }

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
      if (
        !fromScrollEnd &&
        document.documentElement.classList.contains('is-scrolling')
      ) {
        return;
      }
      if (navSpyPaused && !fromScrollEnd) return;
      if (!fromScrollEnd && Date.now() < navClickLockUntil) return;

      const current = pickSection();
      if (!fromScrollEnd && current === lastNavSection) return;
      if (current === 'top') {
        if (lastNavSection !== 'top') {
          setHomeNav({ moveIndicator: true });
        }
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

      if (current !== lastNavSection) {
        setActiveSection(current, {
          animate: fromScrollEnd && canSpringNavIndicator(),
          moveIndicator: fromScrollEnd,
        });
      } else if (fromScrollEnd && current && current !== 'top') {
        indicatorApi?.refreshMetrics?.();
        indicatorApi?.commitToActive?.(canSpringNavIndicator());
      }
    });
  }

  const hero = document.getElementById('top');
  if (hero && mainNav) {
    const heroObs = new IntersectionObserver(
      ([entry]) => {
        /* Keep scrolled class for semantics only — nav appearance is identical (no color shift) */
        mainNav.classList.toggle('scrolled', !entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '0px 0px 0px 0px' }
    );
    heroObs.observe(hero);
  }

  attachSpyObserver();

  let scrollEndTimer = null;

  function finishScroll() {
    if (navScrollAnimating) return;

    requestAnimationFrame(() => {
      document.documentElement.classList.remove('is-scrolling');
      if (Date.now() >= navClickLockUntil) {
        navSpyPaused = false;
      }

      const finalize = () => {
        cacheScrollLayout(sections);
        syncNav(true);
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(finalize, { timeout: 120 });
      } else {
        requestAnimationFrame(finalize);
      }
    });
  }

  function onScrollActivity() {
    if (!navScrollAnimating) {
      document.documentElement.classList.add('is-scrolling');
      navIndicatorApi?.stopAnim?.();
      if (Date.now() >= navClickLockUntil) {
        navSpyPaused = true;
      }
    }
    clearTimeout(scrollEndTimer);
    scrollEndTimer = setTimeout(finishScroll, isMobileNavLayout() ? 110 : 95);
  }

  window.addEventListener('scroll', onScrollActivity, { passive: true });

  if ('onscrollend' in window) {
    window.addEventListener(
      'scrollend',
      () => {
        clearTimeout(scrollEndTimer);
        finishScroll();
      },
      { passive: true }
    );
  }

  window.addEventListener(
    'resize',
    () => {
      cacheScrollLayout(sections);
      attachSpyObserver();
      syncNav(false);
    },
    { passive: true }
  );

  window.addEventListener(
    'orientationchange',
    () => {
      setTimeout(() => {
        cacheScrollLayout(sections);
        attachSpyObserver();
        syncNav(false);
      }, 120);
    },
    { passive: true }
  );

  syncNav(false);
  return { sync: syncNav, refreshSpy: attachSpyObserver };
}

function setupNavigation() {
  const navLinksContainer = document.getElementById('navLinks');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  const sections = document.querySelectorAll('section[id]');
  const indicatorApi = setupNavIndicator(navLinksContainer);
  navIndicatorApi = indicatorApi;

  function setHomeNav(options = {}) {
    const { moveIndicator = true } = options;
    navLinks.forEach((link) => link.classList.remove('active'));
    lastNavSection = 'top';
    if (moveIndicator) indicatorApi?.moveTo(null);
  }

  function setActiveSection(sectionId, options = {}) {
    const { animate = false, moveIndicator = true } = options;

    if (sectionId === 'top') {
      setHomeNav({ moveIndicator: options.moveIndicator !== false });
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

  function isDesktopNavClick() {
    return !isMobileNavLayout() && !mobileMenu?.isOpen?.();
  }

  function handleDesktopNavClick(sectionId, target) {
    userNavTarget = sectionId;
    navIndicatorApi?.refreshMetrics?.();

    const isCta = sectionId === 'contact';
    const shouldAnimateBubble = !isCta && canSpringNavIndicator();

    setActiveSection(sectionId, {
      animate: shouldAnimateBubble,
      moveIndicator: true,
    });

    refreshNavMetrics();

    const scrollOpts = { preserveNavBubble: shouldAnimateBubble };
    if (sectionId === 'top') scrollToY(0, scrollOpts);
    else scrollToSection(target, scrollOpts);
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
  navSpyApi?.refreshSpy?.();

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      document.documentElement.classList.add('fonts-ready');
      cacheScrollLayout(sections);
      navSpyApi?.refreshSpy?.();
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
        if (mobileMenu?.isOpen()) {
          userNavTarget = sectionId;
          navIndicatorApi?.stopAnim?.();
          navIndicatorApi?.refreshMetrics?.();
          setActiveSection(sectionId, {
            animate: false,
            moveIndicator: true,
          });
          mobileMenu.navigateTo(target);
          return;
        }

        if (isDesktopNavClick()) {
          handleDesktopNavClick(sectionId, target);
          return;
        }

        userNavTarget = sectionId;
        navIndicatorApi?.stopAnim?.();
        navIndicatorApi?.refreshMetrics?.();
        setActiveSection(sectionId, {
          animate: false,
          moveIndicator: true,
        });
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
      mobileMenu?.closeMenu?.();
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

  function updateMobileMenuAnchor() {
    if (!isMobileNavLayout()) return;
    const inner = mainNav?.querySelector('.nav-inner');
    const rect = inner?.getBoundingClientRect();
    if (!rect) return;
    const menuTop = Math.round(rect.bottom + 8);
    root.style.setProperty('--nav-menu-top', `${menuTop}px`);
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
    links.style.willChange = '';
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

  function runAfterMenuClose(wasOpen, callback) {
    if (!isMobileNavLayout() || !wasOpen) {
      requestAnimationFrame(() => requestAnimationFrame(callback));
      return;
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      links.removeEventListener('transitionend', onTransitionEnd);
      callback();
    };

    const onTransitionEnd = (e) => {
      if (e.target !== links) return;
      if (e.propertyName === 'opacity' || e.propertyName === 'transform') finish();
    };

    links.addEventListener('transitionend', onTransitionEnd);
    setTimeout(finish, 420);
  }

  function navigateTo(targetEl) {
    const wasOpen = isOpen();
    if (wasOpen) closeMenu();

    runAfterMenuClose(wasOpen, () => {
      refreshNavMetrics();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const sectionId = targetEl?.getAttribute?.('id') || null;
          if (sectionId === 'top') {
            scrollToY(0);
            return;
          }
          if (targetEl) scrollToSection(targetEl);
        });
      });
    });
  }

  function openMenu() {
    if (!isMobileNavLayout()) return;
    updateMobileMenuAnchor();
    lockBody();
    links.style.willChange = 'transform, opacity';
    links.classList.add('is-open');
    overlay?.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    const icon = toggle.querySelector('i');
    if (icon) icon.className = 'fas fa-times';
    requestAnimationFrame(() => {
      updateMobileMenuAnchor();
      navIndicatorApi?.refreshMetrics?.();
      navIndicatorApi?.reposition(true);
      requestAnimationFrame(() => {
        navIndicatorApi?.refreshMetrics?.();
        navIndicatorApi?.reposition(!canSpringNavIndicator());
      });
      setTimeout(() => {
        navIndicatorApi?.refreshMetrics?.();
        navIndicatorApi?.reposition(!canSpringNavIndicator());
        links.style.willChange = '';
      }, 400);
    });
  }

  mobileMenu = { isOpen, navigateTo, closeMenu, updateMobileMenuAnchor };

  if (isMobileNavLayout()) {
    links.setAttribute('aria-hidden', 'true');
    updateMobileMenuAnchor();
  } else {
    links.classList.remove('is-open');
    overlay?.classList.remove('is-open');
    root.classList.remove('menu-open');
    mainNav?.classList.remove('menu-is-open');
    links.removeAttribute('aria-hidden');
  }

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isOpen() ? closeMenu() : openMenu();
  });

  overlay?.addEventListener('click', closeMenu);

  mainNav?.querySelector('.nav-live-badge')?.addEventListener('click', () => {
    if (isOpen()) closeMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) closeMenu();
  });

  window.addEventListener('resize', () => {
    updateMobileMenuAnchor();
    if (window.innerWidth > 768) {
      closeMenu();
      links.removeAttribute('aria-hidden');
    } else if (!isOpen()) {
      links.setAttribute('aria-hidden', 'true');
    }
  }, { passive: true });

  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      updateMobileMenuAnchor();
      closeMenu();
    }, 100);
  }, { passive: true });
}

// ===== IMAGE MODAL WITH ACCESSIBILITY =====
function setupModals() {
  const modal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');
  const modalCaption = document.getElementById('modalCaption');
  const closeBtn = modal?.querySelector('.modal-close');
  let lastActive = null;
  let imageLoadToken = 0;

  function resolveImageSrc(triggerEl, preferredSrc) {
    if (preferredSrc) return preferredSrc;
    if (!triggerEl) return '';
    const img = triggerEl.querySelector('img');
    if (img) {
      const resolved = img.currentSrc || img.getAttribute('src');
      if (resolved) return resolved;
    }
    return '';
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

// Recalculate scroll anchors after images paint (prevents nav/section drift on mobile)
function setupImageLayoutRefresh() {
  const sections = document.querySelectorAll('section[id]');
  let refreshRaf = null;
  let refreshTimer = null;

  function refresh() {
    if (refreshRaf) cancelAnimationFrame(refreshRaf);
    refreshRaf = requestAnimationFrame(() => {
      refreshRaf = null;
      cacheScrollLayout(sections);
      navSpyApi?.refreshSpy?.();
    });
  }

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, 120);
  }

  document.querySelectorAll('img[src^="assets/images/"]').forEach((img) => {
    if (img.complete) return;
    img.addEventListener('load', scheduleRefresh, { once: true });
  });

  window.addEventListener('load', refresh, { once: true });
  window.addEventListener('orientationchange', () => {
    setTimeout(refresh, 180);
  }, { passive: true });
}

// Touch targets — project diagrams must not block vertical scroll
function setupScrollPerf() {
  document.querySelectorAll('.featured-project-image.clickable-image').forEach((el) => {
    el.style.touchAction = 'pan-y';
  });
}

// Instant tap feedback on mobile — no ripple delay, links open immediately
function setupFastTouch() {
  if (window.matchMedia('(hover: hover)').matches) return;

  document.querySelectorAll(
    'a[href^="http"], a[href^="mailto:"], a[href$=".pdf"], .github-link, .additional-github-link, .verify-link, .hero-verify-credly, .cta-nav, .contact-buttons a, .contact-info-row'
  ).forEach((el) => {
    el.style.touchAction = 'manipulation';
  });
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
  if (document.documentElement.classList.contains('reduced-motion')) return;
  if (!window.matchMedia('(hover: hover)').matches) return;

  document.querySelectorAll(
    '.contact-buttons a, .verify-link, .hero-verify-credly, .cta-nav, .github-link, .additional-github-link'
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
