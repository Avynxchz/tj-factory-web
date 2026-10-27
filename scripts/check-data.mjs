// CLEAN-07: jaring pengaman data katalog — gagalkan build/check bila data rusak.
// Dijalankan via `npm run check`. Tidak menyentuh file apa pun, hanya validasi.
import { verifiedProducts, partsData } from '../src/data/products.js';

const fail = [];
const ok = (cond, msg) => { if (!cond) fail.push(msg); };

const FIELDS = ['code', 'name', 'spec', 'category', 'localImg', 'fallbackImg',
  'material', 'headType', 'motor', 'desc', 'shopeeUrl', 'tiktokUrl', 'tokopediaUrl'];
const KNOWN_CATS = new Set(['NINJA', 'SPORT_2TAK', 'CVT_MATIC', 'BAUT_ECERAN', 'CNC_LASER']);

const codes = new Set();
for (const p of verifiedProducts) {
  for (const f of FIELDS) if (p[f] === undefined || p[f] === '' || p[f] === null) fail.push(`${p.code || '?'}: field ${f} kosong`);
  if (codes.has(p.code)) fail.push(`kode duplikat: ${p.code}`);
  codes.add(p.code);
  if (!KNOWN_CATS.has(p.category)) fail.push(`${p.code}: kategori tak dikenal (${p.category})`);
  if (p.images && !Array.isArray(p.images)) fail.push(`${p.code}: images bukan array`);
}
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
