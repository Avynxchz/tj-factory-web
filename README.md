# TJ FACTORY — Website

Website company profile + katalog untuk **TJ FACTORY** (baut stainless CNC handmade "Probolt" untuk motor).

- **Live:** https://avynxchz.github.io/tj-factory-web/ (GitHub Pages, deploy otomatis dari branch `main`)
- **Stack:** HTML + Tailwind CSS (CDN) + Three.js (hero 3D)

## Alur kerja
- Kerja di branch `dev` → buka Pull Request → merge ke `main` → Pages auto-deploy (±1 menit).

## Aset yang belum ada (perlu upload owner)
File berikut direferensikan HTML tapi belum ada di repo — sudah ada fallback otomatis,
tapi tampilan penuh butuh file aslinya:
- `aset/hero_3d_emblem.glb` — model 3D hero (fallback: logo SVG)
- `aset/hero_marble_bg.jpg` — background hero (fallback: gradient CSS)
- `aset/about_hand_statue.jpg` — foto dokumentasi section Tentang
- `aset/logo.png` — diganti `aset/logo_contour.svg` untuk sementara
- `Material/*.webp` — foto produk, sementara pakai CDN Shopee langsung
- `!!!BEFORE&AFTER!!!/before-design.mp4` — video before/after (fallback: foto produk)

## Struktur
- `index.html` — halaman utama (hero, anatomi, katalog 19 produk, showcase, tentang, channel resmi, form penawaran)
- `card-3d.html` — eksperimen kartu 3D (standalone)
- `aset/logo_contour.svg` — logo vektor
