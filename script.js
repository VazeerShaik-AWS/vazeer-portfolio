/* ================================
   PORTFOLIO JAVASCRIPT
   Production interactions and smooth animation helpers
   ================================ */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function toggleProjectDetails(button) {
  const card = button.closest('.additional-project-card');
  if (!card || card.classList.contains('is-toggling')) return;

  const shouldExpand = !card.classList.contains('expanded');
  card.classList.add('is-toggling');
  button.disabled = true;

  requestAnimationFrame(() => {
    card.classList.toggle('expanded', shouldExpand);
    button.textContent = shouldExpand ? 'Hide Details' : 'View Details';
    button.setAttribute('aria-expanded', String(shouldExpand));

    window.setTimeout(() => {
      card.classList.remove('is-toggling');
      button.disabled = false;
    }, prefersReducedMotion ? 0 : 260);
  });
}

window.toggleProjectDetails = toggleProjectDetails;

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.toggle('reduced-motion', prefersReducedMotion);

  const navLinks = Array.from(document.querySelectorAll('.nav-links a'));
  const sections = Array.from(document.querySelectorAll('section[id]'));

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start'
      });
    });
  });

  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.style.willChange = 'opacity, transform';
        entry.target.classList.add('animate-in');
        entry.target.addEventListener('transitionend', () => {
          entry.target.style.willChange = '';
        }, { once: true });
        revealObserver.unobserve(entry.target);
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -60px 0px'
    });

    const revealElements = document.querySelectorAll('[data-animate], .section-title, .badge-item, .achievement-card, .featured-project-card, .additional-project-card, .skill-card');
    revealElements.forEach((element, index) => {
      element.dataset.animate = 'scroll';
      element.style.transitionDelay = `${Math.min(index % 4, 3) * 65}ms`;
      revealObserver.observe(element);
    });
  } else {
    document.querySelectorAll('[data-animate]').forEach((element) => element.classList.add('animate-in'));
  }

  if ('IntersectionObserver' in window && navLinks.length) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        navLinks.forEach((link) => {
          const isActive = link.getAttribute('href') === `#${id}`;
          link.classList.toggle('is-active', isActive);
          link.style.color = isActive ? '#ff6ec7' : '#e0e0e0';
        });
      });
    }, {
      threshold: 0.32,
      rootMargin: '-18% 0px -58% 0px'
    });

    sections.forEach((section) => navObserver.observe(section));
  }

  document.querySelectorAll('.view-details-btn').forEach((button) => {
    button.setAttribute('aria-expanded', 'false');
  });

  document.querySelectorAll('.view-details-btn, .github-link, .additional-github-link, .architecture-github-button').forEach((button) => {
    button.addEventListener('click', (event) => {
      if (prefersReducedMotion || event.clientX === 0 || event.clientY === 0) return;

      window.requestAnimationFrame(() => {
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = `${size}px`;
        ripple.style.height = `${size}px`;
        ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
        ripple.className = 'ripple';

        button.appendChild(ripple);
        window.setTimeout(() => ripple.remove(), 520);
      });
    });
  });

  const modal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');
  const closeBtn = document.querySelector('.modal-close');
  let lastActive = null;

  function openModal(src, alt) {
    if (!modal || !modalImage || !closeBtn || !src) return;
    lastActive = document.activeElement;
    modalImage.src = src;
    modalImage.alt = alt || 'Architecture preview';
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastActive && typeof lastActive.focus === 'function') lastActive.focus();
  }

  document.querySelectorAll('.clickable-image').forEach((imageTrigger) => {
    imageTrigger.setAttribute('role', 'button');
    imageTrigger.setAttribute('tabindex', '0');
    imageTrigger.addEventListener('click', () => openModal(imageTrigger.dataset.image, imageTrigger.dataset.alt));
    imageTrigger.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openModal(imageTrigger.dataset.image, imageTrigger.dataset.alt);
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal || event.target.classList.contains('modal-overlay')) closeModal();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (!modal || modal.style.display !== 'flex') return;
    if (event.key === 'Escape') closeModal();
    if (event.key === 'Tab' && closeBtn) {
      event.preventDefault();
      closeBtn.focus();
    }
  });

  const logoBtn = document.getElementById('logo-aws-btn');
  if (logoBtn) {
    logoBtn.addEventListener('click', () => {
      const hero = document.querySelector('.hero');
      if (hero) hero.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
  }
});