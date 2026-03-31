// ─────────────────────────────────────────────────────────────────────────────
// HOW TO UPDATE: Every time you upload a new index.html to Netlify, manually
// change the date number below (e.g. 202603240026 → 202603250900).
// This forces all users' browsers to discard the old cached version and load
// the new one. Format: YYYYMMDDHHMI  e.g. 202603241430 = March 24 2026, 2:30pm
// ─────────────────────────────────────────────────────────────────────────────
const CACHE = 'atlas-202604011500';
const ASSETS = ['/', '/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(()=>{})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Delete ALL old caches (atlas-202604011500v2 and any others)
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Network first — always get latest from server, only use cache if offline
  e.respondWith(
    fetch(e.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return response;
    }).catch(() => caches.match(e.request))
  );
});
