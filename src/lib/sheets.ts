import Papa from 'papaparse';
import { buildCsvUrl, type SheetKey } from './sheets-config';

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

// Cache di memory (per-process). Sheet yang sama tidak di-fetch ulang selama
// dev server / proses build ini masih hidup — beda halaman yang butuh sheet
// yang sama (misal Settings & Navigation dipakai di semua halaman lewat BaseLayout)
// akan pakai hasil fetch yang sama, bukan fetch baru tiap kali.
const sheetCache = new Map<SheetKey, Promise<unknown[]>>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch satu tab sheet dan parse jadi array of objects, dengan retry untuk gangguan sesaat.
 *
 * Catatan desain: kalau semua retry gagal, fungsi ini melempar error dan build akan gagal.
 * Ini SENGAJA, bukan bug — build yang gagal TIDAK membuat situs down, karena Vercel/Netlify/
 * Cloudflare Pages secara default tetap menyajikan deployment terakhir yang sukses sampai
 * ada build baru yang berhasil. Jadi "fail build" di sini sebenarnya sudah otomatis aman
 * untuk pengunjung situs; yang perlu Anda lakukan cuma cek notifikasi build gagal dan
 * benerin masalah fetch-nya (koneksi/sharing setting/gid), lalu trigger rebuild lagi.
 */
async function fetchSheet<T = Record<string, string>>(sheetKey: SheetKey): Promise<T[]> {
  const cached = sheetCache.get(sheetKey);
  if (cached) return cached as Promise<T[]>;

  const promise = fetchSheetUncached<T>(sheetKey).catch((err) => {
    // Jangan cache kegagalan — biar request berikutnya bisa coba fetch lagi
    // (misal setelah gangguan koneksi sesaat), bukan langsung gagal permanen
    // sampai dev server di-restart.
    sheetCache.delete(sheetKey);
    throw err;
  });
  sheetCache.set(sheetKey, promise);
  return promise;
}

