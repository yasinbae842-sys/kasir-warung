/* =========================================================
   Kasir Warung - script.js
   JavaScript murni (tanpa framework). Data disimpan di LocalStorage.
   Urutan isi file:
   1. Konstanta   2. State   3. Helper   4. Penyimpanan
   5. Navigasi & modal   6. Dashboard   7. Produk   8. Kasir & keranjang
   9. Pembayaran   10. Struk   11. Riwayat   12. Pengaturan   13. Mulai
   ========================================================= */
'use strict';

/* ---------- 1. KONSTANTA ---------- */
const KEYS = {
  products: 'kw_products',
  transactions: 'kw_transactions',
  settings: 'kw_settings',
  counter: 'kw_counter'
};

const LOW_STOCK_LIMIT = 5;   // stok <= angka ini dianggap "hampir habis"
const MAX_PAY_DIGITS = 9;    // batas digit uang pelanggan

const DEFAULT_SETTINGS = { name: 'Warung Saya', address: '', phone: '', cashier: '' };

// Contoh produk, hanya dibuat saat aplikasi dibuka pertama kali
const SAMPLE_PRODUCTS = [
  { id: 'P001', name: 'Indomie Goreng', price: 3500, stock: 20, category: 'Makanan' },
  { id: 'P002', name: 'Teh Botol', price: 5000, stock: 24, category: 'Minuman' },
  { id: 'P003', name: 'Air Mineral 600ml', price: 3000, stock: 30, category: 'Minuman' },
  { id: 'P004', name: 'Kopi Sachet', price: 2000, stock: 50, category: 'Minuman' },
  { id: 'P005', name: 'Gula 1 kg', price: 16000, stock: 8, category: 'Sembako' },
  { id: 'P006', name: 'Telur (per butir)', price: 2500, stock: 3, category: 'Sembako' }
];

/* ---------- 2. STATE (data yang sedang dipakai) ---------- */
const state = {
  products: [],
  transactions: [],
  settings: { ...DEFAULT_SETTINGS },
  cart: [],                 // [{ id, qty }]
  paid: 0,                  // uang pelanggan
  view: 'dashboard',
  kasirCategory: 'Semua',
  produkCategory: 'Semua',
  editingId: null,          // null = tambah produk baru
  receiptTx: null,          // transaksi yang sedang ditampilkan di struk
  receiptIsNew: false
};

/* ---------- 3. HELPER ---------- */
const $ = (id) => document.getElementById(id);

// 15000 -> "Rp15.000"
function rupiah(n) {
  return 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');
}

// Mencegah teks buatan pengguna merusak tampilan HTML
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Tanggal lokal "2026-10-05" (dipakai untuk membandingkan "hari ini")
function dateKey(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

let toastTimer = null;
function showToast(message) {
  const el = $('toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

/* ---------- 4. PENYIMPANAN (LocalStorage) ---------- */
function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    showToast('Gagal menyimpan data. Penyimpanan penuh atau diblokir.');
    return false;
  }
}

function loadAll() {
  const products = loadData(KEYS.products, null);
  if (Array.isArray(products)) {
    state.products = products;
  } else {
    // Pertama kali dibuka: isi dengan contoh produk
    state.products = SAMPLE_PRODUCTS.map((p) => ({ ...p }));
    saveData(KEYS.products, state.products);
  }

  const transactions = loadData(KEYS.transactions, []);
  state.transactions = Array.isArray(transactions) ? transactions : [];

  const settings = loadData(KEYS.settings, {});
  state.settings = { ...DEFAULT_SETTINGS, ...(settings && typeof settings === 'object' ? settings : {}) };
}

/* ---------- 5. NAVIGASI & MODAL ---------- */
function showView(name) {
  state.view = name;

  document.querySelectorAll('.view').forEach((section) => {
    section.hidden = section.id !== 'view-' + name;
  });
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    const active = btn.dataset.view === name;
    btn.classList.toggle('active', active);
    if (active) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });

  if (name === 'pengaturan') renderSettings();
  renderAll();
  window.scrollTo(0, 0);
}

function openModal(id) {
  $(id).hidden = false;
  document.body.classList.add('modal-open');
}

