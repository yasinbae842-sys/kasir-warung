# Kasir Warung

Aplikasi kasir sederhana untuk warung kecil. HTML + CSS + JavaScript murni, data disimpan di LocalStorage, bisa di-install sebagai PWA di Android dan iPhone.

## Struktur folder

```
kasir-warung/
├── index.html
├── style.css
├── script.js
├── manifest.json
├── sw.js
├── JALANKAN-WINDOWS.bat
├── JALANKAN-MAC-LINUX.sh
├── README.md
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## Menjalankan di komputer

**Cara tercepat:** Windows, klik dua kali `JALANKAN-WINDOWS.bat`. Mac/Linux, jalankan `./JALANKAN-MAC-LINUX.sh`. Browser terbuka otomatis (perlu Python atau Node.js terpasang). Atau manual seperti di bawah.

Service worker (offline) dan fitur PWA hanya bekerja lewat **localhost** atau **HTTPS**. Jangan buka dengan klik dua kali (`file://`), karena PWA tidak aktif.

1. Ekstrak folder `kasir-warung`.
2. Buka terminal/Command Prompt di dalam folder itu.
3. Jalankan salah satu:
   - Python: `python -m http.server 8080` (di Windows kadang `py -m http.server 8080`)
   - Node.js: `npx serve -l 8080`
4. Buka `http://localhost:8080` di browser (Chrome/Edge disarankan).

## Menjalankan di Android

**Cara A, sambil mengembangkan (satu Wi-Fi):**
1. Jalankan server di komputer (langkah di atas).
2. Cari alamat IP komputer (Windows: `ipconfig`, Mac/Linux: `ifconfig` atau `ip a`), misalnya `192.168.1.10`.
3. Di Chrome Android buka `http://192.168.1.10:8080`.
4. Aplikasi sudah bisa dipakai. Catatan: lewat `http://` alamat IP, Chrome **tidak** menawarkan install PWA penuh dan tombol "Bagikan" memakai WhatsApp sebagai cadangan.

**Cara B, untuk dipakai sungguhan (disarankan): hosting HTTPS gratis**
Upload isi folder ke GitHub Pages, Netlify, atau Cloudflare Pages. Anda akan mendapat alamat `https://...`. Buka alamat itu di Chrome Android, lalu install (lihat bagian install).

## Menjalankan di iPhone

PWA di iPhone butuh **HTTPS** dan harus dibuka dengan **Safari**.

1. Hosting file di GitHub Pages / Netlify / Cloudflare Pages (cara B di atas).
2. Buka alamat `https://...` itu di Safari.
3. Install ke Home Screen (lihat bagian install).

Untuk sekadar mencoba tampilan, `http://IP-komputer:8080` di Safari juga bisa dibuka, tetapi mode offline tidak aktif.

## Cara install sebagai PWA

**Android (Chrome):** buka aplikasi lewat HTTPS → menu titik tiga (⋮) → **Install app** / **Tambahkan ke layar utama** → Install.

**iPhone (Safari):** buka aplikasi → tombol **Bagikan** (kotak dengan panah ke atas) → **Tambahkan ke Layar Utama** → Tambah.

**Komputer (Chrome/Edge):** klik ikon install di kanan address bar.

Setelah ter-install, ikon "Kasir Warung" muncul di layar utama dan aplikasi terbuka layar penuh serta bisa dipakai tanpa internet.

**Penting soal data:** LocalStorage tersimpan per browser/per alamat. Di iPhone, aplikasi yang di-install ke Home Screen punya penyimpanan **terpisah** dari Safari, jadi produk yang Anda isi di Safari tidak ikut pindah. Sebaiknya install dulu, baru isi data. Jangan menghapus data situs/browser, karena riwayat dan stok ikut terhapus.

## Mengubah nama dan informasi warung

Buka menu **⚙️ Pengaturan**, isi nama warung, alamat, nomor telepon, dan nama kasir, lalu tekan **Simpan Pengaturan**. Informasi ini muncul di struk berikutnya. Struk lama tetap memakai informasi saat transaksi dibuat.

## Menambah produk

1. Buka menu **📦 Produk** → tekan **+ Tambah**.
2. Isi nama, harga, stok, dan kategori (boleh pilih kategori yang sudah ada atau ketik baru). ID dibuat otomatis (P007, P008, dst).
3. Tekan **Simpan**.

Saat pertama dibuka, aplikasi berisi 6 contoh produk. Hapus lewat tombol **Hapus** di menu Produk jika tidak diperlukan.

## Aturan stok

- Stok 5 atau kurang ditandai **Hampir habis**, stok 0 ditandai **Habis**.
- Setiap pembayaran otomatis mengurangi stok.
- Menghapus transaksi dari riwayat **tidak** mengembalikan stok.

## Memperbarui aplikasi setelah mengubah kode

Ubah angka versi di `sw.js` (`kasir-warung-v1` → `kasir-warung-v2`) agar HP mengambil file terbaru, lalu buka aplikasi dua kali.
