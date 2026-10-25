import { verifiedProducts } from '../data/products.js';

    const mainNavbar = document.getElementById('main-navbar');
    window.addEventListener('scroll', () => {
      if (!mainNavbar) return;
      if (window.scrollY > window.innerHeight * 0.45) {
        mainNavbar.classList.remove('-translate-y-24', 'opacity-0', 'pointer-events-none');
        mainNavbar.classList.add('translate-y-0', 'opacity-100');
      } else {
        mainNavbar.classList.add('-translate-y-24', 'opacity-0', 'pointer-events-none');
        mainNavbar.classList.remove('translate-y-0', 'opacity-100');
      }
    });

    /* -------------------------------------------------------------------------- */
    const catalogGrid = document.getElementById('catalog-grid');
    const searchInput = document.getElementById('catalog-search');
    const filterButtons = document.querySelectorAll('.cat-btn');
    let activeCategory = 'ALL';

    function renderCatalog() {
      if (!catalogGrid) return;
      const query = (searchInput?.value || '').toLowerCase().trim();
      const filtered = verifiedProducts.filter(item => {
        const matchCat = activeCategory === 'ALL' || item.category === activeCategory;
        const matchText = item.name.toLowerCase().includes(query) ||
          item.spec.toLowerCase().includes(query) ||
          item.code.toLowerCase().includes(query);
        return matchCat && matchText;
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
                onerror="this.onerror=null; this.src='${item.fallbackImg}';"
                alt="${item.name}"
                loading="lazy"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span class="absolute top-2 left-2 px-2 py-0.5 rounded bg-carbon-950/90 border border-carbon-600 font-mono text-[9px] sm:text-[10px] text-industrial-yellow">
                ${item.code}
              </span>
            </div>
            <div class="p-3 sm:p-5">
              <h3 class="font-display font-bold text-sm sm:text-lg text-white group-hover:text-industrial-yellow transition-colors leading-snug line-clamp-2">
                ${item.name}
              </h3>
              <p class="text-slate-400 text-[11px] sm:text-xs font-mono mt-1 line-clamp-2">
                ${item.spec}
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

      document.getElementById('modal-part-code').textContent = product.code;
      document.getElementById('modal-part-cat').textContent = product.category;
      document.getElementById('modal-part-name').textContent = product.name;
      document.getElementById('modal-part-mat').textContent = product.material;
      document.getElementById('modal-part-head').textContent = product.headType;
      document.getElementById('modal-part-motor').textContent = product.motor;
      document.getElementById('modal-part-desc').textContent = product.desc;

      document.getElementById('modal-btn-shopee').href = product.shopeeUrl;
      document.getElementById('modal-btn-tiktok').href = product.tiktokUrl;
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
        <button type="button" class="w-2 h-2 rounded-full transition-all ${idx === currentModalImageIndex ? 'bg-industrial-yellow scale-125' : 'bg-carbon-700'}" onclick="window.changeModalImage(${idx})"></button>
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

    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.cat;
        filterButtons.forEach(b => {
          b.className = 'cat-btn shrink-0 px-4 py-2 rounded-full text-xs font-mono uppercase bg-carbon-900 text-slate-300 border border-carbon-700 hover:border-industrial-yellow transition-all min-h-[44px] sm:min-h-0';
        });
        btn.className = 'cat-btn shrink-0 px-4 py-2 rounded-full text-xs font-mono uppercase bg-industrial-yellow text-carbon-950 font-bold transition-all min-h-[44px] sm:min-h-0';
        renderCatalog();
      });
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
      navigator.clipboard?.writeText(msg).catch(() => { /* abaikan: preview tetap tampil tanpa clipboard */ });
    });

    document.getElementById('btn-copy-rfq')?.addEventListener('click', (e) => {
      const msg = document.getElementById('rfq-preview-text').textContent;
      navigator.clipboard?.writeText(msg).catch(() => { /* abaikan: preview tetap tampil tanpa clipboard */ });
      e.target.textContent = 'Tersalin!';
      setTimeout(() => { e.target.textContent = 'Salin Ulang'; }, 2000);
    });

    /* Marquee Top Picks */
    (function () {
      var track = document.querySelector('.toppicks-track');
      if (track && !track.dataset.dup) {
        track.dataset.dup = '1';
        track.innerHTML += track.innerHTML;
      }
    })();
