/**
 * GLightbox secara default bekerja lewat elemen <a href="..." class="glightbox">,
 * bukan <img> polos. Karena body artikel di-render dari Markdown (marked)
 * menghasilkan <img> polos, fungsi ini membungkus tiap <img> dengan <a class="glightbox">
 * yang href-nya sama dengan src gambar itu sendiri — supaya klik gambar buka lightbox.
 *
 * Dipanggil SETELAH marked.parse(), sebelum di-render lewat set:html.
 */
export function wrapImagesForLightbox(html: string): string {
  return html.replace(/<img([^>]*?)src="([^"]+)"([^>]*?)>/g, (match, _before, src) => {
    return `<a href="${src}" class="glightbox" data-gallery="article-images">${match}</a>`;
  });
}
