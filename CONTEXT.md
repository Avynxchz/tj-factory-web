# CONTEXT.md — TJ FACTORY (Website Astro)

Dokumen konteks arsitektur untuk AI worker berikutnya. Status: **disetujui Tech Lead (Argon) untuk production (25 Okt 2026)**. Branch kerja: `dev` → deploy GitHub Pages (Actions) dari `main`. Branch `main` di-update dari `dev` hanya atas perintah eksplisit pemilik.

## 1. Stack yang dikunci

- **Astro 4** — `output: 'static'` di `astro.config.mjs`, tanpa adapter.
- **Tailwind CSS 3.4** — via `@astrojs/tailwind` 5 (`applyBaseStyles: false` di `astro.config.mjs` agar tidak ada preflight ganda).
- **Three.js 0.160.0** — tiga kanvas WebGL: Hero Medusa, Jacket Showcase, Anatomi 3D.
- **Build:** `npm run build` → `dist/` (satu halaman `index`).
- **Deploy:** GitHub Pages via Actions (workflow `.github/workflows/deploy.yml`: push ke `main` → build → artifact `dist/`); situs disajikan dari subpath `/tj-factory-web/`, jadi `base` di `astro.config.mjs` = `'/tj-factory-web/'`.
- Rentang versi di `package.json`: `astro ^4.15.0`, `@astrojs/tailwind ^5.1.0`, `tailwindcss ^3.4.10`, `three ^0.160.0`.

## 2. Struktur folder

### `src/` (kode sumber)

- `components/` (10 komponen, urutan tampil sesuai `index.astro`): `FloatingNavbar`, `HeroMedusa`, `AboutWhyUs`, `JacketShowcase3D`, `AnatomyMouse3D`, `CatalogSection`, `WorkshopAndSocial`, `B2BFormSection`, `ProductDetailModal`, `Footer` (`Footer` di luar `<main>`).
- `pages/index.astro` — satu-satunya halaman. Tag `<main>` hanya ada di sini (satu buah, tidak boleh ada `<main>` di komponen lain).
- `data/products.js` — `verifiedProducts` (19 produk) + `partsData` (3 entri anatomi). **Satu-satunya sumber data produk.**
- `scripts/threeEngine.js` — `initHeroMedusa3D()`, `initJacketShowcase3D()`, `initAnatomi3D()`. `initThreeEngine()` diekspor tapi **tidak dipakai**.
- `scripts/uiController.js` — navbar, render katalog, search, filter, modal detail produk, marquee, form RFQ. File ini sudah lengkap; jangan ubah wiring-nya.
- `styles/global.css` — gaya global (URL hero marmer relatif, lihat bawah).
- `env.d.ts`.
- Konfigurasi root: `astro.config.mjs`, `tailwind.config.mjs`, `package.json`.
- `legacy-index.html` — backup situs lama, bukan bagian build.

### `public/` (29 file aset)

- `aset/` (20 file): model GLB (`baut_hexstar.glb`, `hero_3d_emblem.glb`), gambar hero/logo/tekstur, `hero_marble_bg.jpg`.
- `Material/` (8 file): `BAUT.png` + 7 file `.webp` (hex-star, mud-head-ninja).
- `!!!BEFORE&AFTER!!!/` (1 file): `before-design.mp4` (video).
- Path aset di kode memakai `./aset/...` dan sejenisnya; URL hero marmer di `global.css` memakai path relatif `aset/hero_marble_bg.webp` (bukan absolut) agar benar di subpath GitHub Pages `/tj-factory-web/` maupun preview lokal — karena CSS ter-inline ke dokumen, URL relatif di-resolve terhadap URL dokumen. Catatan: path relatif di sini dapat memunculkan warning build Vite, tetapi build tetap sukses dan URL hasil emit diverifikasi tidak diubah.

## 3. Aturan performa GPU Mobile (tidak boleh dilanggar)

- **Adaptive DPR** — `getOptimalDpr()` di `threeEngine.js`: mobile (lebar < 768px) maksimal **1.25**, desktop maksimal 2. Berlaku di semua renderer (hero, anatomi, jacket).
- **`loadSharedBoltGLB` singleton** — model GLB baut diunduh dan di-parse **sekali saja** (`cachedBoltGltfPromise`), dipakai bersama oleh hero, jacket, dan anatomi.
- **`IntersectionObserver` auto-pause** — Hero dan Jacket Showcase berhenti render saat di luar viewport (hero memakai guard `'IntersectionObserver' in window`).
- **Anatomi 3D: Render-on-Demand + per-context PMREM** — tidak ada idle loop; render hanya saat disentuh/drag. `roomEnv` dibuat sekali di luar loop; tiap renderer membuat `envTex` sendiri via `pmrem.fromScene(roomEnv)` + `pmrem.dispose()`. **Tekstur PMREM tidak boleh dishare antar konteks WebGL** (`sharedEnvTex` sudah dihapus).
- **Larangan `filter: drop-shadow` pada elemen `<canvas>`** — membebani GPU. Drop-shadow yang ada saat ini hanya pada elemen teks (judul gradient, judul/deskripsi jacket), bukan pada canvas, dan tidak boleh dipindah ke canvas.
- **Wiring init** — `index.astro` memanggil `initHeroMedusa3D()`, `initJacketShowcase3D()`, dan `initAnatomi3D()` secara langsung. **Jangan** memanggil `initThreeEngine()` dari `uiController.js` (double-init = 2 renderer/loop di kanvas yang sama = beban GPU ganda).

## 4. Aturan bisnis

- **Dilarang mengarang harga, nomor WA, atau klaim bisnis di luar data `src/data/products.js`.**
- Semua harga, nama produk, spesifikasi (drat, ukuran, tipe kepala, motor), dan deskripsi yang tampil di situs harus berasal dari `products.js`.
