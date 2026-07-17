// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // ganti dengan domain asli Anda — dipakai untuk sitemap & canonical URL
  site: 'https://kukode.com',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'id'],
    routing: {
      prefixDefaultLocale: false, // en -> tanpa prefix, id -> /id/
    },
  },

  integrations: [sitemap()],
});
