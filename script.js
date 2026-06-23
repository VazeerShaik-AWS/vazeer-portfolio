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
  setupNavigation();
  setupMobileNav();
  setupNavScroll();
  setupModals();
  setupHoverEffects();
  setupProjectToggle();

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
function getNavOffset() {
  const nav = document.getElementById('mainNav');
  return (nav ? nav.offsetHeight : 76) + 16;
}

function smoothScrollTo(target) {
  const top = target.getBoundingClientRect().top + window.pageYOffset - getNavOffset();
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  const sections = document.querySelectorAll('section[id]');

  // Smooth scroll to section
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      const target = href && href !== '#' ? document.querySelector(href) : null;
      if (target) {
        e.preventDefault();
        smoothScrollTo(target);
      }
    });
  });

  // Update active nav link on scroll
  window.addEventListener('scroll', updateActiveNav, { passive: true });

  function updateActiveNav() {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        let current = '';
        
        sections.forEach((section) => {
          const rect = section.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom >= 150) {
            current = section.getAttribute('id');
          }
        });

        navLinks.forEach((link) => {
          const href = link.getAttribute('href').slice(1);
          link.classList.toggle('active', href === current);
        });

        ticking = false;
      });
      ticking = true;
    }
  }
}

// ===== MOBILE NAVIGATION =====
function setupMobileNav() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  const overlay = document.getElementById('navOverlay');

  if (!toggle || !links) return;

  let savedScrollY = 0;

  function closeMenu() {
    links.classList.remove('is-open');
    overlay?.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.querySelector('i').className = 'fas fa-bars';
    // iOS scroll lock restore
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, savedScrollY);
  }

  function openMenu() {
    // iOS scroll lock: freeze body at current position
    savedScrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.width = '100%';
    links.classList.add('is-open');
    overlay?.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.querySelector('i').className = 'fas fa-times';
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (links.classList.contains('is-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  overlay?.addEventListener('click', closeMenu);

  links.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => closeMenu());
  });

  // Close on resize to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeMenu();
  }, { passive: true });

  // Close on orientation change
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

// ===== LAZY LOADING OPTIMIZATION =====
if ('IntersectionObserver' in window) {
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        imageObserver.unobserve(img);
      }
    });
  });

  document.querySelectorAll('img[data-src]').forEach((img) => {
    imageObserver.observe(img);
  });
}

// ===== ACCESSIBILITY: REDUCE MOTION SUPPORT =====
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReducedMotion) {
  document.documentElement.classList.add('reduced-motion');
}

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
      window.pageYOffset; // force reflow-free read
      nativeScrollTo(0, startY + diff * easeInOutCubic(progress));
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  };
})();

// ===== SMOOTH ANCHOR LINKS =====
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (href && href !== '#') {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        smoothScrollTo(target);
      }
    }
  });
});
