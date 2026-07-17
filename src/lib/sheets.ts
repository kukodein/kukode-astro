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
  image_url: string;
  published_date: string;
  date_modified: string; // kolom baru — kosongkan sama dengan published_date kalau belum pernah diedit
  status: string;
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
