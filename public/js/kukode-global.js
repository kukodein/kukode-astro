// Global script — runs on every page (navbar + theme toggle live in the shared header/footer).

// --- Navbar scroll behavior ---
const kkNavWrap = document.querySelector('.kk-navbar-wrap');
const mainNav = document.getElementById('mainNav');
let lastScrollY = window.scrollY;
let menuTransitioning = false;

// Bekukan logika scroll saat menu mobile sedang buka/tutup
mainNav.addEventListener('show.bs.collapse', () => { menuTransitioning = true; });
mainNav.addEventListener('hide.bs.collapse', () => { menuTransitioning = true; });
mainNav.addEventListener('shown.bs.collapse', () => {
  menuTransitioning = false;
  lastScrollY = window.scrollY; // sync ulang biar tidak ada delta palsu
});
mainNav.addEventListener('hidden.bs.collapse', () => {
  menuTransitioning = false;
  lastScrollY = window.scrollY;
});

window.addEventListener('scroll', () => {
  if (menuTransitioning) return; // abaikan scroll event akibat animasi collapse

  const currentScrollY = window.scrollY;
  if (currentScrollY <= 0) {
    kkNavWrap.classList.remove('kk-scrolled');
  } else if (currentScrollY > lastScrollY) {
    kkNavWrap.classList.add('kk-scrolled');
  } else if (currentScrollY < lastScrollY) {
    kkNavWrap.classList.remove('kk-scrolled');
  }
  lastScrollY = currentScrollY;
}, { passive: true });

// --- Dark mode toggle (desktop + mobile buttons, both in the shared header) ---
const themeToggle = document.getElementById('themeToggle');
const htmlEl = document.documentElement;
const savedTheme = localStorage.getItem('kk-theme') || 'light';
htmlEl.setAttribute('data-bs-theme', savedTheme);

themeToggle.addEventListener('click', () => {
  const current = htmlEl.getAttribute('data-bs-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  htmlEl.setAttribute('data-bs-theme', next);
  localStorage.setItem('kk-theme', next);
});

const themeToggleMobile = document.getElementById('themeToggleMobile');
themeToggleMobile.addEventListener('click', () => {
  const current = htmlEl.getAttribute('data-bs-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  htmlEl.setAttribute('data-bs-theme', next);
  localStorage.setItem('kk-theme', next);
});