function closeModal(id) {
  $(id).hidden = true;
  const anyOpen = document.querySelector('.modal:not([hidden])');
  if (!anyOpen) document.body.classList.remove('modal-open');
}

/* ---------- 6. DASHBOARD ---------- */
function updateClock() {
  const now = new Date();
  $('dashDate').textContent = now.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  $('dashTime').textContent = now
    .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .replace(/\./g, ':');
}

function renderDashboard() {
  const today = dateKey(new Date());
  const todays = state.transactions.filter((t) => dateKey(new Date(t.time)) === today);
  const income = todays.reduce((sum, t) => sum + t.total, 0);

  $('statCount').textContent = todays.length;
  $('statIncome').textContent = rupiah(income);

  const low = state.products.filter((p) => p.stock <= LOW_STOCK_LIMIT);
  const alertBox = $('dashLowStock');
  if (low.length > 0) {
    const names = low.slice(0, 3).map((p) => p.name).join(', ');
    const more = low.length > 3 ? ` dan ${low.length - 3} lainnya` : '';
    alertBox.textContent = `⚠️ ${low.length} produk stok hampir habis atau habis: ${names}${more}.`;
    alertBox.hidden = false;
  } else {
    alertBox.hidden = true;
  }
}

/* ---------- 7. PRODUK ---------- */
function getProduct(id) {
  return state.products.find((p) => p.id === id);
}

function nextProductId() {
  const max = state.products.reduce((highest, p) => {
    const n = parseInt(String(p.id).replace(/\D/g, ''), 10);
    return Number.isFinite(n) && n > highest ? n : highest;
  }, 0);
  return 'P' + String(max + 1).padStart(3, '0');
}

function getCategories() {
  return [...new Set(state.products.map((p) => p.category))].sort((a, b) => a.localeCompare(b, 'id'));
}

function stockStatus(p) {
  if (p.stock <= 0) return { cls: 'out', text: 'Habis' };
  if (p.stock <= LOW_STOCK_LIMIT) return { cls: 'low', text: 'Hampir habis' };
  return { cls: 'ok', text: 'Tersedia' };
}

function filterProducts(query, category) {
  const q = query.trim().toLowerCase();
  return state.products
    .filter((p) => category === 'Semua' || p.category === category)
    .filter((p) => !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, 'id'));
}

function renderChips(containerId, selected) {
  const all = ['Semua', ...getCategories()];
  $(containerId).innerHTML = all
    .map((c) => `<button type="button" class="chip${c === selected ? ' active' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`)
    .join('');
}

// Jika kategori yang dipilih sudah tidak ada, kembali ke "Semua"
function validCategory(selected) {
  return selected === 'Semua' || getCategories().includes(selected) ? selected : 'Semua';
}

function renderProduk() {
  state.produkCategory = validCategory(state.produkCategory);
  renderChips('produkChips', state.produkCategory);

  const list = filterProducts($('produkSearch').value, state.produkCategory);
  if (list.length === 0) {
    $('produkList').innerHTML = '<p class="empty">Belum ada produk yang cocok.</p>';
    return;
  }

  $('produkList').innerHTML = list.map((p) => {
    const s = stockStatus(p);
    return `
      <article class="card product">
        <div class="product-main">
          <h3>${escapeHtml(p.name)}</h3>
          <p class="muted small">${escapeHtml(p.id)} · ${escapeHtml(p.category)}</p>
          <p class="price">${rupiah(p.price)}</p>
          <p><span class="badge badge-${s.cls}">${s.text}</span><span class="stock-num">Stok: ${p.stock}</span></p>
        </div>
        <div class="product-actions">
          <button type="button" class="btn btn-sm" data-act="edit" data-id="${escapeHtml(p.id)}">Edit</button>
          <button type="button" class="btn btn-sm btn-danger-outline" data-act="delete" data-id="${escapeHtml(p.id)}">Hapus</button>
        </div>
      </article>`;
  }).join('');
}

