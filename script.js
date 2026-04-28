/* ================================
   PORTFOLIO JAVASCRIPT - OPTIMIZED FOR LIGHTHOUSE 95-100
   Premium Interactivity & Animations
   ================================ */

// Performance: Debounce scroll events
let scrollTimeout;
const debounceScroll = (callback) => {
  if (scrollTimeout) return;
  scrollTimeout = requestAnimationFrame(() => {
    callback();
    scrollTimeout = null;
  });
};

// ===== PREMIUM SCROLL ANIMATIONS =====
const observerOptions = {
  threshold: 0.08,
  rootMargin: '0px 0px -60px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, index) => {
    if (entry.isIntersecting) {
      const delay = index * 0.08;
      entry.target.style.animation = `slideInUp 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s forwards`;
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observe elements for smooth scroll animations (reduced set for better performance)
document.querySelectorAll('.skill-card, .badge-item, .achievement-card, .expertise-badge, .award-card').forEach(el => {
  observer.observe(el);
});

// ===== SMOOTH NAVIGATION SCROLLING - OPTIMIZED =====
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (href !== '#' && document.querySelector(href)) {
      e.preventDefault();
      document.querySelector(href).scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// ===== ACTIVE NAVIGATION WITH SMOOTH INDICATOR - OPTIMIZED =====
const navLinks = document.querySelectorAll('.nav-links a');
let lastScrollY = window.scrollY;

window.addEventListener('scroll', () => {
  debounceScroll(() => {
    let current = '';
    document.querySelectorAll('section').forEach(section => {
      const sectionTop = section.offsetTop;
      if (window.scrollY >= sectionTop - 250) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      if (link.getAttribute('href').slice(1) === current) {
        link.style.color = '#ff6ec7';
      } else {
        link.style.color = '#e0e0e0';
      }
    });
  });
}, { passive: true });

// ===== SMOOTH HOVER EFFECTS FOR INTERACTIVE ITEMS =====
document.querySelectorAll('.expertise-badge, .skill-item').forEach(item => {
  item.addEventListener('mouseenter', function() {
    this.style.transform = 'scale(1.08) translateY(-3px)';
  });
  item.addEventListener('mouseleave', function() {
    this.style.transform = 'scale(1) translateY(0)';
  });
});

// ===== PREMIUM SECTION FADE IN ON SCROLL - OPTIMIZED =====
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      sectionObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.05,
  rootMargin: '0px 0px -50px 0px'
});

document.querySelectorAll('section').forEach(section => {
  if (section.id === 'projects') return;
  section.style.opacity = '0.95';
  section.style.transform = 'translateY(10px)';
  section.style.transition = 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
  sectionObserver.observe(section);
});

// ===== VIEW DETAILS TOGGLE FOR ADDITIONAL PROJECTS =====
function toggleProjectDetails(button) {
  const card = button.closest('.additional-project-card');
  const isExpanded = card.classList.contains('expanded');
  
  if (!isExpanded) {
    card.classList.add('expanded');
    button.textContent = 'Hide Details';
    button.style.transform = 'scale(1.02)';
    
    setTimeout(() => {
      card.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest',
        inline: 'nearest'
      });
    }, 150);
  } else {
    card.classList.remove('expanded');
    button.textContent = 'View Details';
    button.style.transform = 'scale(1)';
  }
}

// ===== ENHANCED CARD GLOW ON SCROLL - ADDITIONAL PROJECTS ONLY =====
const cardGlowObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.target.classList.contains('additional-project-card') && entry.isIntersecting) {
      entry.target.style.animation = 'softGlow 3s ease-in-out infinite';
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('.additional-project-card').forEach(card => {
  cardGlowObserver.observe(card);
});

// ===== STAGGERED ANIMATIONS FOR ADDITIONAL PROJECTS ONLY =====
document.addEventListener('DOMContentLoaded', () => {
  const additionalCards = document.querySelectorAll('.additional-project-card');
  additionalCards.forEach((card, index) => {
    card.style.animation = `slideInUp 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.15}s forwards`;
    card.style.animationFillMode = 'both';
  });
});

// ===== OPTIMIZED RIPPLE EFFECT ON BUTTONS =====
document.querySelectorAll('.view-details-btn, .github-link, .additional-github-link').forEach(button => {
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

// ===== ENHANCED CARD HOVER EFFECTS =====
document.querySelectorAll('.additional-project-card').forEach(card => {
  card.addEventListener('mouseenter', function() {
    this.style.borderColor = 'rgba(255, 110, 199, 0.4)';
  });
  
  card.addEventListener('mouseleave', function() {
    if (!this.classList.contains('expanded')) {
      this.style.borderColor = 'rgba(255, 110, 199, 0.2)';
    }
  });
});

// ===== SMOOTH ZOOM EFFECT ON FEATURED PROJECT IMAGES =====
document.querySelectorAll('.featured-project-card').forEach(card => {
  const image = card.querySelector('.featured-project-image');
  if (image) {
    card.addEventListener('mouseenter', () => {
      image.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
      image.style.transform = 'scale(1.08)';
    });
    
    card.addEventListener('mouseleave', () => {
      image.style.transform = 'scale(1)';
    });
  }
});