async function fetchSheetUncached<T = Record<string, string>>(sheetKey: SheetKey): Promise<T[]> {
  const url = buildCsvUrl(sheetKey);
  let lastError: unknown;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const csvText = await res.text();
      const parsed = Papa.parse<T>(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        console.warn(`Warning saat parse sheet "${sheetKey}":`, parsed.errors);
      }

      return parsed.data;
    } catch (err) {
      lastError = err;
      console.warn(`[sheets] Percobaan ${attempt}/${RETRY_ATTEMPTS} gagal untuk "${sheetKey}":`, err);
      if (attempt < RETRY_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  throw new Error(
    `Gagal fetch sheet "${sheetKey}" setelah ${RETRY_ATTEMPTS}x percobaan. ` +
      `Cek koneksi, sharing setting sheet ("Anyone with the link -> Viewer"), dan gid di sheets-config.ts. ` +
      `Deployment production yang sedang live TIDAK terpengaruh oleh kegagalan build ini. ` +
      `Error terakhir: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

// ---------- Types ----------

export type Locale = 'en' | 'id';

export interface PageRow {
  page: string;
  key: string;
  value: string;
}

export interface ArticleRow {
  article_id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  featured_image: string; // sebelumnya image_url — disamakan namanya dengan Simple_Pages
  category: string; // key penghubung ke tab Categories (category_id) — SAMA di kedua bahasa
  published_date: string;
  date_modified: string; // kosongkan sama dengan published_date kalau belum pernah diedit
  status: string;
  meta_title: string; // opsional — kalau kosong, fallback ke `title` saat dipakai
  meta_description: string; // opsional — kalau kosong, fallback ke `excerpt` saat dipakai
}

export interface NavigationRow {
  group: 'header' | 'footer';
  order: string;
  label: string;
  url: string;
}

export interface SettingsRow {
  key: string;
  value: string;
}

export interface SimplePageRow {
  page_id: string;
  slug_en: string;
  slug_id: string;
  title_en: string;
  title_id: string;
  body_en: string;
  body_id: string;
  featured_image: string;
  status: string;
  meta_title: string;
  meta_description: string;
}

export interface CategoryRow {
  category_id: string; // key yang dipakai di kolom `category` Articles — SAMA di kedua bahasa
  slug_en: string;
  slug_id: string;
  name_en: string;
  name_id: string;
}

export interface PortfolioRow {
  portfolio_id: string;
  slug: string; // cuma 1 slug (tidak per-bahasa) — portfolio cuma py 1 URL global
  title: string;
  description: string;
  featured_image: string;
  project_url: string; // link ke live project (opsional)
  published_date: string;
  status: string;
  meta_title: string;
  meta_description: string;
}

// ---------- High-level getters ----------

/**
 * Ambil semua field satu Page (misal 'home' atau 'about'), sudah di-pivot
 * dari format {page, key, value} jadi object flat: { title: '...', description: '...' }
 */
export async function getPageData(locale: Locale, pageKey: string): Promise<Record<string, string>> {
  const rows = await fetchSheet<PageRow>(locale === 'en' ? 'pages_en' : 'pages_id');
  const pageRows = rows.filter((r) => r.page === pageKey);

  const result: Record<string, string> = {};
  for (const row of pageRows) {
    result[row.key] = row.value;
  }
  return result;
}

/**
 * Ambil semua artikel yang published untuk satu locale, urut dari terbaru.
 */
export async function getArticles(locale: Locale): Promise<ArticleRow[]> {
  const rows = await fetchSheet<ArticleRow>(locale === 'en' ? 'articles_en' : 'articles_id');
  return rows
    .filter((r) => r.status === 'published')
    .sort((a, b) => (a.published_date < b.published_date ? 1 : -1));
}

/**
 * Ambil satu artikel berdasarkan slug. Dipakai di halaman detail [slug].astro.
 */
export async function getArticleBySlug(locale: Locale, slug: string): Promise<ArticleRow | undefined> {
  const articles = await getArticles(locale);
  return articles.find((a) => a.slug === slug);
}

/**
 * Cari slug versi locale lain untuk artikel yang sama, dihubungkan lewat article_id.
 * Dipakai untuk generate hreflang di halaman detail artikel.
 * Return null kalau padanannya belum ada di locale lain (misal artikel baru yang belum diterjemahkan).
 */
export async function getArticleAlternateSlug(
  articleId: string,
  targetLocale: Locale
): Promise<string | null> {
  const articles = await getArticles(targetLocale);
  const match = articles.find((a) => a.article_id === articleId);
  return match?.slug ?? null;
}

// Daftar slug yang sudah dipakai halaman hardcode — Simple_Pages TIDAK BOLEH
// pakai slug ini, supaya tidak tabrakan route. Ditambah manual kalau nanti ada
// halaman hardcode baru (mis. /portfolio/, /contact/).
const RESERVED_SLUGS = ['about', 'tentang', 'article', 'portfolio', 'contact', 'category'];

/**
 * Ambil semua Simple_Pages yang published DAN punya isi untuk locale ini
 * (slug/title/body tidak kosong). Baris yang cuma diisi 1 bahasa otomatis
 * tidak generate halaman di locale yang kosong.
 */
export async function getSimplePages(locale: Locale): Promise<SimplePageRow[]> {
  const rows = await fetchSheet<SimplePageRow>('simple_pages');
  const slugKey = locale === 'en' ? 'slug_en' : 'slug_id';
  const titleKey = locale === 'en' ? 'title_en' : 'title_id';

  return rows.filter((row) => {
    if (row.status !== 'published') return false;
    const slug = row[slugKey]?.trim();
    const title = row[titleKey]?.trim();
    if (!slug || !title) return false; // locale ini belum diisi -> skip
    if (RESERVED_SLUGS.includes(slug)) {
      console.warn(
        `[simple_pages] Slug "${slug}" (page_id: ${row.page_id}) bentrok dengan halaman hardcode ` +
          `yang sudah ada — baris ini dilewati. Ganti slug-nya di sheet.`
      );
      return false;
    }
    return true;
  });
}

/**
 * Ambil satu Simple_Page berdasarkan slug (untuk locale tertentu).
 */
export async function getSimplePageBySlug(
  locale: Locale,
  slug: string
): Promise<SimplePageRow | undefined> {
  const pages = await getSimplePages(locale);
  const slugKey = locale === 'en' ? 'slug_en' : 'slug_id';
  return pages.find((p) => p[slugKey] === slug);
}

/**
 * Cari slug versi locale lain untuk Simple_Page yang sama, dihubungkan lewat page_id.
 * Return null kalau locale itu tidak diisi untuk halaman ini (mis. halaman EN-only).
 */
export async function getSimplePageAlternateSlug(
  pageId: string,
  targetLocale: Locale
): Promise<string | null> {
  const pages = await getSimplePages(targetLocale);
  const slugKey = targetLocale === 'en' ? 'slug_en' : 'slug_id';
  const match = pages.find((p) => p.page_id === pageId);
  return match?.[slugKey] ?? null;
}

/**
 * Ambil navigasi (header atau footer) untuk satu locale, sudah terurut sesuai kolom `order`.
 */
export async function getNavigation(
  locale: Locale,
  group: 'header' | 'footer'
): Promise<NavigationRow[]> {
  const rows = await fetchSheet<NavigationRow>(locale === 'en' ? 'navigation_en' : 'navigation_id');
  return rows
    .filter((r) => r.group === group)
    .sort((a, b) => Number(a.order) - Number(b.order));
}

/**
 * Ambil site settings global (favicon, logo, dll) — tidak per-bahasa.
 */
export async function getSettings(): Promise<Record<string, string>> {
  const rows = await fetchSheet<SettingsRow>('settings');
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

/**
 * Potong teks body (biasanya Markdown) jadi ringkasan pendek untuk meta_description,
 * dipakai sebagai fallback kalau meta_description tidak diisi manual di sheet
 * (terutama untuk Simple_Pages, yang tidak punya kolom excerpt tersendiri).
 * Menghapus syntax Markdown paling umum dulu supaya hasilnya teks polos yang enak dibaca.
 */
export function truncateForMeta(body: string, maxLength = 160): string {
  const plainText = body
    .replace(/[#>*_`~-]/g, '') // hapus karakter markdown umum (heading, quote, bold, italic, code, list)
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // [teks](url) -> teks
    .replace(/\s+/g, ' ')
    .trim();

  if (plainText.length <= maxLength) return plainText;
  return plainText.slice(0, maxLength).trimEnd() + '…';
}