function openProductModal(id) {
  state.editingId = id || null;
  const p = id ? getProduct(id) : null;

  $('productTitle').textContent = p ? 'Edit Produk' : 'Tambah Produk';
  $('pIdText').textContent = p ? p.id : nextProductId();
  $('pName').value = p ? p.name : '';
  $('pPrice').value = p ? p.price : '';
  $('pStock').value = p ? p.stock : '';
  $('pCategory').value = p ? p.category : '';
  $('productError').hidden = true;

  // Saran kategori yang sudah ada
  $('categoryList').innerHTML = getCategories().map((c) => `<option value="${escapeHtml(c)}"></option>`).join('');

  openModal('productModal');
}

function saveProduct(event) {
  event.preventDefault();

  const name = $('pName').value.trim();
  const priceText = $('pPrice').value.trim();
  const stockText = $('pStock').value.trim();
  const category = $('pCategory').value.trim() || 'Umum';
  const price = Number(priceText);
  const stock = Number(stockText);

  // Validasi
  let error = '';
  if (!name) error = 'Nama produk tidak boleh kosong.';
  else if (priceText === '' || !Number.isFinite(price)) error = 'Harga harus diisi dengan angka.';
  else if (price < 0) error = 'Harga tidak boleh negatif.';
  else if (!Number.isInteger(price)) error = 'Harga harus berupa bilangan bulat.';
  else if (stockText === '' || !Number.isFinite(stock)) error = 'Stok harus diisi dengan angka.';
  else if (stock < 0) error = 'Stok tidak boleh negatif.';
  else if (!Number.isInteger(stock)) error = 'Stok harus berupa bilangan bulat.';

  if (error) {
    $('productError').textContent = error;
    $('productError').hidden = false;
    return;
  }

  if (state.editingId) {
    const p = getProduct(state.editingId);
    p.name = name;
    p.price = price;
    p.stock = stock;
    p.category = category;
  } else {
    state.products.push({ id: nextProductId(), name, price, stock, category });
  }

  saveData(KEYS.products, state.products);
  cleanCart();
  closeModal('productModal');
  renderAll();
  showToast(state.editingId ? 'Produk diperbarui' : 'Produk ditambahkan');
}

function deleteProduct(id) {
  const p = getProduct(id);
  if (!p) return;
  if (!confirm(`Hapus produk "${p.name}"?`)) return;

  state.products = state.products.filter((item) => item.id !== id);
  saveData(KEYS.products, state.products);
  cleanCart();
  renderAll();
  showToast('Produk dihapus');
}

/* ---------- 8. KASIR & KERANJANG ---------- */
function cartQtyOf(id) {
  const item = state.cart.find((i) => i.id === id);
  return item ? item.qty : 0;
}

// Buang produk yang sudah dihapus dan sesuaikan jumlah dengan stok terbaru
function cleanCart() {
  state.cart = state.cart
    .filter((item) => getProduct(item.id))
    .map((item) => ({ id: item.id, qty: Math.min(item.qty, getProduct(item.id).stock) }))
    .filter((item) => item.qty > 0);
}

// Daftar baris keranjang lengkap dengan data produk
function cartLines() {
  return state.cart.map((item) => {
    const product = getProduct(item.id);
    return { product, qty: item.qty, subtotal: product.price * item.qty };
  });
}

function cartTotals() {
  const lines = cartLines();
  return {
    qty: lines.reduce((sum, l) => sum + l.qty, 0),
    total: lines.reduce((sum, l) => sum + l.subtotal, 0)
  };
}

function addToCart(id) {
  const product = getProduct(id);
  if (!product) return;

  const qty = cartQtyOf(id);
  if (qty + 1 > product.stock) {
    showToast(product.stock <= 0 ? `Stok ${product.name} habis` : `Stok ${product.name} hanya ${product.stock}`);
    return;
  }

  if (qty === 0) state.cart.push({ id, qty: 1 });
  else state.cart.find((i) => i.id === id).qty += 1;
  renderCartViews();
}

function changeQty(id, delta) {
  const item = state.cart.find((i) => i.id === id);
  const product = getProduct(id);
  if (!item || !product) return;

  const newQty = item.qty + delta;
  if (newQty < 1) return; // untuk menghapus, gunakan tombol Hapus
  if (newQty > product.stock) {
    showToast(`Stok ${product.name} hanya ${product.stock}`);
    return;
  }
  item.qty = newQty;
  renderCartViews();
}

