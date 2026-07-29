// Home-page-only script — only load this on the homepage, not on other pages.

// --- FAQ accordion ---
document.querySelectorAll('.kk-faq-item').forEach((item) => {
  item.querySelector('.kk-faq-q').addEventListener('click', () => {
    item.classList.toggle('active');
  });
});
