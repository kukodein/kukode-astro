import { routes, type VercelConfig, type Redirect } from '@vercel/config/v1';

// VERCEL_ENV otomatis di-set oleh Vercel: 'production' | 'preview' | 'development'.
// Di luar Production, X-Robots-Tag noindex — mencegah Google index situs staging/preview.
const isProduction = process.env.VERCEL_ENV === 'production';
const robotsHeaderValue = isProduction ? 'index, follow' : 'noindex, nofollow';

export const config: VercelConfig = {
  redirects: [
    routes.redirect('/article/old-slug-name', '/article/new-slug-name', { permanent: true }) as Redirect,
    routes.redirect('/id/article/slug-lama', '/id/article/slug-baru', { permanent: true }) as Redirect,
  ],
  headers: [
    routes.header('/(.*)', [
      { 
        key: 'X-Robots-Tag', 
        value: robotsHeaderValue 
      }
    ]),
    // Vendor libs (Bootstrap dkk) jarang berubah — cache lebih lama (1 minggu).
    routes.header('/vendor/(.*)', [
      { 
        key: 'Cache-Control', 
        value: 'public, max-age=604800, must-revalidate' },
    ]),
    // Custom CSS/JS kami sendiri — cache lebih pendek (1 hari), karena ini yang
    // paling sering diupdate. must-revalidate supaya browser tetap cek freshness
    // setelah expired, bukan diam-diam pakai versi lama.
    routes.header('/css/(.*)', [
      { 
        key: 'Cache-Control', 
        value: 'public, max-age=86400, must-revalidate' },
    ]),
    routes.header('/js/(.*)', [
      { 
        key: 'Cache-Control', 
        value: 'public, max-age=86400, must-revalidate' },
    ]),
  ],
};