function removeFromCart(id) {
  state.cart = state.cart.filter((i) => i.id !== id);
  renderCartViews();
}

function renderKasir() {
  state.kasirCategory = validCategory(state.kasirCategory);
  renderChips('kasirChips', state.kasirCategory);

  const list = filterProducts($('kasirSearch').value, state.kasirCategory);
  if (list.length === 0) {
    $('kasirList').innerHTML = '<p class="empty">Produk tidak ditemukan. Tambahkan produk di menu Produk.</p>';
    return;
  }

  $('kasirList').innerHTML = list.map((p) => {
    const s = stockStatus(p);
    const inCart = cartQtyOf(p.id);
    const maxed = p.stock <= 0 || inCart >= p.stock;
    const label = p.stock <= 0 ? 'Stok habis' : inCart >= p.stock ? 'Maksimal stok' : 'Tambah ke Keranjang';
    return `
      <article class="card product">
        <div class="product-main">
          <h3>${escapeHtml(p.name)}</h3>
          <p class="price">${rupiah(p.price)}</p>
          <p><span class="badge badge-${s.cls}">${s.text}</span><span class="stock-num">Stok: ${p.stock}</span>
          ${inCart > 0 ? `<span class="stock-num">· Di keranjang: ${inCart}</span>` : ''}</p>
        </div>
        <div class="product-actions wide">
          <button type="button" class="btn btn-primary" data-act="add" data-id="${escapeHtml(p.id)}" ${maxed ? 'disabled' : ''}>${label}</button>
        </div>
      </article>`;
  }).join('');
}

function renderCartBar() {
  const { qty, total } = cartTotals();
  const show = state.view === 'kasir' && qty > 0;
  $('cartBar').hidden = !show;
  document.body.classList.toggle('has-cartbar', show);
  $('cartBarCount').textContent = qty;
  $('cartBarTotal').textContent = rupiah(total);
}

function renderCartSheet() {
  const lines = cartLines();
  const { qty, total } = cartTotals();

  if (lines.length === 0) {
    $('cartItems').innerHTML = '<p class="cart-empty">Keranjang masih kosong.</p>';
  } else {
    $('cartItems').innerHTML = lines.map((l) => `
      <div class="cart-item">
        <div class="cart-item-top">
          <span class="cart-item-name">${escapeHtml(l.product.name)}</span>
          <strong>${rupiah(l.subtotal)}</strong>
        </div>
        <div class="muted small">${rupiah(l.product.price)} per item · stok ${l.product.stock}</div>
        <div class="cart-item-bottom">
          <div class="qty">
            <button type="button" data-act="dec" data-id="${escapeHtml(l.product.id)}" aria-label="Kurangi">−</button>
            <span>${l.qty}</span>
            <button type="button" data-act="inc" data-id="${escapeHtml(l.product.id)}" aria-label="Tambah">+</button>
          </div>
          <button type="button" class="btn btn-sm btn-danger-outline" data-act="remove" data-id="${escapeHtml(l.product.id)}">Hapus</button>
        </div>
      </div>`).join('');
  }

  $('cartQty').textContent = qty;
  $('cartTotal').textContent = rupiah(total);
  updatePayInfo();
}

// Perbarui semua tampilan yang bergantung pada isi keranjang
function renderCartViews() {
  renderKasir();
  renderCartBar();
  renderCartSheet();
}

/* ---------- 9. PEMBAYARAN ---------- */
function setPaid(amount) {
  state.paid = amount;
  $('payInput').value = amount > 0 ? amount.toLocaleString('id-ID') : '';
  updatePayInfo();
}

function updatePayInfo() {
  const { total } = cartTotals();
  const box = $('payInfo');
  box.className = 'pay-info';

  if (state.cart.length === 0) {
    box.textContent = '';
    return;
  }
  if (state.paid <= 0) {
    box.textContent = 'Masukkan uang pelanggan';
  } else if (state.paid < total) {
    box.textContent = `⚠️ Uang kurang ${rupiah(total - state.paid)}`;
    box.classList.add('warn');
  } else {
    box.textContent = `Kembalian: ${rupiah(state.paid - total)}`;
    box.classList.add('ok');
  }
}

