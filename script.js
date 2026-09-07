/* ===========================
   CMS: next play / venue
   If the JSON is missing or invalid, the HTML fallback stays.
   =========================== */
const CMS_PATH = './content/next-play.json';
const CMS_REQUIRED = ['title', 'playwright', 'date', 'startTime', 'endTime', 'venue', 'address'];

function parseISODate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function isValidTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || '').trim());
  return Boolean(match);
}

function formatClock(hhmm, includePeriod) {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  const clock = `${hour12}:${String(minutes).padStart(2, '0')}`;
  return includePeriod ? `${clock} ${period}` : clock;
}

function formatTimeRange(start, end, separator = '–') {
  const startPeriod = Number(start.slice(0, 2)) >= 12 ? 'PM' : 'AM';
  const endPeriod = Number(end.slice(0, 2)) >= 12 ? 'PM' : 'AM';
  if (startPeriod === endPeriod) {
    return `${formatClock(start, false)}${separator}${formatClock(end, true)}`;
  }
  return `${formatClock(start, true)}${separator}${formatClock(end, true)}`;
}

function cadenceShort(cadence) {
  return String(cadence || 'Third Sunday of the month')
    .replace(/\s+of the month\.?$/i, '')
    .trim();
}

function isValidCms(data) {
  if (!data || typeof data !== 'object') return false;
  if (!CMS_REQUIRED.every((key) => typeof data[key] === 'string' && data[key].trim())) return false;
  if (!parseISODate(data.date)) return false;
  if (!isValidTime(data.startTime) || !isValidTime(data.endTime)) return false;
  return true;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function fillBanner(data, bannerDate, dashRange) {
  const banner = document.getElementById('cms-banner');
  if (!banner) return;
  const strongTitle = document.createElement('strong');
  const titleEm = document.createElement('em');
  titleEm.textContent = data.title;
  strongTitle.appendChild(titleEm);
  const strongDate = document.createElement('strong');
  strongDate.textContent = bannerDate;
  banner.replaceChildren(
    'Next reading: ',
    strongTitle,
    ` by ${data.playwright} · `,
    strongDate,
    ` · ${dashRange} at the ${data.venue}.`
  );
}

function applyCmsContent(data) {
  const date = parseISODate(data.date);
  const cadence = (data.cadence || 'Third Sunday of the month').trim();
  const dashRange = formatTimeRange(data.startTime, data.endTime, '–');
  const toRange = formatTimeRange(data.startTime, data.endTime, ' to ');
  const longDate = date.toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const bannerDate = date.toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  fillBanner(data, bannerDate, dashRange);
  setText('cms-month', date.toLocaleDateString('en-CA', { month: 'short' }));
  setText('cms-day', String(date.getDate()));
  setText('cms-year', String(date.getFullYear()));
  setText('cms-tag', `${cadenceShort(cadence)} · ${dashRange}`);

  const titleEl = document.getElementById('cms-title');
  if (titleEl) {
    const em = document.createElement('em');
    em.textContent = data.title;
    titleEl.replaceChildren(em);
  }

  setText('cms-playwright', data.playwright);
  setText('cms-blurb', data.blurb?.trim() || '');
  setText('cms-when', `${longDate} · ${toRange}`);
  setText('cms-directions', data.directions?.trim() || '');
  setText('cms-pub', `We meet at the ${data.venue}, ${data.address}. Good pints and great plays go hand in hand.`);
  setText('cms-arrive', `${cadence}, ${toRange}. Grab your drink, say hello, and claim a seat around the reading table.`);
  setText('cms-join-cadence', `✓ ${cadenceShort(cadence)} each month, no ongoing commitment`);

  const maps = document.getElementById('cms-maps');
  if (maps) {
    maps.textContent = `${data.venue}, ${data.address}`;
    maps.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.address)}`;
  }
}

fetch(CMS_PATH)
  .then((res) => {
    if (!res.ok) throw new Error(`CMS file not found (${res.status})`);
    return res.json();
  })
  .then((data) => {
    if (!isValidCms(data)) {
      console.warn('CMS file is missing required fields or has an invalid date/time. HTML fallback is in use.');
      return;
    }
    applyCmsContent(data);
  })
  .catch((err) => {
    console.warn('Could not load CMS file. HTML fallback is in use.', err);
  });

/* ===========================
   NAVIGATION
   =========================== */
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen);
});

// Close menu when a link is clicked
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', false);
  });
});

// Highlight active section in nav
const sections = document.querySelectorAll('section[id], div[id]');
const navItems = document.querySelectorAll('.nav-links a[href^="#"]');

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      navItems.forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === `#${id}`);
      });
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => observer.observe(s));

/* ===========================
   SCROLL-IN ANIMATIONS
   =========================== */
const revealElements = document.querySelectorAll(
  '.section-eyebrow, .section-heading, .step, .play-card, .event-card, .feature-list li, .join-perks li, .stat'
);

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

// Add base hidden style via JS (avoids FOUC if JS disabled)
revealElements.forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(22px)';
  el.style.transition = `opacity 0.55s ease ${i * 0.04}s, transform 0.55s ease ${i * 0.04}s`;
  revealObserver.observe(el);
});

document.addEventListener('DOMContentLoaded', () => {
  // Re-observe after DOM is settled
  revealElements.forEach(el => revealObserver.observe(el));
});

// Inject .revealed styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `.revealed { opacity: 1 !important; transform: translateY(0) !important; }`;
document.head.appendChild(styleSheet);

/* ===========================
   JOIN FORM
   =========================== */
const form        = document.getElementById('joinForm');
const formSuccess = document.getElementById('formSuccess');

if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name  = document.getElementById('name');
    const email = document.getElementById('email');
    const error = document.getElementById('formError');
    let valid = true;

    [name, email].forEach(field => {
      field.style.borderColor = '';
      field.style.boxShadow   = '';
    });
    if (error) error.hidden = true;

    if (!name.value.trim()) {
      shake(name);
      valid = false;
    }
    if (!isValidEmail(email.value)) {
      shake(email);
      valid = false;
    }

    if (!valid) return;

    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = 'Sending…';
    btn.disabled = true;

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString(),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Form error ${res.status}`);
        form.hidden = true;
        formSuccess.hidden = false;
        formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
      })
      .catch(() => {
        btn.textContent = 'Send My Interest';
        btn.disabled = false;
        if (error) error.hidden = false;
      });
  });
}

function isValidEmail(val) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

function shake(el) {
  el.style.borderColor = '#c0392b';
  el.style.boxShadow   = '0 0 0 3px rgba(192,57,43,.18)';
  el.animate([
    { transform: 'translateX(0)' },
    { transform: 'translateX(-6px)' },
    { transform: 'translateX(6px)' },
    { transform: 'translateX(-4px)' },
    { transform: 'translateX(4px)' },
    { transform: 'translateX(0)' },
  ], { duration: 350, easing: 'ease-in-out' });
}

/* ===========================
   SMOOTH ANCHOR OFFSET
   (compensate for fixed header)
   =========================== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const headerH = document.querySelector('.site-header').offsetHeight;
    const y = target.getBoundingClientRect().top + window.scrollY - headerH - 16;
    window.scrollTo({ top: y, behavior: 'smooth' });
  });
});

/* ===========================
   HEADER SHADOW ON SCROLL
   =========================== */
const header = document.querySelector('.site-header');
window.addEventListener('scroll', () => {
  header.style.boxShadow = window.scrollY > 10
    ? '0 2px 20px rgba(0,0,0,.35)'
    : 'none';
}, { passive: true });
