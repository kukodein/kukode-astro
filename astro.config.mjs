// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import { getArticles, getPortfolioItems, getPages, getPageFields } from './src/lib/sheets.ts';

const SITE_URL = 'https://kukode.com'; // ganti dengan domain asli Anda

/**
 * Bangun lookup "path -> tanggal terakhir diubah" dari Articles (EN+ID),
 * Portfolio, dan Pages (EN+ID) — dipakai untuk isi <lastmod> di sitemap
 * (seperti RankMath). Untuk Pages, kolom published_date/date_modified di
 * sheet OPSIONAL — kalau kosong, halaman itu cuma tidak dapat <lastmod>,
 * bukan error.
 */
async function buildLastmodMap() {
  const map = new Map(); // path (tanpa domain) -> tanggal ISO

  const [articlesEn, articlesId, portfolioItems, pagesEn, pagesId, homeFields] = await Promise.all([
    getArticles('en'),
    getArticles('id'),
    getPortfolioItems(),
    getPages('en'),
    getPages('id'),
    getPageFields('home'),
  ]);

  for (const article of articlesEn) {
    const date = article.date_modified || article.published_date;
    if (date) map.set(`/article/${article.slug}/`, new Date(date).toISOString());
  }
  for (const article of articlesId) {
    const date = article.date_modified || article.published_date;
    if (date) map.set(`/id/article/${article.slug}/`, new Date(date).toISOString());
  }
  for (const item of portfolioItems) {
    if (item.published_date) {
      map.set(`/portfolio/${item.slug}/`, new Date(item.published_date).toISOString());
    }
  }
  for (const page of pagesEn) {
    const date = page.date_modified || page.published_date;
    if (date) map.set(`/${page.slug}/`, new Date(date).toISOString());
  }
  for (const page of pagesId) {
    const date = page.date_modified || page.published_date;
    if (date) map.set(`/id/${page.slug}/`, new Date(date).toISOString());
  }
  if (homeFields) {
    const homeDate = homeFields.date_modified || homeFields.published_date;
    if (homeDate) {
      map.set('/', new Date(homeDate).toISOString());
      map.set('/id/', new Date(homeDate).toISOString());
    }
  }

  return map;
}

// Di-fetch SEKALI, di-cache sebagai promise supaya tidak fetch berulang tiap URL
// (serialize() dipanggil sekali per URL oleh @astrojs/sitemap).
const lastmodMapPromise = buildLastmodMap();

export default defineConfig({
  site: SITE_URL,

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'id'],
    routing: {
      prefixDefaultLocale: false, // en -> tanpa prefix, id -> /id/
    },
  },

  integrations: [
    sitemap({
      // Sembunyikan halaman detail Portfolio dari sitemap (index tetap masuk).
      filter: (page) => {
        const path = page.replace(SITE_URL, '');
        const isPortfolioDetail = /^\/portfolio\/(?!page\/)[^/]+\/$/.test(path);
        return !isPortfolioDetail;
      },
      // Tambah <lastmod> untuk Articles & Portfolio dari data sheet.
      serialize: async (item) => {
        const lastmodMap = await lastmodMapPromise;
        const path = item.url.replace(SITE_URL, '');
        const lastmod = lastmodMap.get(path);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
});