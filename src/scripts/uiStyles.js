// Konstanta gaya tombol bersama (refactor): satu sumber kebenaran untuk class
// yang dipakai di markup Astro DAN di handler JS. Sebelumnya string yang sama
// tertulis dua kali (di .astro dan di .js) sehingga mudah basi sebagian —
// buktinya varian JS kehilangan min-h/min-w 44px (target sentuh HP).
// Nilai string di sini = nilai markup awal (yang sudah di-ACC); varian JS
// yang tadinya kehilangan min-h/min-w kini ikut nilai ini.
export const FILTER_ACTIVE = 'cat-btn shrink-0 px-4 py-2 rounded-full text-xs font-mono uppercase bg-industrial-yellow text-carbon-950 font-bold transition-all min-h-[44px] sm:min-h-0';
export const FILTER_INACTIVE = 'cat-btn shrink-0 px-4 py-2 rounded-full text-xs font-mono uppercase bg-carbon-900 text-slate-300 border border-carbon-700 hover:border-industrial-yellow transition-all min-h-[44px] sm:min-h-0';
export const THREAD_ACTIVE = 'thread-circle w-10 h-10 rounded-full bg-industrial-yellow/10 text-industrial-yellow border-2 border-industrial-yellow font-mono font-bold text-xs flex items-center justify-center shadow-[0_0_20px_rgba(245,183,0,0.22)] transition-all min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0';
export const THREAD_INACTIVE = 'thread-circle w-10 h-10 rounded-full bg-white/[0.02] hover:border-white/40 text-slate-400 hover:text-white border border-white/15 font-mono font-bold text-xs flex items-center justify-center transition-all min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0';
export const LOCK_ACTIVE = 'px-3 py-1.5 rounded-full bg-industrial-yellow/15 border border-industrial-yellow text-industrial-yellow font-mono font-bold text-[11px] uppercase tracking-[0.15em] transition-all flex items-center gap-1.5 min-h-[44px] sm:min-h-0';
export const LOCK_INACTIVE = 'px-2 py-2 text-slate-300 hover:text-industrial-yellow font-mono text-[11px] uppercase tracking-[0.15em] transition-all flex items-center gap-1.5 min-h-[44px] sm:min-h-0';
