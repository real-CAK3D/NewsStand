/* The Corner Chronicle service worker: always the freshest paper when online, the last copy when offline, and new-issue notices. */
var CACHE = 'newsstand-v3';

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || (url.origin === location.origin && url.pathname.indexOf('/api/') === 0)) return;
  // network first: updates on the Garden show up immediately; the cache is only the offline fallback
  e.respondWith(fetch(req).then(function (res) {
    if (res && (res.ok || res.type === 'opaque')) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req).then(function (hit) { return hit || (req.mode === 'navigate' ? caches.match('/') : undefined); });
  }));
});

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'The Corner Chronicle', body: e.data && e.data.text() }; }
  e.waitUntil(Promise.all([
    self.registration.showNotification(d.title || 'A new issue is on The Corner Chronicle', {
      body: d.body || '', icon: '/icons/house-192.png', badge: '/icons/badge-96.png', tag: d.tag || 'paper', renotify: true,
      data: { url: d.url || '/' } }),
  ]).then(function () {   // app-icon badge = papers with new issues waiting (one notice per paper)
    return self.registration.getNotifications().then(function (ns) {
      if (self.navigator && self.navigator.setAppBadge) return self.navigator.setAppBadge(ns.length).catch(function () {});
    });
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { if ('focus' in cs[i]) { cs[i].navigate(url); return cs[i].focus(); } }
    return self.clients.openWindow(url);
  }));
});
