# Panduan Setup — dari Nol sampai Live

## Panduan Google Sheets

### Kenapa tidak pakai Google Sheets API resmi (service account)?
Project ini fetch data lewat **CSV export URL** (`docs.google.com/spreadsheets/d/.../export?format=csv`), bukan Google Sheets API v4 dengan API key/service account. Alasannya: konten di sheet ini memang akan jadi konten publik di website, jadi tidak ada gunanya bikin otentikasi rumit untuk data yang toh akan ditampilkan ke semua orang. Konsekuensinya: **spreadsheet harus di-set public (Anyone with the link → Viewer)**.

> Kalau suatu saat ada data yang benar-benar harus privat (misal draft yang sensitif), jangan taruh di spreadsheet ini — sistem ini tidak didesain untuk itu.

### Setup — Singkat
1. Buat 1 spreadsheet baru di Google Sheets, buat tab-tab sesuai daftar di bawah.
2. Klik **Share** (kanan atas) → **General access** → ubah dari "Restricted" jadi **"Anyone with the link"** → role **Viewer**.
3. Ambil **Spreadsheet ID** dari URL:
   ```
   https://docs.google.com/spreadsheets/d/INI_SPREADSHEET_ID/edit
   ```
4. Untuk tiap tab, klik tab-nya sampai aktif, lihat URL — ada `#gid=123456789` di akhir. Itu **gid** tab tersebut.
5. Isi `SPREADSHEET_ID` dan semua `gid` di `src/lib/sheets-config.ts`.
6. Selesai — tidak perlu Google Cloud Console, tidak perlu API key, tidak perlu service account.

---

### Daftar Tab & Kolom

#### `Pages_EN` dan `Pages_ID`
Format key-value, dipakai untuk halaman statis (Home, About).

| Kolom | Tipe | Keterangan |
|---|---|---|
| `page` | text | Identifier halaman: `home` atau `about` |
| `key` | text | Nama field, misal `title`, `description`, `meta_title`, `meta_description` |
| `value` | text | Isi field tersebut |

Contoh baris:
```
page=home, key=title, value=Selamat Datang
page=home, key=description, value=Ini adalah deskripsi halaman home
page=home, key=meta_title, value=Nama Situs - Home
page=home, key=meta_description, value=Deskripsi untuk SEO
page=about, key=title, value=Tentang Kami
...
```

#### `Articles_EN` dan `Articles_ID`
Satu baris = satu artikel. **`article_id` harus sama** antara baris di `Articles_EN` dan `Articles_ID` untuk artikel yang sama — ini kunci yang menghubungkan versi bahasa (dipakai untuk hreflang).

| Kolom | Tipe | Keterangan |
|---|---|---|
| `article_id` | text | ID unik artikel, sama di kedua tab bahasa untuk artikel yang sama, misal `art-001` |
| `slug` | text | Slug URL, boleh beda antar bahasa (misal `first-article` vs `artikel-pertama`) |
| `title` | text | Judul artikel (tampil sebagai H1 di halaman) |
| `excerpt` | text | Ringkasan pendek, tampil di halaman listing |
| `body` | text (Markdown) | Isi artikel lengkap, ditulis pakai sintaks Markdown |
| `featured_image` | text (URL) | Link gambar cover, hosting eksternal — nama kolom ini disamakan dengan Simple_Pages |
| `category` | text | Key kategori (`category_id` di tab `Categories`), SAMA di kedua tab bahasa untuk artikel di kategori yang sama, misal `information` |
| `published_date` | text (`YYYY-MM-DD`) | Tanggal publish, dipakai untuk urutan (terbaru dulu) |
| `date_modified` | text (`YYYY-MM-DD`) | Tanggal edit terakhir, dipakai untuk meta SEO — kosongkan sama dengan `published_date` kalau belum pernah diedit |
| `status` | text | `published` atau `draft` — hanya yang `published` yang ditampilkan |
| `meta_title` | text | Opsional. Judul untuk tag `<title>`/SEO — kalau kosong, fallback ke `title` |
| `meta_description` | text | Opsional. Deskripsi untuk meta SEO — kalau kosong, fallback ke `excerpt` |

