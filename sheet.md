# Panduan Google Sheets

## Kenapa tidak pakai Google Sheets API resmi (service account)?
Project ini fetch data lewat **CSV export URL** (`docs.google.com/spreadsheets/d/.../export?format=csv`), bukan Google Sheets API v4 dengan API key/service account. Alasannya: konten di sheet ini memang akan jadi konten publik di website, jadi tidak ada gunanya bikin otentikasi rumit untuk data yang toh akan ditampilkan ke semua orang. Konsekuensinya: **spreadsheet harus di-set public (Anyone with the link → Viewer)**.

> Kalau suatu saat ada data yang benar-benar harus privat (misal draft yang sensitif), jangan taruh di spreadsheet ini — sistem ini tidak didesain untuk itu.

## Setup — Singkat
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

## Daftar Tab & Kolom

### `Pages_EN` dan `Pages_ID`
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

### `Articles_EN` dan `Articles_ID`
Satu baris = satu artikel. **`article_id` harus sama** antara baris di `Articles_EN` dan `Articles_ID` untuk artikel yang sama — ini kunci yang menghubungkan versi bahasa (dipakai untuk hreflang).

| Kolom | Tipe | Keterangan |
|---|---|---|
| `article_id` | text | ID unik artikel, sama di kedua tab bahasa untuk artikel yang sama, misal `art-001` |
| `slug` | text | Slug URL, boleh beda antar bahasa (misal `first-article` vs `artikel-pertama`) |
| `title` | text | Judul artikel |
| `excerpt` | text | Ringkasan pendek, tampil di halaman listing & meta description |
| `body` | text (Markdown) | Isi artikel lengkap, ditulis pakai sintaks Markdown |
| `image_url` | text (URL) | Link gambar cover, hosting eksternal |
| `published_date` | text (`YYYY-MM-DD`) | Tanggal publish, dipakai untuk urutan (terbaru dulu) |
| `status` | text | `published` atau `draft` — hanya yang `published` yang ditampilkan |

### `Navigation_EN` dan `Navigation_ID`
Isi menu header dan footer.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `group` | text | `header` atau `footer` |
| `order` | number | Urutan tampil (angka kecil di depan) |
| `label` | text | Teks link yang tampil ke user |
| `url` | text | Path tujuan, **tanpa** prefix `/id/` (misal `/about/`, bukan `/id/about/`) — prefix ditambahkan otomatis oleh kode |

### `Settings`
Global, tidak per-bahasa (key-value, satu tab saja untuk kedua bahasa).

| Kolom | Tipe | Keterangan |
|---|---|---|
| `key` | text | Nama setting: `favicon_url`, `logo_url`, `site_name`, `copyright_text` |
| `value` | text | Isi setting tersebut |

---

## Cara nambah field baru
Kalau nanti butuh field baru (misal `og_image` untuk halaman), tinggal tambah baris baru di tab yang relevan — tidak perlu ubah struktur kolom (untuk tab yang formatnya key-value: Pages & Settings). Untuk tab yang formatnya kolom tetap (Articles, Navigation), tambah kolom baru dan update kode di `src/lib/sheets.ts` (tambahkan field ke interface `ArticleRow`/`NavigationRow`) supaya field baru itu ke-baca.