// Nomor transaksi: TRX-20261005-001 (urutan naik setiap hari)
function nextTransactionNumber(date) {
  const day = dateKey(date).replace(/-/g, '');
  let counter = loadData(KEYS.counter, null);
  if (!counter || counter.date !== day || !Number.isFinite(counter.seq)) {
    counter = { date: day, seq: 0 };
  }
  counter.seq += 1;
  saveData(KEYS.counter, counter);
  return `TRX-${day}-${String(counter.seq).padStart(3, '0')}`;
}

function checkout() {
  // Validasi: keranjang tidak boleh kosong
  if (state.cart.length === 0) {
    showToast('Keranjang masih kosong');
    return;
  }

  // Validasi: stok harus cukup (dicek ulang saat membayar)
  const items = [];
  for (const entry of state.cart) {
    const p = getProduct(entry.id);
    if (!p) {
      showToast('Ada produk yang sudah dihapus. Periksa keranjang.');
      cleanCart();
      renderCartViews();
      return;
    }
    if (entry.qty > p.stock) {
      showToast(`Stok ${p.name} tidak cukup (sisa ${p.stock})`);
      return;
    }
    items.push({ id: p.id, name: p.name, price: p.price, qty: entry.qty, subtotal: p.price * entry.qty });
  }

  const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
  const total = items.reduce((sum, i) => sum + i.subtotal, 0);

  // Validasi: pembayaran tidak boleh kurang dari total
  if (state.paid < total) {
    showToast(`Uang pelanggan kurang ${rupiah(total - state.paid)}`);
    updatePayInfo();
    return;
  }

  const now = new Date();
  const tx = {
    no: nextTransactionNumber(now),
    time: now.toISOString(),
    items,
    totalQty,
    total,
    paid: state.paid,
    change: state.paid - total,
    shop: { ...state.settings }   // disimpan agar struk lama tidak berubah
  };

  // Kurangi stok otomatis
  items.forEach((i) => { getProduct(i.id).stock -= i.qty; });

  state.transactions.unshift(tx);
  saveData(KEYS.products, state.products);
  saveData(KEYS.transactions, state.transactions);

  // Kosongkan keranjang & pembayaran
  state.cart = [];
  setPaid(0);
  closeModal('cartModal');
  renderAll();
  showReceipt(tx, true);
}

/* ---------- 10. STRUK ---------- */
function receiptHtml(tx) {
  const shop = tx.shop || {};
  const items = tx.items.map((i) => `
    <div class="r-item">
      <div class="r-name">${escapeHtml(i.name)}</div>
      <div class="r-line"><span>${i.qty} x ${rupiah(i.price)}</span><span>${rupiah(i.subtotal)}</span></div>
    </div>`).join('');

  return `
    <div class="r-center">
      <div class="r-shop">${escapeHtml(shop.name || 'Warung')}</div>
      ${shop.address ? `<div>${escapeHtml(shop.address)}</div>` : ''}
      ${shop.phone ? `<div>Telp: ${escapeHtml(shop.phone)}</div>` : ''}
    </div>
    <div class="r-sep"></div>
    <div class="r-line"><span>No</span><span>${escapeHtml(tx.no)}</span></div>
    <div class="r-line"><span>Waktu</span><span>${escapeHtml(formatDateTime(tx.time))}</span></div>
    ${shop.cashier ? `<div class="r-line"><span>Kasir</span><span>${escapeHtml(shop.cashier)}</span></div>` : ''}
    <div class="r-sep"></div>
    ${items}
    <div class="r-sep"></div>
    <div class="r-line"><span>Total barang</span><span>${tx.totalQty}</span></div>
    <div class="r-line r-total"><span>TOTAL</span><span>${rupiah(tx.total)}</span></div>
    <div class="r-line"><span>Bayar</span><span>${rupiah(tx.paid)}</span></div>
    <div class="r-line"><span>Kembalian</span><span>${rupiah(tx.change)}</span></div>
    <div class="r-sep"></div>
    <div class="r-center">Terima kasih sudah berbelanja!</div>`;
}

