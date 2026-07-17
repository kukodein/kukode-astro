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
