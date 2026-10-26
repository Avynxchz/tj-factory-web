// Helper lifecycle visibilitas 3D (spek performa): lazy-init saat mendekat,
// loop benar-benar berhenti saat tidak terlihat / tab hidden, resize di-debounce.
// Tidak ada dependensi Three.js di file ini.

/**
 * Panggil cb SATU KALI saat el pertama kali masuk (atau mendekati) viewport,
 * lalu observer dilepas. Bila IntersectionObserver tidak tersedia atau el
 * tidak ada, cb dipanggil langsung (fallback aman, bukan diam-diam gagal).
 */
export function whenNear(el, cb, marginPx = 0) {
  if (!el || typeof cb !== 'function') return;
  if (!('IntersectionObserver' in window)) {
    cb();
    return;
  }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect();
      cb();
    }
  }, { rootMargin: `${marginPx}px`, threshold: 0 });
  io.observe(el);
}

/**
 * Menjalankan tick() dalam satu loop requestAnimationFrame yang HANYA hidup
 * saat el terlihat DAN dokumen tidak hidden. Saat tidak terlihat / tab hidden,
 * loop dibatalkan dengan cancelAnimationFrame (bukan sekadar return di dalam
 * tick). Saat terlihat kembali, SATU loop dilanjutkan (tidak ada duplikasi
 * RAF). tick() sendiri TIDAK BOLEH memanggil requestAnimationFrame.
 * Mengembalikan { stop } untuk penghentian manual bila diperlukan.
 */
export function gateLoop(el, tick, marginPx = 0) {
  let rafId = 0;
  let running = false;
  let visible = false;

  function frame() {
    rafId = 0;
    if (!running) return;
    tick();
    if (running) rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running || !visible || document.hidden) return;
    running = true;
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function update() {
    if (visible && !document.hidden) start();
    else stop();
  }

  if (el && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      update();
    }, { rootMargin: `${marginPx}px`, threshold: 0 });
    io.observe(el);
  } else {
    // Tanpa observer: anggap terlihat agar scene tetap jalan (fallback aman).
    visible = true;
    update();
  }

  document.addEventListener('visibilitychange', update);

  return { stop };
}

/**
 * Mengembalikan versi debounce (trailing edge) dari fn. Tiap fungsi hasil
 * punya timer sendiri, jadi aman dipakai satu per canvas/renderer.
 */
export function onResizeDebounced(fn, ms = 150) {
  let timer = 0;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = 0;
      fn(...args);
    }, ms);
  };
}