// Versi teks polos untuk dibagikan (WhatsApp, dll)
function receiptText(tx) {
  const shop = tx.shop || {};
  const line = '--------------------------------';
  const rows = [shop.name || 'Warung'];
  if (shop.address) rows.push(shop.address);
  if (shop.phone) rows.push('Telp: ' + shop.phone);
  rows.push(line, 'No    : ' + tx.no, 'Waktu : ' + formatDateTime(tx.time));
  if (shop.cashier) rows.push('Kasir : ' + shop.cashier);
  rows.push(line);
  tx.items.forEach((i) => {
    rows.push(i.name, `  ${i.qty} x ${rupiah(i.price)} = ${rupiah(i.subtotal)}`);
  });
  rows.push(
    line,
    'Total barang : ' + tx.totalQty,
    'TOTAL        : ' + rupiah(tx.total),
    'Bayar        : ' + rupiah(tx.paid),
    'Kembalian    : ' + rupiah(tx.change),
    '',
    'Terima kasih sudah berbelanja!'
  );
  return rows.join('\n');
}

function showReceipt(tx, isNew) {
  state.receiptTx = tx;
  state.receiptIsNew = isNew;
  $('receipt').innerHTML = receiptHtml(tx);
  $('receiptTitle').textContent = isNew ? 'Pembayaran Berhasil' : 'Detail Transaksi';
  $('newTrxBtn').textContent = isNew ? 'Transaksi baru' : 'Tutup';
  openModal('receiptModal');
}

async function shareReceipt() {
  const tx = state.receiptTx;
  if (!tx) return;
  const text = receiptText(tx);

  // Menu bagikan bawaan HP (butuh HTTPS atau localhost)
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Struk ' + tx.no, text });
    } catch (e) {
      /* pengguna membatalkan, tidak perlu pesan */
    }
    return;
  }
  // Cadangan: buka WhatsApp dengan teks struk
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}

/* ---------- 11. RIWAYAT ---------- */
function renderRiwayat() {
  const q = $('histSearch').value.trim().toLowerCase();
  const list = state.transactions.filter((t) => {
    if (!q) return true;
    return t.no.toLowerCase().includes(q)
      || formatDateTime(t.time).toLowerCase().includes(q)
      || t.items.some((i) => i.name.toLowerCase().includes(q));
  });

  $('histIncome').textContent = rupiah(list.reduce((sum, t) => sum + t.total, 0));
  $('histCount').textContent = list.length;
  $('clearHistoryBtn').hidden = state.transactions.length === 0;

  if (list.length === 0) {
    $('histList').innerHTML = '<p class="empty">Belum ada transaksi.</p>';
    return;
  }

  $('histList').innerHTML = list.map((t) => `
    <article class="card">
      <div class="trx-top">
        <div>
          <strong>${escapeHtml(t.no)}</strong>
          <div class="muted small">${escapeHtml(formatDateTime(t.time))} · ${t.totalQty} barang</div>
        </div>
        <strong>${rupiah(t.total)}</strong>
      </div>
      <div class="trx-actions">
        <button type="button" class="btn btn-sm" data-act="detail" data-no="${escapeHtml(t.no)}">Lihat Detail</button>
        <button type="button" class="btn btn-sm btn-danger-outline" data-act="delete" data-no="${escapeHtml(t.no)}">Hapus</button>
      </div>
    </article>`).join('');
}

function deleteTransaction(no) {
  if (!confirm(`Hapus transaksi ${no}?\nStok barang tidak dikembalikan.`)) return;
  state.transactions = state.transactions.filter((t) => t.no !== no);
  saveData(KEYS.transactions, state.transactions);
  renderAll();
  showToast('Transaksi dihapus');
}

function clearHistory() {
  if (!confirm('Hapus SEMUA riwayat transaksi?\nStok barang tidak dikembalikan.')) return;
  state.transactions = [];
  saveData(KEYS.transactions, state.transactions);
  renderAll();
  showToast('Riwayat dihapus');
}

/* ---------- 12. PENGATURAN ---------- */
function renderSettings() {
  $('setName').value = state.settings.name;
  $('setAddress').value = state.settings.address;
  $('setPhone').value = state.settings.phone;
  $('setCashier').value = state.settings.cashier;
}