// ---------- Categories ----------

/**
 * Ambil semua kategori. CategoryRow tidak per-bahasa (1 tab untuk semua),
 * jadi tidak perlu filter locale di sini — cuma dipakai untuk lookup slug/nama.
 */
export async function getCategories(): Promise<CategoryRow[]> {
  return fetchSheet<CategoryRow>('categories');
}

/**
 * Cari 1 kategori berdasarkan category_id (key yang sama dipakai di kolom
 * `category` Articles).
 */
export async function getCategoryById(categoryId: string): Promise<CategoryRow | undefined> {
  const categories = await getCategories();
  return categories.find((c) => c.category_id === categoryId);
}

/**
 * Cari 1 kategori berdasarkan slug untuk locale tertentu — dipakai di halaman
 * /category/[slug]/ untuk resolve slug URL balik ke category_id.
 */
export async function getCategoryBySlug(
  locale: Locale,
  slug: string
): Promise<CategoryRow | undefined> {
  const categories = await getCategories();
  const slugKey = locale === 'en' ? 'slug_en' : 'slug_id';
  return categories.find((c) => c[slugKey] === slug);
}

/**
 * Ambil semua artikel published dalam satu kategori (locale tertentu), terurut terbaru dulu.
 */
export async function getArticlesByCategory(
  locale: Locale,
  categoryId: string
): Promise<ArticleRow[]> {
  const articles = await getArticles(locale);
  return articles.filter((a) => a.category === categoryId);
}

// ---------- Portfolio ----------
// Portfolio TIDAK per-bahasa — cuma 1 URL global (/portfolio/), tidak ada versi /id/portfolio/.

export async function getPortfolioItems(): Promise<PortfolioRow[]> {
  const rows = await fetchSheet<PortfolioRow>('portfolio');
  return rows
    .filter((p) => p.status === 'published')
    .sort((a, b) => (a.published_date < b.published_date ? 1 : -1));
}

export async function getPortfolioBySlug(slug: string): Promise<PortfolioRow | undefined> {
  const items = await getPortfolioItems();
  return items.find((p) => p.slug === slug);
}
