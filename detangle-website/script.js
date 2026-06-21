// ═══════════════════════════════════════════════════════════════════════
// DETANGLE — Scroll Animations & Interactions
// ═══════════════════════════════════════════════════════════════════════

// ── Scroll Reveal ────────────────────────────────────────────────────
const revealElements = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -80px 0px' }
);

revealElements.forEach((el) => revealObserver.observe(el));

// ── Header scroll effect ─────────────────────────────────────────────
const header = document.querySelector('.header');

window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

// ── Flow line draw on scroll ─────────────────────────────────────────
const flowPath = document.querySelector('.flow-path');

if (flowPath) {
  const pathLength = flowPath.getTotalLength();
  flowPath.style.strokeDasharray = pathLength;
  flowPath.style.strokeDashoffset = pathLength;

  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = scrollTop / docHeight;

    const offset = pathLength * (1 - scrollPercent);
    flowPath.style.strokeDashoffset = Math.max(0, offset);
  });
}

// // ── Brain SVG draw-on animation ──────────────────────────────────────
// const brainPath = document.getElementById('brainPath');

// if (brainPath) {
//   const totalLen = brainPath.getTotalLength();
//   const LOAD_FRACTION = 0.6; // how much draws on page load

//   // Set up dash
//   brainPath.style.strokeDasharray = totalLen;
//   brainPath.style.strokeDashoffset = totalLen;
//   brainPath.style.transition = 'none';

//   // Draw first 60% on load with smooth animation
//   requestAnimationFrame(() => {
//     brainPath.style.transition = 'stroke-dashoffset 2s cubic-bezier(0.22,1,0.36,1) 0.3s';
//     brainPath.style.strokeDashoffset = totalLen * (1 - LOAD_FRACTION);
//   });

//   // Complete the remaining 40% tied to scroll progress
//   window.addEventListener('scroll', () => {
//     const scrollTop = window.pageYOffset;
//     const docHeight = document.documentElement.scrollHeight - window.innerHeight;
//     const scrollFraction = Math.min(scrollTop / docHeight, 1);

//     const drawn = LOAD_FRACTION + scrollFraction * (1 - LOAD_FRACTION);
//     brainPath.style.transition = 'none';
//     brainPath.style.strokeDashoffset = totalLen * (1 - Math.min(drawn, 1));
//   }, { passive: true });
// }

// ── Brain draw-on-load animation ─────────────────────────────────────
const brainPath = document.getElementById('brainPath');
if (brainPath) {
  const totalLen = brainPath.getTotalLength();

  // Page-load: draw first 60% immediately
  const loadFraction = 0.6;
  brainPath.style.strokeDasharray = totalLen;
  brainPath.style.strokeDashoffset = totalLen;
  brainPath.style.transition = 'none';

  requestAnimationFrame(() => {
    brainPath.style.transition = 'stroke-dashoffset 2s cubic-bezier(0.22,1,0.36,1) 0.3s';
    brainPath.style.strokeDashoffset = totalLen * (1 - loadFraction);
  });

  // Scroll: finish drawing the remaining 40% as user scrolls
  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    const scrollFraction = Math.min(scrolled / maxScroll, 1);

    // From 60% drawn at load → 100% drawn at scroll bottom
    const drawn = loadFraction + scrollFraction * (1 - loadFraction);
    const offset = totalLen * (1 - Math.min(drawn, 1));

    brainPath.style.transition = 'none';
    brainPath.style.strokeDashoffset = offset;
  }, { passive: true });
}

// ── Position flow line to start from brain center ────────────────────
const flowLine = document.querySelector('.flow-line');
const brainContainer = document.querySelector('.brain-container');

function positionFlowLine() {
  if (!flowLine || !brainContainer) return;
  const rect = brainContainer.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  flowLine.style.left = centerX + 'px';
  flowLine.style.transform = 'translateX(-50%)';
}

positionFlowLine();
window.addEventListener('resize', positionFlowLine);

// ── Smooth parallax on mood emojis ───────────────────────────────────
const moods = document.querySelectorAll('.mf');

document.addEventListener('mousemove', (e) => {
  const cx = (e.clientX / window.innerWidth - 0.5) * 2;
  const cy = (e.clientY / window.innerHeight - 0.5) * 2;

  moods.forEach((m, i) => {
    const depth = (i + 1) * 5;
    m.style.transform = `translate(${cx * depth}px, ${cy * depth}px)`;
  });
});

// ── Counter animation for stats ──────────────────────────────────────
function animateValue(el, start, end, duration) {
  const range = end - start;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(start + range * eased) + (end >= 100 ? '+' : '');
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

const heroStrong = document.querySelectorAll('.hero-users strong');
const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !entry.target.dataset.animated) {
        entry.target.dataset.animated = 'true';
        const val = parseInt(entry.target.textContent);
        if (!isNaN(val)) animateValue(entry.target, 0, val, 2000);
      }
    });
  },
  { threshold: 0.5 }
);
heroStrong.forEach((el) => counterObserver.observe(el));