function saveSettings(event) {
  event.preventDefault();
  const name = $('setName').value.trim();
  if (!name) {
    showToast('Nama warung tidak boleh kosong');
    return;
  }
  state.settings = {
    name,
    address: $('setAddress').value.trim(),
    phone: $('setPhone').value.trim(),
    cashier: $('setCashier').value.trim()
  };
  saveData(KEYS.settings, state.settings);
  renderAll();
  showToast('Pengaturan disimpan');
}

/* ---------- Render semua tampilan ---------- */
function renderAll() {
  $('appSubtitle').textContent = state.settings.name;
  renderDashboard();
  renderProduk();
  renderKasir();
  renderRiwayat();
  renderCartBar();
  renderCartSheet();
}

/* ---------- 13. MULAI APLIKASI ---------- */
function bindEvents() {
  // Navigasi bawah & tombol di dashboard
  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });
  document.querySelectorAll('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => showView(btn.dataset.goto));
  });

  // Modal: tombol tutup, klik latar gelap, tombol Esc
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('[data-close]')) closeModal(modal.id);
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = document.querySelectorAll('.modal:not([hidden])');
    if (open.length) closeModal(open[open.length - 1].id);
  });

  // Pencarian & filter kategori
  $('kasirSearch').addEventListener('input', renderKasir);
  $('produkSearch').addEventListener('input', renderProduk);
  $('histSearch').addEventListener('input', renderRiwayat);
  $('kasirChips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-cat]');
    if (!chip) return;
    state.kasirCategory = chip.dataset.cat;
    renderKasir();
  });
  $('produkChips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-cat]');
    if (!chip) return;
    state.produkCategory = chip.dataset.cat;
    renderProduk();
  });

  // Halaman Produk
  $('addProductBtn').addEventListener('click', () => openProductModal(null));
  $('produkList').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    if (btn.dataset.act === 'edit') openProductModal(btn.dataset.id);
    if (btn.dataset.act === 'delete') deleteProduct(btn.dataset.id);
  });
  $('productForm').addEventListener('submit', saveProduct);

  // Halaman Kasir & keranjang
  $('kasirList').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act="add"]');
    if (btn) addToCart(btn.dataset.id);
  });
  $('cartBar').addEventListener('click', () => {
    renderCartSheet();
    openModal('cartModal');
  });
  $('cartItems').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    if (btn.dataset.act === 'inc') changeQty(btn.dataset.id, 1);
    if (btn.dataset.act === 'dec') changeQty(btn.dataset.id, -1);
    if (btn.dataset.act === 'remove') removeFromCart(btn.dataset.id);
  });

  // Pembayaran
  $('payInput').addEventListener('input', () => {
    const digits = $('payInput').value.replace(/\D/g, '').slice(0, MAX_PAY_DIGITS);
    setPaid(Number(digits || 0));
  });
  $('quickPay').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-amount]');
    if (!btn) return;
    setPaid(btn.dataset.amount === 'pas' ? cartTotals().total : Number(btn.dataset.amount));
  });
  $('payBtn').addEventListener('click', checkout);

  // Struk
  $('printBtn').addEventListener('click', () => window.print());
  $('shareBtn').addEventListener('click', shareReceipt);
  $('newTrxBtn').addEventListener('click', () => {
    closeModal('receiptModal');
    if (state.receiptIsNew) showView('kasir');
  });

  // Riwayat
  $('histList').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    if (btn.dataset.act === 'detail') {
      const tx = state.transactions.find((t) => t.no === btn.dataset.no);
      if (tx) showReceipt(tx, false);
    }
    if (btn.dataset.act === 'delete') deleteTransaction(btn.dataset.no);
  });
  $('clearHistoryBtn').addEventListener('click', clearHistory);

  // Pengaturan
  $('settingsForm').addEventListener('submit', saveSettings);
}

function init() {
  loadAll();
  bindEvents();
  updateClock();
  setInterval(updateClock, 1000);
  showView('dashboard');

  // Daftarkan service worker (PWA). Hanya jalan di HTTPS atau localhost.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.warn('Service worker tidak aktif:', err);
    });
  }
}

init();
