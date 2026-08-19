import { routes, type VercelConfig, type Redirect } from '@vercel/config/v1';

// VERCEL_ENV otomatis di-set oleh Vercel: 'production' | 'preview' | 'development'.
// Di luar Production, X-Robots-Tag noindex — mencegah Google index situs staging/preview.
const isProduction = process.env.VERCEL_ENV === 'production';
const robotsHeaderValue = isProduction ? 'index, follow' : 'noindex, nofollow';

export const config: VercelConfig = {
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
  redirects: [
    routes.redirect('/en', '/', { permanent: true }) as Redirect,
    routes.redirect('/sge-google', '/article/sge-google', { permanent: true }) as Redirect,
    routes.redirect('/ai-generative', '/article/ai-generative', { permanent: true }) as Redirect,
    routes.redirect('/artificial-intelligence', '/article/artificial-intelligence', { permanent: true }) as Redirect,
    routes.redirect('/differences-ai-and-machine-learning', '/article/differences-ai-and-machine-learning', { permanent: true }) as Redirect,
    routes.redirect('/what-is-ransomware', '/article/what-is-ransomware', { permanent: true }) as Redirect,
    routes.redirect('/what-is-anti-ransomware', '/article/what-is-anti-ransomware', { permanent: true }) as Redirect,
    routes.redirect('/website-is', '/article/website-is', { permanent: true }) as Redirect,
    routes.redirect('/what-a-trojan-virus', '/article/what-a-trojan-virus', { permanent: true }) as Redirect,
    routes.redirect('/web-browser', '/article/web-browser', { permanent: true }) as Redirect,
    routes.redirect('/web-servers', '/article/web-servers', { permanent: true }) as Redirect,
    routes.redirect('/web-development', '/article/web-development', { permanent: true }) as Redirect,
    routes.redirect('/front-end-web-development', '/article/front-end-web-development', { permanent: true }) as Redirect,
    routes.redirect('/back-end-developers', '/article/back-end-developers', { permanent: true }) as Redirect,
    routes.redirect('/front-end-vs-back-end', '/article/front-end-vs-back-end', { permanent: true }) as Redirect,
    routes.redirect('/what-is-captcha', '/article/what-is-captcha', { permanent: true }) as Redirect,
    routes.redirect('/ai-benefits', '/article/ai-benefits', { permanent: true }) as Redirect,
    routes.redirect('/freelance-web-development', '/article/freelance-web-development', { permanent: true }) as Redirect,
    routes.redirect('/dangers-of-ai', '/article/dangers-of-ai', { permanent: true }) as Redirect,
    routes.redirect('/what-is-json', '/article/what-is-json', { permanent: true }) as Redirect,
    routes.redirect('/css-frameworks', '/article/css-frameworks', { permanent: true }) as Redirect,
    routes.redirect('/what-is-malware', '/article/what-is-malware', { permanent: true }) as Redirect,
    routes.redirect('/full-stack-developer', '/article/full-stack-developer', { permanent: true }) as Redirect,
    routes.redirect('/what-is-an-api', '/article/what-is-an-api', { permanent: true }) as Redirect,
    routes.redirect('/id/google-sge', '/id/article/google-sge', { permanent: true }) as Redirect,
    routes.redirect('/id/generative-ai', '/id/article/generative-ai', { permanent: true }) as Redirect,
    routes.redirect('/id/kecerdasan-buatan', '/id/article/kecerdasan-buatan', { permanent: true }) as Redirect,
    routes.redirect('/id/perbedaan-ai-dan-ml', '/id/article/perbedaan-ai-dan-ml', { permanent: true }) as Redirect,
    routes.redirect('/id/apa-itu-ransomware', '/id/article/apa-itu-ransomware', { permanent: true }) as Redirect,
    routes.redirect('/id/apa-itu-anti-ransomware', '/id/article/apa-itu-anti-ransomware', { permanent: true }) as Redirect,
    routes.redirect('/id/website-adalah', '/id/article/website-adalah', { permanent: true }) as Redirect,
    routes.redirect('/id/apa-itu-virus-trojan', '/id/article/apa-itu-virus-trojan', { permanent: true }) as Redirect,
    routes.redirect('/id/pengertian-web-browser', '/id/article/pengertian-web-browser', { permanent: true }) as Redirect,
    routes.redirect('/id/web-server', '/id/article/web-server', { permanent: true }) as Redirect,
    routes.redirect('/id/web-development-id', '/id/article/web-development-id', { permanent: true }) as Redirect,
    routes.redirect('/id/front-end-development', '/id/article/front-end-development', { permanent: true }) as Redirect,
    routes.redirect('/id/back-end-developer', '/id/article/back-end-developer', { permanent: true }) as Redirect,
    routes.redirect('/id/front-end-dan-back-end', '/id/article/front-end-dan-back-end', { permanent: true }) as Redirect,
    routes.redirect('/id/apa-itu-captcha', '/id/article/apa-itu-captcha', { permanent: true }) as Redirect,
    routes.redirect('/id/manfaat-ai', '/id/article/manfaat-ai', { permanent: true }) as Redirect,
    routes.redirect('/id/freelance-web-developer', '/id/article/freelance-web-developer', { permanent: true }) as Redirect,
    routes.redirect('/id/bahaya-ai', '/id/article/bahaya-ai', { permanent: true }) as Redirect,
    routes.redirect('/id/apa-itu-json', '/id/article/apa-itu-json', { permanent: true }) as Redirect,
    routes.redirect('/id/css-framework', '/id/article/css-framework', { permanent: true }) as Redirect,
    routes.redirect('/id/apa-itu-malware', '/id/article/apa-itu-malware', { permanent: true }) as Redirect,
    routes.redirect('/id/full-stack-developer-2', '/id/article/full-stack-developer-2', { permanent: true }) as Redirect,
    routes.redirect('/id/apa-itu-api', '/id/article/apa-itu-api', { permanent: true }) as Redirect,
    routes.redirect('/tag/:path*', '/article', { permanent: true }) as Redirect,
    routes.redirect('/blog', '/article', { permanent: true }) as Redirect,
    routes.redirect('/id/artikel', '/id/article', { permanent: true }) as Redirect,
    routes.redirect('/id/tag/:path*', '/id/article', { permanent: true }) as Redirect,
    routes.redirect('/wp-content/:path*', '/', { permanent: true }) as Redirect,
    routes.redirect('/wp-content/uploads/:path*', '/', { permanent: true }) as Redirect,
  ],
};
