// Ganti SPREADSHEET_ID dengan ID spreadsheet Anda.
// ID diambil dari URL: https://docs.google.com/spreadsheets/d/**INI_ID_NYA**/edit
export const SPREADSHEET_ID = '1FRcpOJtNDmdYXi_NBqrCra8vg1vU07huIMSMyXejobo';

// Tiap tab/sheet punya "gid" unik (lihat di URL saat tab itu aktif: ...#gid=123456).
// Isi gid di bawah ini sesuai tab yang sudah Anda buat.
export const SHEET_GIDS = {
  pages_en      : '2024513039', // ganti dengan gid tab Pages_EN
  pages_id      : '1802581701', // ganti dengan gid tab Pages_ID
  articles_en   : '1887654328', // ganti dengan gid tab Articles_EN
  articles_id   : '126605301', // ganti dengan gid tab Articles_ID
  navigation_en : '686566731', // ganti dengan gid tab Navigation_EN
  navigation_id : '797366802', // ganti dengan gid tab Navigation_ID
  settings      : '1893895348', // ganti dengan gid tab Settings (global, tidak per-bahasa)
  simple_pages  : '1610984561', // ganti dengan gid tab Simple_Pages (1 tab untuk kedua bahasa)
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
