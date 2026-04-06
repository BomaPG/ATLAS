const CACHE = 'atlas-202604061030';
const ASSETS = ['/ATLAS/', '/ATLAS/index.html'];

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
  const url = e.request.url;

  // Only handle http/https — ignore chrome-extension, data URIs, etc.
  if (!url.startsWith('http')) return;

  // Never intercept Supabase API calls — let them go straight to network
  if (url.includes('supabase.co')) return;

  // Only cache GET requests — POST/PUT/DELETE must always go to network
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request).then(response => {
      // Only cache valid same-origin or CORS responses
      if (response && response.status === 200) {
        const copy = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      }
      return response;
    }).catch(() => caches.match(e.request))
  );
});

// LOCAL MESSAGES (timer done)
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'TIMER_DONE') {
    const taskTitle = e.data.taskTitle || '';
    self.registration.showNotification("ATLAS — Time's up!", {
      body: taskTitle ? '"' + taskTitle + '" session complete. Take a breath.' : 'Your focus session is complete.',
      icon: '/ATLAS/icon-192.png',
      badge: '/ATLAS/icon-192.png',
      tag: 'atlas-timer',
      renotify: true,
      data: { url: '/ATLAS/' }
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
      return clients.openWindow((e.notification.data && e.notification.data.url) || '/ATLAS/');
    })
  );
});
