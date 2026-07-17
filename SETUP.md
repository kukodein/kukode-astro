# Panduan Setup — dari Nol sampai Live

## 1. Isi konfigurasi Sheets
- Buka `src/lib/sheets-config.ts`
- Ganti `SPREADSHEET_ID` dengan ID spreadsheet Anda (dari URL Google Sheets Anda)
- Ganti tiap `gid` sesuai tab yang sudah dibuat (lihat di URL saat tab itu aktif: `...#gid=123456`)
- Set sharing spreadsheet: **Share → General access → Anyone with the link → Viewer**

## 2. Push ke GitHub
```bash
cd astro-wp-migration
git init
git add .
git commit -m "Initial commit: Astro WP migration"
```
Buat repo baru di https://github.com/new (jangan centang "Add README", biar tidak konflik), lalu:
```bash
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git branch -M main
git push -u origin main
```

## 3. Buat project di Vercel
1. Buka https://vercel.com, login pakai akun GitHub Anda.
2. **Add New → Project**, pilih repo yang baru di-push.
3. Vercel otomatis mendeteksi framework Astro — biarkan default, klik **Deploy**.
4. Setelah build pertama selesai (build ini akan sukses/gagal tergantung apakah `SPREADSHEET_ID` sudah benar dan sheet sudah public — kalau gagal, cek Build Logs, biasanya karena config di langkah 1 belum benar).

## 4. Ambil Deploy Hook URL
1. Di dashboard project Vercel: **Settings → Git → Deploy Hooks**.
2. Buat hook baru: nama bebas (misal `scheduled-rebuild`), branch `main`.
3. Copy URL yang muncul (bentuknya `https://api.vercel.com/v1/integrations/deploy/...`) — ini rahasia, jangan taruh langsung di kode.

## 5. Simpan Deploy Hook URL sebagai GitHub Secret
1. Di repo GitHub Anda: **Settings → Secrets and variables → Actions → New repository secret**.
2. Name: `VERCEL_DEPLOY_HOOK_URL`
3. Value: paste URL dari langkah 4.
4. Save.

## 6. Selesai — workflow sudah otomatis jalan
File `.github/workflows/scheduled-rebuild.yml` sudah ada di repo Anda dan akan otomatis:
- Jalan tiap jam (di menit ke-0, waktu UTC — kalau ingin sesuaikan ke jam WIB tertentu, edit cron expression-nya)
- Trigger Vercel untuk fetch ulang Google Sheets dan build ulang situs

**Test manual (opsional, untuk memastikan semua tersambung benar):**
Di repo GitHub → tab **Actions** → pilih workflow "Scheduled Rebuild" → **Run workflow** (tombol ini muncul karena ada `workflow_dispatch` di file YAML). Cek di dashboard Vercel apakah build baru muncul setelah itu.

## 7. Custom domain (opsional)
Kalau sudah punya domain sendiri: **Vercel project → Settings → Domains → Add**, ikuti instruksi untuk arahkan DNS. Setelah domain aktif, jangan lupa update `site: 'https://domain.com'` di `astro.config.mjs` jadi domain asli Anda (dipakai untuk sitemap & hreflang), lalu commit & push.

---

## Catatan penting soal keandalan
- Kalau build gagal (misal Google Sheets sedang tidak bisa diakses), **situs yang sedang live TIDAK ikut down** — Vercel tetap menyajikan deployment terakhir yang sukses. [High confidence, berdasarkan perilaku default Vercel — sebaiknya dikonfirmasi ulang di dokumentasi Vercel saat setup, karena kebijakan platform bisa berubah]
- Kode fetch Sheets sudah retry otomatis 3x sebelum benar-benar dianggap gagal, untuk menangani gangguan koneksi sesaat.
- Kalau build gagal terus-menerus, cek Build Logs di Vercel — pesan errornya sudah dibuat spesifik (menyebutkan sheet mana yang gagal dan kemungkinan penyebabnya).
