#!/usr/bin/env node
/**
 * Generate favicon lengkap dari 1 file source logo.
 *
 * Cara pakai:
 *   1. npm install --save-dev sharp png-to-ico   (sekali saja, dev dependency)
 *   2. Siapkan source logo — idealnya PNG/SVG persegi, minimal 512x512px,
 *      background transparan. Taruh di: public/favicon-source.png
 *   3. node scripts/generate-favicons.mjs
 *   4. Cek folder public/ — semua file favicon baru sudah ada di situ.
 *   5. Tempel blok <link> yang di-print di akhir script ini ke <head>
 *      BaseLayout.astro (di dekat <link rel="icon" ...> yang sudah ada).
 *
 * Kalau source Anda .svg bukan .png, ganti SOURCE_PATH di bawah.
 */

import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const SOURCE_PATH = path.resolve('public/favicon.png');
const OUT_DIR = path.resolve('public');

// Ukuran PNG yang digenerate. Tambah/kurangi sesuai kebutuhan.
const PNG_SIZES = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 180, name: 'apple-touch-icon.png' }, // dipakai iOS saat "Add to Home Screen"
  { size: 192, name: 'android-chrome-192x192.png' },
  { size: 512, name: 'android-chrome-512x512.png' },
];

// Ukuran yang digabung jadi favicon.ico (dukungan browser/taskbar lama)
const ICO_SIZES = [16, 32, 48];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log(`Membaca source: ${SOURCE_PATH}`);

  // 1. Generate semua ukuran PNG
  for (const { size, name } of PNG_SIZES) {
    const outPath = path.join(OUT_DIR, name);
    await sharp(SOURCE_PATH)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outPath);
    console.log(`  ✓ ${name} (${size}x${size})`);
  }

  // 2. Generate favicon.ico dari beberapa ukuran kecil sekaligus
  const icoBuffers = await Promise.all(
    ICO_SIZES.map((size) =>
      sharp(SOURCE_PATH)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
    )
  );
  const icoBuffer = await pngToIco(icoBuffers);
  await writeFile(path.join(OUT_DIR, 'favicon.ico'), icoBuffer);
  console.log(`  ✓ favicon.ico (gabungan ${ICO_SIZES.join('/')}px)`);

  // 3. site.webmanifest — dibaca browser Android untuk "Add to Home Screen"
  const manifest = {
    name: 'Kukode',
    short_name: 'Kukode',
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    theme_color: '#3e63dd', // sesuaikan dengan warna aksen Anda
    background_color: '#ffffff',
    display: 'standalone',
  };
  await writeFile(
    path.join(OUT_DIR, 'site.webmanifest'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('  ✓ site.webmanifest');

  console.log('\nSelesai! Tempel blok berikut ke <head> BaseLayout.astro (dekat <link rel="icon"> yang sudah ada):\n');
  console.log(`<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />`);
}

main().catch((err) => {
  console.error('\nGagal generate favicon:', err.message);
  if (err.code === 'ENOENT') {
    console.error(`Pastikan file source ada di: ${SOURCE_PATH}`);
  }
  process.exit(1);
});
