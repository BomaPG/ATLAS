// ─────────────────────────────────────────────────────────────────────────────
// HOW TO UPDATE: Every time you upload a new index.html, change the date below.
// Format: YYYYMMDDHHMI  e.g. 202604021200 = April 2 2026, 12:00pm
// ─────────────────────────────────────────────────────────────────────────────
const CACHE = 'atlas-202604042000';
const ASSETS = ['/', '/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(()=>{})));
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

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
// Listen for messages from the main app to schedule notifications
self.addEventListener('message', e => {
  if(e.data?.type === 'SCHEDULE_NOTIFICATIONS') {
    scheduleWatchHourNotifications(e.data.watchHours, e.data.tasks);
  }
  if(e.data?.type === 'TIMER_DONE') {
    self.registration.showNotification('⏱ ATLAS — Time\'s up!', {
      body: e.data.taskTitle ? '"'+e.data.taskTitle+'" session complete. Take a breath.' : 'Your focus session is complete.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'atlas-timer',
      renotify: true,
      data: { url: '/' }
    });
  }
});

// Track scheduled timeouts so we can clear them
let _scheduledTimeouts = [];

function scheduleWatchHourNotifications(watchHours, tasks) {
  // Clear previous schedules
  _scheduledTimeouts.forEach(id => clearTimeout(id));
  _scheduledTimeouts = [];

  const now = new Date();
  const messages = {
    Sunrise: { title: '☀️ ATLAS — Sunrise Session', body: 'Chart your day. Here are your Sunrise tasks.' },
    Midday:  { title: '🌤 ATLAS — Midday Check-in',  body: 'Keep the momentum going. Your Midday tasks are ready.' },
    Sunset:  { title: '🌇 ATLAS — Sunset Wind-down', body: "It's Sunset. Let's close these out." }
  };

  Object.entries(watchHours || {}).forEach(([wh, timeStr]) => {
    if(!timeStr) return;
    const [h, m] = timeStr.split(':').map(Number);
    const fireAt = new Date(now);
    fireAt.setHours(h, m, 0, 0);
    // If already passed today, skip (don't reschedule for tomorrow in SW)
    if(fireAt <= now) return;

    const delay = fireAt.getTime() - now.getTime();
    const msg = messages[wh];
    if(!msg) return;

    // Build task list for body
    const whTasks = (tasks || []).filter(t => t.wh === wh);
    const taskList = whTasks.map(t => '• ' + t.title).join('\n');
    const body = msg.body + (taskList ? '\n' + taskList.slice(0, 200) : '');

    const id = setTimeout(() => {
      self.registration.showNotification(msg.title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'atlas-' + wh.toLowerCase(),
        renotify: true,
        data: { url: '/' }
      });
    }, delay);
    _scheduledTimeouts.push(id);
  });
}

// Open ATLAS when a notification is clicked
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin));
      if(existing) return existing.focus();
      return clients.openWindow(e.notification.data?.url || '/');
    })
  );
});
