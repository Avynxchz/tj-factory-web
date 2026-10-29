// Jaring pengaman data katalog — gagalkan build/check bila data rusak.
// Dijalankan via `npm run check`. Tidak menyentuh file apa pun, hanya validasi.
import { verifiedProducts, partsData, DATA_DATE } from '../src/data/products.js';

const fail = [];
const ok = (cond, msg) => { if (!cond) fail.push(msg); };

// Skema katalog asli (10 produk, data per 29 Okt 2026): tanpa kode produk tampil,
// tanpa kategori lama, tanpa detail varian/material — hanya yang tampil di kartu.
const FIELDS = ['code', 'name', 'category', 'price', 'rating', 'sold',
  'localImg', 'fallbackImg', 'images', 'shopeeUrl', 'tokopediaUrl'];
const KNOWN_CATS = new Set(['BAUT_CNC']);

const codes = new Set();
for (const p of verifiedProducts) {
  for (const f of FIELDS) if (p[f] === undefined || p[f] === '' || p[f] === null) fail.push(`${p.code || '?'}: field ${f} kosong`);
  if (codes.has(p.code)) fail.push(`kode duplikat: ${p.code}`);
  codes.add(p.code);
  if (!KNOWN_CATS.has(p.category)) fail.push(`${p.code}: kategori tak dikenal (${p.category})`);
  if (!Array.isArray(p.images) || p.images.length === 0) fail.push(`${p.code}: images kosong/bukan array`);
  if (p.localImg !== p.images[0]) fail.push(`${p.code}: localImg bukan foto pertama`);
}
ok(verifiedProducts.length === 10, `katalog harus 10 produk, ketemu ${verifiedProducts.length}`);
ok(!!DATA_DATE, 'DATA_DATE kosong');
for (const d of partsData) {
  for (const f of ['counter', 'titleHtml', 'plainTitle', 'desc', 'grade', 'badge']) {
    if (!d[f]) fail.push(`partsData: field ${f} kosong`);
  }
}
ok(partsData.length === 3, `partsData harus 3 entri, ketemu ${partsData.length}`);

if (fail.length > 0) {
  console.error('check-data GAGAL:');
  for (const m of fail) console.error(' - ' + m);
  process.exit(1);
}
console.log(`check-data OK: ${verifiedProducts.length} produk, ${partsData.length} jacket parts, 0 field hilang, 0 kode duplikat.`);
