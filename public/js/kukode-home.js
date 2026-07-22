// Home-page-only script — only load this on the homepage, not on other pages.

// --- Testimonial slider ---
new Swiper('.kk-testi-swiper', {
  slidesPerView: 1,
  spaceBetween: 20,
  autoplay: { delay: 4000, disableOnInteraction: false },
  pagination: { el: '.swiper-pagination', clickable: true },
  breakpoints: {
    576: { slidesPerView: 2 },
    992: { slidesPerView: 4 },
  },
});

// --- FAQ accordion ---
document.querySelectorAll('.kk-faq-item').forEach((item) => {
  item.querySelector('.kk-faq-q').addEventListener('click', () => {
    item.classList.toggle('active');
  });
});
