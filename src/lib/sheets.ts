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

export interface PageKVRow {
  page_id: string;
  key: string;
  value: string;
}

// Nilai `template` yang valid untuk halaman ber-template. `home` TIDAK termasuk
// di sini karena Home tetap file hardcode (index.astro) — baris "home" di sheet
// Pages cuma dipakai untuk override title/meta, bukan untuk generate route.
export type PageTemplate =
  | 'about'
  | 'contact'
  | 'service'
  | 'simple'
  | 'simple_wide'
  | 'simple_blank';

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
 * Ambil SEMUA baris tab Pages dan pivot dari format {page_id, key, value}
 * jadi Map<page_id, {key: value}> — 1 lookup, dipakai semua fungsi Pages di bawah.
 */
async function getAllPagesPivoted(): Promise<Map<string, Record<string, string>>> {
  const rows = await fetchSheet<PageKVRow>('pages');
  const pivoted = new Map<string, Record<string, string>>();

  for (const row of rows) {
    if (!pivoted.has(row.page_id)) pivoted.set(row.page_id, {});
    pivoted.get(row.page_id)![row.key] = row.value;
  }
  return pivoted;
}

/**
 * Ambil field mentah (belum di-filter locale) untuk SATU page_id — dipakai untuk
 * kasus seperti Home, yang cuma butuh title/meta dari sheet ini tapi body-nya
 * tetap hardcode di index.astro (bukan halaman ber-template).
 */
export async function getPageFields(pageId: string): Promise<Record<string, string> | undefined> {
  const pivoted = await getAllPagesPivoted();
  return pivoted.get(pageId);
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

// Daftar slug yang dipakai NAMESPACE ROUTE hardcode — halaman ber-template TIDAK BOLEH
// pakai slug ini, supaya tidak tabrakan. `about`/`tentang`/`contact` SENGAJA tidak lagi
// di sini karena sekarang justru DIHASILKAN oleh sistem template ini, bukan hardcode.
const RESERVED_SLUGS = ['article', 'portfolio', 'category'];

export interface TemplatedPage {
  page_id: string;
  template: PageTemplate;
  slug: string;
  title: string;
  body: string;
  featured_image: string;
  meta_title: string;
  meta_description: string;
  // Field khusus template tertentu — kosong string kalau tidak dipakai template ini.
  icon: string; // service
  price_from: string; // service
  address: string; // contact
  email: string; // contact
  hours: string; // contact
}

/**
 * Ambil semua halaman ber-template yang published DAN punya isi untuk locale ini.
 * Baris tanpa `template` (mis. "home", yang cuma dipakai untuk override meta)
 * otomatis tidak ikut — itu bukan halaman yang di-generate router ini.
 */
export async function getPages(locale: Locale): Promise<TemplatedPage[]> {
  const pivoted = await getAllPagesPivoted();
  const result: TemplatedPage[] = [];

  for (const [pageId, fields] of pivoted.entries()) {
    const template = fields.template as PageTemplate | undefined;
    if (!template) continue; // baris meta-only (mis. "home") -> skip, bukan route
    if (fields.status !== 'published') continue;

    const slug = (locale === 'en' ? fields.slug_en : fields.slug_id)?.trim();
    const title = (locale === 'en' ? fields.title_en : fields.title_id)?.trim();
    if (!slug || !title) continue; // locale ini belum diisi -> skip

    if (RESERVED_SLUGS.includes(slug)) {
      console.warn(
        `[pages] Slug "${slug}" (page_id: ${pageId}) bentrok dengan namespace route hardcode ` +
          `(article/portfolio/category) — baris ini dilewati. Ganti slug-nya di sheet.`
      );
      continue;
    }

    result.push({
      page_id: pageId,
      template,
      slug,
      title,
      body: (locale === 'en' ? fields.body_en : fields.body_id) ?? '',
      featured_image: fields.featured_image ?? '',
      meta_title: (locale === 'en' ? fields.meta_title_en : fields.meta_title_id) ?? '',
      meta_description: (locale === 'en' ? fields.meta_description_en : fields.meta_description_id) ?? '',
      icon: fields.icon ?? '',
      price_from: fields.price_from ?? '',
      address: fields.address ?? '',
      email: fields.email ?? '',
      hours: fields.hours ?? '',
    });
  }

  return result;
}

/**
 * Ambil satu halaman ber-template berdasarkan slug (untuk locale tertentu).
 */
export async function getPageBySlug(locale: Locale, slug: string): Promise<TemplatedPage | undefined> {
  const pages = await getPages(locale);
  return pages.find((p) => p.slug === slug);
}

/**
 * Cari slug versi locale lain untuk halaman yang sama, dihubungkan lewat page_id.
 * Return null kalau locale itu tidak diisi untuk halaman ini (mis. halaman EN-only).
 */
export async function getPageAlternateSlug(pageId: string, targetLocale: Locale): Promise<string | null> {
  const pages = await getPages(targetLocale);
  const match = pages.find((p) => p.page_id === pageId);
  return match?.slug ?? null;
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
