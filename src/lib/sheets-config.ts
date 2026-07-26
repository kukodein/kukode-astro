// SPREADSHEET_ID dan semua gid tab sekarang dibaca dari .env — BUKAN hardcode di sini.
// File ini murni logic, aman ditimpa update dari Claude kapan saja tanpa
// menghapus nilai yang sudah Anda isi di .env.
//
// Isi nilai aslinya di file .env (lihat .env.example untuk daftar lengkap variabel).

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Environment variable "${name}" belum diisi. Copy .env.example jadi .env, lalu isi nilainya. ` +
        `Lihat README/sheet.md untuk cara ambil SPREADSHEET_ID dan gid tiap tab.`
    );
  }
  return value;
}

export const SPREADSHEET_ID = requireEnv('PUBLIC_SPREADSHEET_ID');

export const SHEET_GIDS = {
  articles_en: requireEnv('PUBLIC_SHEET_GID_ARTICLES_EN'),
  articles_id: requireEnv('PUBLIC_SHEET_GID_ARTICLES_ID'),
  navigation_en: requireEnv('PUBLIC_SHEET_GID_NAVIGATION_EN'),
  navigation_id: requireEnv('PUBLIC_SHEET_GID_NAVIGATION_ID'),
  settings: requireEnv('PUBLIC_SHEET_GID_SETTINGS'),
  pages: requireEnv('PUBLIC_SHEET_GID_PAGES'),
  categories: requireEnv('PUBLIC_SHEET_GID_CATEGORIES'),
  portfolio: requireEnv('PUBLIC_SHEET_GID_PORTFOLIO'),
} as const;

export type SheetKey = keyof typeof SHEET_GIDS;

/**
 * Membangun URL export CSV untuk satu tab spreadsheet.
 * Sheet harus di-set sharing "Anyone with the link -> Viewer" agar URL ini bisa diakses tanpa auth.
 */
export function buildCsvUrl(sheetKey: SheetKey): string {
  const gid = SHEET_GIDS[sheetKey];
  return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
}
