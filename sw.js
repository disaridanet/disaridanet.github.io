/* Dışarıda — service worker
   Kabuk (html hariç css/js/ikon/yazı tipi): cache-first
   Sayfalar ve veri JSON/API: network-first (güncel veri öncelikli, offline'da cache)
   Harita karoları (OSM) ve Nominatim: cache'lenmez
*/
const VERSION = 'disarida-pwa-v7';
const SHELL = VERSION + '-shell';
const DATA = VERSION + '-data';

const PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/static/favicon.svg',
  '/static/apple-touch-icon.png',
  '/static/icon-192.png',
  '/static/icon-512.png',
  '/static/icon-512-maskable.png',
  '/static/styles.css',
  '/static/app.js',
  '/static/icons.js',
  '/static/vendor/maplibre-gl.js',
  '/static/vendor/maplibre-gl.css',
  '/static/vendor/fonts/fonts.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await Promise.all(PRECACHE.map(async (url) => {
      try {
        const res = await fetch(url, { cache: 'reload' });
        if (res.ok) await cache.put(url, res);
      } catch (err) { /* tek dosya kurulumu bozmasın */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== SHELL && k !== DATA).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

const TILE = /(?:^|\.)(?:tile\.openstreetmap\.org|openstreetmap\.org\/(?:.*\/)?tile)|demotiles\.maplibre\.org|nominatim\.openstreetmap\.org/i;

function sameOrigin(url) {
  try { return new URL(url, self.location.href).origin === self.location.origin; } catch { return false; }
}

function isData(url) {
  const p = new URL(url, self.location.href).pathname;
  return /^\/api\/(events|places|districts|sides|stats|sources)\/?$/.test(p)
    || /^\/data\/(events|places|districts|sides)\.(json|geojson)$/.test(p);
}

function isShell(url) {
  const p = new URL(url, self.location.href).pathname;
  if (p === '/sw.js' || p === '/manifest.webmanifest') return false;
  return p.startsWith('/static/');
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req) || await caches.match(req);
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req) || await cache.match(new URL(req.url).pathname);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok) cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = req.url;
  if (TILE.test(url)) return; // ağa bırak, cache'leme
  if (!sameOrigin(url)) return;

  const dest = new URL(url).pathname;
  if (dest === '/sw.js') return;

  if (req.mode === 'navigate' || dest === '/' || dest === '/index.html' || dest === '/404.html' || isData(url)) {
    event.respondWith(networkFirst(req, DATA));
    return;
  }
  if (isShell(url)) {
    event.respondWith(cacheFirst(req, SHELL));
  }
});
