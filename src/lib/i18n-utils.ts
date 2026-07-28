import type { Locale } from './sheets';

/**
 * Tambahkan prefix /id/ ke path internal kalau locale = id.
 * Path dari Sheet (Navigation url, dll) selalu ditulis TANPA prefix.
 */
export function localizedHref(locale: Locale, url: string): string {
  if (locale === 'en') return url;
  if (url === '/') return '/id/';
  return `/id${url}`;
}

/**
 * Label teks breadcrumb per locale. Path/URL breadcrumb tetap ditulis manual
 * di tiap halaman (mengikuti pola path yang sudah ada di masing-masing file) —
 * ini cuma untuk teksnya, supaya tidak hardcode "Articles"/"Artikel" berulang.
 */
export function breadcrumbLabels(locale: Locale) {
  return {
    home: locale === 'en' ? 'Home' : 'Beranda',
    articles: locale === 'en' ? 'Articles' : 'Artikel',
    categories: locale === 'en' ? 'Categories' : 'Kategori',
    portfolio: 'Portfolio', // sama di kedua bahasa
  };
}