Listing artikel (`/article/`, `/id/article/`) dipaginasi 12 artikel per halaman, path-based: halaman 1 di `/article/`, halaman 2+ di `/article/page/2/`, dst (bukan `?page=2` — lihat alasan teknis di percakapan sebelumnya, intinya supaya tetap SEO-friendly di situs static).

#### `Categories`
Satu tab untuk kedua bahasa (mirip `Simple_Pages`) — `category_id` adalah key yang dipakai di kolom `category` pada Articles.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `category_id` | text | Key unik, dipakai untuk mencocokkan kolom `category` di Articles, misal `information` |
| `slug_en` | text | Slug URL EN, misal `information` |
| `slug_id` | text | Slug URL ID, misal `informasi` |
| `name_en` | text | Nama tampil EN, misal `Information` |
| `name_id` | text | Nama tampil ID, misal `Informasi` |

Route: `/category/` (daftar semua kategori), `/category/[slug]/` (daftar artikel dalam kategori itu) — dan padanan `/id/category/...` untuk versi ID.

#### `Portfolio`
**Tidak per-bahasa** — portfolio cuma punya 1 URL global (`/portfolio/`), tidak ada versi `/id/portfolio/`.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `portfolio_id` | text | ID unik |
| `slug` | text | Slug URL (cuma 1, tidak per-bahasa) |
| `title` | text | Judul project |
| `description` | text (Markdown) | Deskripsi/isi halaman detail |
| `featured_image` | text (URL) | Gambar cover |
| `project_url` | text (URL) | Opsional — link ke live project, ditampilkan sebagai tombol "Visit Project" |
| `published_date` | text (`YYYY-MM-DD`) | Dipakai untuk urutan (terbaru dulu) |
| `status` | text | `published` atau `draft` |
| `meta_title` | text | Opsional, fallback ke `title` |
| `meta_description` | text | Opsional, fallback ke `description` |

Route: `/portfolio/` (listing + paginasi 12/halaman, `/portfolio/page/2/` dst), `/portfolio/[slug]/` (detail).

#### `Simple_Pages`
Untuk halaman sederhana yang cuma butuh judul + body panjang, tanpa section custom (Privacy Policy, Terms, dst). Satu baris = satu halaman, **kedua bahasa dalam satu baris** (beda dari Pages_EN/Pages_ID yang terpisah tab) — supaya edit 1 halaman cukup di 1 tempat. Route otomatis di-generate dari sheet ini — tambah baris baru = tambah halaman baru, tanpa sentuh kode.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `page_id` | text | ID unik internal, misal `privacy-policy` |
| `slug_en` | text | Slug URL versi EN. Kosongkan kalau halaman ini tidak punya versi EN |
| `slug_id` | text | Slug URL versi ID. Kosongkan kalau halaman ini tidak punya versi ID |
| `title_en` | text | Judul EN |
| `title_id` | text | Judul ID |
| `body_en` | text (Markdown) | Isi EN |
| `body_id` | text (Markdown) | Isi ID |
| `featured_image` | text (URL) | Sama seperti Articles — dipakai untuk og:image |
| `status` | text | `published` atau `draft` |
| `meta_title` | text | Opsional, fallback ke `title_en`/`title_id` |
| `meta_description` | text | Opsional, fallback ke potongan 160 karakter pertama dari `body_en`/`body_id` |

Kalau `slug_id`/`title_id`/`body_id` dikosongkan, halaman itu cuma generate route EN (tidak error, tidak generate halaman ID kosong) — begitu juga sebaliknya. Slug juga tidak boleh sama dengan slug halaman hardcode yang sudah ada (`about`, `tentang`, `article`, `portfolio`, `contact`) — kalau bentrok, baris itu dilewati saat build dan muncul warning di log.

#### `Navigation_EN` dan `Navigation_ID`

Isi menu header dan footer.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `group` | text | `header` atau `footer` |
| `order` | number | Urutan tampil (angka kecil di depan) |
| `label` | text | Teks link yang tampil ke user |
| `url` | text | Path tujuan, **tanpa** prefix `/id/` (misal `/about/`, bukan `/id/about/`) — prefix ditambahkan otomatis oleh kode |

#### `Settings`
Global, tidak per-bahasa (key-value, satu tab saja untuk kedua bahasa).

