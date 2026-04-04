// ─────────────────────────────────────────────────────────────────────────────
// HOW TO UPDATE: Every time you upload a new index.html, change the date below.
// Format: YYYYMMDDHHMI  e.g. 202604051200 = April 5 2026, 12:00pm
// ─────────────────────────────────────────────────────────────────────────────
const CACHE = 'atlas-202604051200';
const ASSETS = ['/', '/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return response;
    }).catch(() => caches.match(e.request))
  );
});

// SERVER-SENT PUSH NOTIFICATIONS (from Supabase Edge Function)
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) {}
  const title = data.title || 'ATLAS';
  const body  = data.body  || 'Time to focus.';
  const tag   = 'atlas-' + (data.wh || 'push');
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag,
      renotify: true,
      data: { url: '/' }
    })
  );
});

// LOCAL MESSAGES (timer done)
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'TIMER_DONE') {
    const taskTitle = e.data.taskTitle || '';
    self.registration.showNotification("ATLAS — Time's up!", {
      body: taskTitle ? '"' + taskTitle + '" session complete. Take a breath.' : 'Your focus session is complete.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'atlas-timer',
      renotify: true,
      data: { url: '/' }
    });
  }
});

// NOTIFICATION CLICK — open ATLAS
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow((e.notification.data && e.notification.data.url) || '/');
    })
  );
});
