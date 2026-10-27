/* مكتبتنا — Service Worker
   Ubah CACHE_VERSION setiap kali index.html diperbarui agar cache lama dibuang. */
const CACHE_VERSION = 'v1';
const CACHE = 'maktabatuna-' + CACHE_VERSION;
const CORE = ['./', './index.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('maktabatuna-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Halaman utama: cache dulu (cepat & offline), perbarui di latar belakang
  if (req.mode === 'navigate' || (url.origin === location.origin)) {
    e.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await cache.match('./index.html') : null);
        const net = fetch(req).then((res) => {
          if (res && res.ok) cache.put(req.mode === 'navigate' ? './index.html' : req, res.clone());
          return res;
        }).catch(() => null);
        if (cached) { e.waitUntil(net); return cached; }
        return (await net) || (await cache.match('./index.html')) || Response.error();
      })
    );
    return;
  }

  // Font Google: simpan setelah pernah dimuat, agar tampil juga saat offline
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const net = fetch(req).then((res) => {
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        }).catch(() => null);
        return cached || (await net) || Response.error();
      })
    );
  }
});