| Kolom | Tipe | Keterangan |
|---|---|---|
| `key` | text | Nama setting: `favicon_url`, `logo_url`, `site_name`, `copyright_text` |
| `value` | text | Isi setting tersebut |

---

### Cara nambah field baru
Kalau nanti butuh field baru (misal `og_image` untuk halaman), tinggal tambah baris baru di tab yang relevan — tidak perlu ubah struktur kolom (untuk tab yang formatnya key-value: Pages & Settings). Untuk tab yang formatnya kolom tetap (Articles, Navigation), tambah kolom baru dan update kode di `src/lib/sheets.ts` (tambahkan field ke interface `ArticleRow`/`NavigationRow`) supaya field baru itu ke-baca.



## Panduan Deployment

### 1. Isi konfigurasi Sheets
- Buka `src/lib/sheets-config.ts`
- Ganti `SPREADSHEET_ID` dengan ID spreadsheet Anda (dari URL Google Sheets Anda)
- Ganti tiap `gid` sesuai tab yang sudah dibuat (lihat di URL saat tab itu aktif: `...#gid=123456`)
- Set sharing spreadsheet: **Share → General access → Anyone with the link → Viewer**

### 2. Push ke GitHub
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

### 3. Buat project di Vercel
1. Buka https://vercel.com, login pakai akun GitHub Anda.
2. **Add New → Project**, pilih repo yang baru di-push.
3. Vercel otomatis mendeteksi framework Astro — biarkan default, klik **Deploy**.
4. Setelah build pertama selesai (build ini akan sukses/gagal tergantung apakah `SPREADSHEET_ID` sudah benar dan sheet sudah public — kalau gagal, cek Build Logs, biasanya karena config di langkah 1 belum benar).

### 4. Ambil Deploy Hook URL
1. Di dashboard project Vercel: **Settings → Git → Deploy Hooks**.
2. Buat hook baru: nama bebas (misal `scheduled-rebuild`), branch `main`.
3. Copy URL yang muncul (bentuknya `https://api.vercel.com/v1/integrations/deploy/...`) — ini rahasia, jangan taruh langsung di kode.

### 5. Simpan Deploy Hook URL sebagai GitHub Secret
1. Di repo GitHub Anda: **Settings → Secrets and variables → Actions → New repository secret**.
2. Name: `VERCEL_DEPLOY_HOOK_URL`
3. Value: paste URL dari langkah 4.
4. Save.

### 6. Selesai — workflow sudah otomatis jalan
File `.github/workflows/scheduled-rebuild.yml` sudah ada di repo Anda dan akan otomatis:
- Jalan tiap jam (di menit ke-0, waktu UTC — kalau ingin sesuaikan ke jam WIB tertentu, edit cron expression-nya)
- Trigger Vercel untuk fetch ulang Google Sheets dan build ulang situs

**Test manual (opsional, untuk memastikan semua tersambung benar):**
Di repo GitHub → tab **Actions** → pilih workflow "Scheduled Rebuild" → **Run workflow** (tombol ini muncul karena ada `workflow_dispatch` di file YAML). Cek di dashboard Vercel apakah build baru muncul setelah itu.

### 7. Custom domain (opsional)
Kalau sudah punya domain sendiri: **Vercel project → Settings → Domains → Add**, ikuti instruksi untuk arahkan DNS. Setelah domain aktif, jangan lupa update `site: 'https://domain.com'` di `astro.config.mjs` jadi domain asli Anda (dipakai untuk sitemap & hreflang), lalu commit & push.

---

### Catatan penting soal keandalan
- Kalau build gagal (misal Google Sheets sedang tidak bisa diakses), **situs yang sedang live TIDAK ikut down** — Vercel tetap menyajikan deployment terakhir yang sukses. [High confidence, berdasarkan perilaku default Vercel — sebaiknya dikonfirmasi ulang di dokumentasi Vercel saat setup, karena kebijakan platform bisa berubah]
- Kode fetch Sheets sudah retry otomatis 3x sebelum benar-benar dianggap gagal, untuk menangani gangguan koneksi sesaat.
- Kalau build gagal terus-menerus, cek Build Logs di Vercel — pesan errornya sudah dibuat spesifik (menyebutkan sheet mana yang gagal dan kemungkinan penyebabnya).
