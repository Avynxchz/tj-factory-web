// Barrel (CLEAN-01): tiga scene kini tinggal di modulnya masing-masing;
// file ini hanya me-re-export agar import lama di index.astro tak berubah.
// initThreeEngine dihapus (CLEAN-02): tak ada pemakai, index.astro memanggil init per scene.
export { initHeroMedusa3D } from './three/hero.js';
export { initJacketShowcase3D } from './three/jacket.js';
export { initAnatomi3D } from './three/anatomy.js';
