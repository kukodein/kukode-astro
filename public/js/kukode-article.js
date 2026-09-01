// Article-detail-page-only script — hanya di-load di halaman detail artikel,
// bukan di halaman lain (sama pola-nya seperti kukode-home.js untuk homepage).
GLightbox({
  selector: '.glightbox',
  touchNavigation: true,
  loop: false,
});

document.addEventListener('DOMContentLoaded', function () {
  var article = document.querySelector('.article-body');
  var tocNav = document.getElementById('kk-toc-nav');
  var tocSidebarCol = tocNav ? tocNav.closest('.col-lg-4') : null;
  if (!article || !tocNav) return;

  var headings = article.querySelectorAll('h2, h3');
  if (!headings.length) {
    if (tocSidebarCol) tocSidebarCol.remove();
    return;
  }

  var usedIds = {};
  function slugify(text) {
    var base = text.toLowerCase().trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-') || 'section';
    var slug = base;
    var i = 1;
    while (usedIds[slug]) {
      i += 1;
      slug = base + '-' + i;
    }
    usedIds[slug] = true;
    return slug;
  }

  headings.forEach(function (heading) {
    if (heading.id) {
      usedIds[heading.id] = true;
    } else {
      heading.id = slugify(heading.textContent);
    }
    var link = document.createElement('a');
    link.className = 'nav-link' + (heading.tagName === 'H3' ? ' kk-toc-sub' : '');
    link.href = '#' + heading.id;
    link.textContent = heading.textContent;
    tocNav.appendChild(link);
  });

  // Aktifkan Bootstrap Scrollspy secara manual (setelah link TOC dibuat), dengan
  // rootMargin negatif di bawah supaya deteksi "aktif" terjadi saat heading
  // berada di awal viewport, bukan di tengah layar.
  if (window.bootstrap && bootstrap.ScrollSpy) {
    new bootstrap.ScrollSpy(document.body, {
      target: '#kk-toc-nav',
      rootMargin: '-100px 0px -70%',
      // smoothScroll: true
    });
  }
});