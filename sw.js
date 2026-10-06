/* =========================================================
   Kasir Warung - Service Worker
   Tugas: menyimpan file aplikasi agar bisa dibuka tanpa internet.
   Jika Anda mengubah file aplikasi, naikkan angka versi di bawah
   (misalnya v1 -> v2) agar HP mengambil file yang baru.
   ========================================================= */
'use strict';

const CACHE_NAME = 'kasir-warung-v1';

const APP_FILES = [
  './',
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// Saat pertama dipasang: simpan semua file utama ke cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES.map((file) => new Request(file, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

// Saat aktif: hapus cache versi lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Saat ada permintaan file: pakai cache dulu (cepat & offline),
// sambil diam-diam mengambil versi terbaru dari jaringan.
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Hanya tangani GET dari alamat yang sama dengan aplikasi
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      const fromNetwork = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached || (request.mode === 'navigate' ? caches.match('index.html') : Response.error()));

      event.waitUntil(fromNetwork);
      return cached || fromNetwork;
    })
  );
});
