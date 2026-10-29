import { verifiedProducts, DATA_DATE } from '../data/products.js';

    /* B6 SPEK PERFORMA: simpan state boolean — jangan toggle class tiap event. */
    const mainNavbar = document.getElementById('main-navbar');
    let navbarVisible = false;
    window.addEventListener('scroll', () => {
      if (!mainNavbar) return;
      const shouldShow = window.scrollY > window.innerHeight * 0.45;
      if (shouldShow === navbarVisible) return;
      navbarVisible = shouldShow;
      if (shouldShow) {
        mainNavbar.classList.remove('-translate-y-24', 'opacity-0', 'pointer-events-none');
        mainNavbar.classList.add('translate-y-0', 'opacity-100');
      } else {
        mainNavbar.classList.add('-translate-y-24', 'opacity-0', 'pointer-events-none');
        mainNavbar.classList.remove('translate-y-0', 'opacity-100');
      }
    }, { passive: true });

    /* -------------------------------------------------------------------------- */
    const catalogGrid = document.getElementById('catalog-grid');
    const searchInput = document.getElementById('catalog-search');

    function renderCatalog() {
      if (!catalogGrid) return;
      const query = (searchInput?.value || '').toLowerCase().trim();
      const filtered = verifiedProducts.filter(item => {
        return item.name.toLowerCase().includes(query) ||
          item.price.toLowerCase().includes(query);
      });

      if (filtered.length === 0) {
        catalogGrid.innerHTML = `
          <div class="col-span-full py-10 text-center border border-carbon-700 bg-carbon-900 rounded-xl font-mono text-xs text-slate-400">
            Produk tidak ditemukan.
          </div>
        `;
        return;
      }

      catalogGrid.innerHTML = filtered.map(item => `
        <article class="bg-carbon-900 border border-carbon-700 hover:border-industrial-yellow rounded-xl overflow-hidden transition-all flex flex-col justify-between group cursor-pointer" onclick="window.openProductDetail('${item.code}')">
          <div>
            <div class="relative aspect-[4/3] sm:aspect-[16/10] bg-carbon-950 overflow-hidden border-b border-carbon-800">
              <img
                src="${item.localImg}"
                width="800" height="600"
                onerror="this.onerror=null; this.src='${item.fallbackImg}';"
                alt="${item.name}"
                loading="lazy" decoding="async"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div class="p-3 sm:p-5">
              <h3 class="font-display font-bold text-sm sm:text-lg text-white group-hover:text-industrial-yellow transition-colors leading-snug line-clamp-2">
                ${item.name}
              </h3>
              <p class="font-mono font-bold text-industrial-yellow text-sm sm:text-base mt-2">
                ${item.price}
              </p>
              <p class="text-slate-400 text-[11px] sm:text-xs font-mono mt-1">
                ★ ${item.rating} · ${item.sold} terjual
              </p>
              <p class="text-slate-500 text-[10px] font-mono mt-1">
                data per ${DATA_DATE}
              </p>
            </div>
          </div>
          <div class="p-3 sm:p-5 pt-0 flex items-center gap-1.5 sm:gap-2.5">
            <button type="button" onclick="event.stopPropagation(); window.openProductDetail('${item.code}')" class="flex-1 py-2 px-2 rounded-lg bg-carbon-800 hover:bg-carbon-700 text-slate-200 border border-carbon-600 font-mono text-[10px] sm:text-xs uppercase text-center transition-all min-h-[44px] sm:min-h-0">
              Detail
            </button>
            <button type="button" onclick="event.stopPropagation(); window.selectProductForRFQ('${item.name.replace(/'/g, "\\'")}')" class="flex-1 py-2 px-2 rounded-lg bg-industrial-yellow hover:bg-industrial-amber text-carbon-950 font-mono text-[10px] sm:text-xs font-bold uppercase text-center transition-all min-h-[44px] sm:min-h-0">
              Minta Tawar
            </button>
          </div>
        </article>
      `).join('');
    }

    let currentModalProduct = null;
    let currentModalImageIndex = 0;

    window.openProductDetail = function (code) {
      const product = verifiedProducts.find(p => p.code === code);
      if (!product) return;
      currentModalProduct = product;
      currentModalImageIndex = 0;

      document.getElementById('modal-part-name').textContent = product.name;
      document.getElementById('modal-part-price').textContent = product.price;
      document.getElementById('modal-part-rating').textContent = product.rating;
      document.getElementById('modal-part-sold').textContent = product.sold + ' terjual';
      document.getElementById('modal-part-date').textContent = DATA_DATE;

      document.getElementById('modal-btn-shopee').href = product.shopeeUrl;
      document.getElementById('modal-btn-tokopedia').href = product.tokopediaUrl;

      updateModalImage();

      document.getElementById('product-detail-modal').classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    };

    window.closeProductDetail = function () {
      document.getElementById('product-detail-modal').classList.add('hidden');
      document.body.style.overflow = '';
    };

    function updateModalImage() {
      if (!currentModalProduct) return;
      const images = (currentModalProduct.images && currentModalProduct.images.length > 0)
        ? currentModalProduct.images
        : [currentModalProduct.localImg];

      currentModalImageIndex = (currentModalImageIndex + images.length) % images.length;
      const imgEl = document.getElementById('modal-product-img');
      imgEl.src = images[currentModalImageIndex];
      imgEl.onerror = function () {
        this.onerror = null;
        this.src = currentModalProduct.fallbackImg;
      };

      document.getElementById('modal-photo-counter').textContent = `${currentModalImageIndex + 1} / ${images.length} FOTO`;
      document.getElementById('modal-thumbnails-strip').innerHTML = images.map((_, idx) => `
        <button type="button" aria-label="Foto ${idx + 1}" class="w-2 h-2 rounded-full transition-all ${idx === currentModalImageIndex ? 'bg-industrial-yellow scale-125' : 'bg-carbon-700'}" onclick="window.changeModalImage(${idx})"></button>
      `).join('');
    }

    window.changeModalImage = function (index) {
      currentModalImageIndex = index;
      updateModalImage();
    };

    document.getElementById('modal-btn-prev-img')?.addEventListener('click', (e) => { e.stopPropagation(); currentModalImageIndex--; updateModalImage(); });
    document.getElementById('modal-btn-next-img')?.addEventListener('click', (e) => { e.stopPropagation(); currentModalImageIndex++; updateModalImage(); });
    document.getElementById('btn-close-modal')?.addEventListener('click', () => window.closeProductDetail());
    document.getElementById('product-detail-modal')?.addEventListener('click', (e) => { if (e.target.id === 'product-detail-modal') window.closeProductDetail(); });
    document.getElementById('modal-btn-rfq')?.addEventListener('click', () => {
      const pName = currentModalProduct ? currentModalProduct.name : '';
      window.closeProductDetail();
      window.selectProductForRFQ(pName);
    });

    /* CLEAN-05: tutup modal via tombol Escape (hanya bila modal sedang terbuka) */
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const modal = document.getElementById('product-detail-modal');
      if (modal && !modal.classList.contains('hidden')) window.closeProductDetail();
    });

    searchInput?.addEventListener('input', renderCatalog);
    renderCatalog();

    /* -------------------------------------------------------------------------- */
    /* 4. FORMULIR PENAWARAN B2B (AUTO-SELECT DROPDOWN)                           */
    /* -------------------------------------------------------------------------- */
    window.selectProductForRFQ = function (productName) {
      const selectEl = document.getElementById('rfq-product');
      if (!selectEl) return;
      let matched = false;
      /* CLEAN-07: exact match dulu, substring hanya sebagai fallback */
      for (let i = 0; i < selectEl.options.length; i++) {
        if (selectEl.options[i].value.toLowerCase() === productName.toLowerCase()) {
          selectEl.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched) {
        for (let i = 0; i < selectEl.options.length; i++) {
          if (productName.toLowerCase().includes(selectEl.options[i].value.toLowerCase())) {
            selectEl.selectedIndex = i;
            matched = true;
            break;
          }
        }
      }
      if (!matched) {
        selectEl.value = 'Pesanan Partai Campuran / Custom';
      }
      document.getElementById('permintaan-penawaran')?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => selectEl.focus(), 500);
    };

    document.getElementById('rfq-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('rfq-name').value.trim();
      const contact = document.getElementById('rfq-contact').value.trim();
      const qty = document.getElementById('rfq-qty').value.trim();
      const product = document.getElementById('rfq-product').value;
      const notes = document.getElementById('rfq-notes').value.trim() || '-';

      const msg =
        `Halo Admin TJ FACTORY,
Saya mengajukan Penawaran Grosir / B2B:

• Nama/Bengkel: ${name}
• Kontak WA: ${contact}
• Material/Paket: ${product}
• Jumlah: ${qty}
• Catatan: ${notes}

Mohon info ketersediaan & harga penawarannya.`;

      document.getElementById('rfq-preview-text').textContent = msg;
      document.getElementById('rfq-confirmation').classList.remove('hidden');
      /* WARN-02: klaim "tersalin" hanya bila writeText benar-benar resolve;
         di konteks non-aman (http via IP) clipboard ditolak — tampilkan instruksi salin manual. */
      const copyStatus = document.getElementById('rfq-copy-status');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(msg).then(() => {
          if (copyStatus) copyStatus.textContent = '✓ FORMAT PESANAN TERSALIN';
        }).catch(() => {
          if (copyStatus) copyStatus.textContent = '⚠ GAGAL MENYALIN OTOMATIS — SALIN MANUAL DARI PREVIEW DI BAWAH';
        });
      } else if (copyStatus) {
        copyStatus.textContent = '⚠ PERANGKAT INI TAK BISA MENYALIN OTOMATIS — SALIN MANUAL DARI PREVIEW DI BAWAH';
      }
    });

    document.getElementById('btn-copy-rfq')?.addEventListener('click', (e) => {
      const msg = document.getElementById('rfq-preview-text').textContent;
      const btn = e.target;
      if (!navigator.clipboard) { btn.textContent = 'Salin Manual'; return; }
      navigator.clipboard.writeText(msg).then(() => {
        btn.textContent = 'Tersalin!';
        setTimeout(() => { btn.textContent = 'Salin Ulang'; }, 2000);
      }).catch(() => { btn.textContent = 'Gagal — Salin Manual'; });
    });

    /* Marquee Top Picks */
    (function () {
      var track = document.querySelector('.toppicks-track');
      if (track && !track.dataset.dup) {
        track.dataset.dup = '1';
        track.innerHTML += track.innerHTML;
      }
    })();
