/* The Newsstand app shell, loaded on every page (the rack and every paper mounted under it):
   offline copies, "new issue" notices, the app-icon badge, and marking a paper read when you open it. */
(function () {
  var store = { get: function (k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } },
                set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
                raw: function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } } };
  var paper = (location.pathname.match(/^\/([a-z0-9-]+)\//) || [])[1];

  // ---- reading a paper: mark its latest issue read
  if (paper) {
    fetch('/' + paper + '/latest.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (l) {
      var p = location.pathname, onLatest = p === '/' + paper + '/' || p === '/' + paper + '/index.html' || (l.url && p === '/' + paper + '/' + l.url);
      if (onLatest && l.date) { var read = store.get('ns-read'); read[paper] = l.date; store.set('ns-read', read); }
    }).catch(function () {});
  }
  if (!window.isSecureContext || !('serviceWorker' in navigator)) return;
  var deferred = null, bar = null, reg = null;
  function ui() {
    if (bar) return bar;
    bar = document.createElement('div'); bar.className = 'app-bar'; bar.hidden = true;
    bar.innerHTML = '<button type="button" class="app-btn" data-a="bell">🔔 Notify me of new issues</button>' +
                    '<button type="button" class="app-btn" data-a="install" hidden>📲 Add to home screen</button>' +
                    '<button type="button" class="app-x" data-a="close" aria-label="Hide">×</button><span class="app-msg"></span>';
    document.body.appendChild(bar);
    bar.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'close') { bar.hidden = true; store.raw('app-bar-hidden', String(Date.now())); }
      if (a.dataset.a === 'install' && deferred) { deferred.prompt(); deferred.userChoice.then(function () { a.hidden = true; deferred = null; }); }
      if (a.dataset.a === 'bell') subscribe(a);
    });
    return bar;
  }
  function show() { var h = +(store.raw('app-bar-hidden') || 0); if (Date.now() - h > 7 * 864e5) ui().hidden = false; }
  function say(t) { ui().querySelector('.app-msg').textContent = t; }
  function b64(s) {
    var raw = atob((s + '='.repeat((4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')), out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function subscribe(btn) {
    say('Asking…');
    Notification.requestPermission().then(function (p) {
      if (p !== 'granted') { say('Notices are blocked — allow them in the phone settings for this app.'); return; }
      return fetch('/api/push/key').then(function (r) { return r.json(); })
        .then(function (k) { return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(k.key) }); })
        .then(function (s) { return fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Garden-App': '1' },
          body: JSON.stringify({ subscription: s.toJSON() }) }); })
        .then(function () { btn.hidden = true; say('🔔 You\'ll get a notice (and a number on the app icon) when a new issue comes out.'); });
    }).catch(function () { say('Couldn\'t turn notices on — try again in a minute.'); });
  }
  addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; ui().querySelector('[data-a="install"]').hidden = false; show(); });
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function (r) {
    reg = r;
    if (paper) r.getNotifications({ tag: paper }).then(function (ns) { ns.forEach(function (n) { n.close(); }); })   // read it → clear its notices
      .then(function () { return r.getNotifications(); })
      .then(function (left) { if (navigator.setAppBadge) (left.length ? navigator.setAppBadge(left.length) : navigator.clearAppBadge()).catch(function () {}); })
      .catch(function () {});
    if (!('PushManager' in window) || !('Notification' in window)) return;
    return r.pushManager.getSubscription().then(function (sub) {
      var on = sub && Notification.permission === 'granted';
      var go = function () { if (!on || deferred) show(); if (on) ui().querySelector('[data-a="bell"]').hidden = true; };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
    });
  }).catch(function () {});
})();
