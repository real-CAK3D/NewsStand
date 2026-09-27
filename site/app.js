/* Garden paper app: offline copy, "new issue" notices and the install button. Loaded on every page of the app. */
(function () {
  if (navigator.clearAppBadge) navigator.clearAppBadge().catch(function () {});
  if (!window.isSecureContext || !('serviceWorker' in navigator)) return;
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
                set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var deferred = null, bar = null;
  function ui() {
    if (bar) return bar;
    bar = document.createElement('div'); bar.className = 'app-bar'; bar.hidden = true;
    bar.innerHTML = '<button type="button" class="app-btn" data-a="bell">🔔 Notify me of new issues</button>' +
                    '<button type="button" class="app-btn" data-a="install" hidden>📲 Add to home screen</button>' +
                    '<button type="button" class="app-x" data-a="close" aria-label="Hide">×</button><span class="app-msg"></span>';
    document.body.appendChild(bar);
    bar.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'close') { bar.hidden = true; store.set('app-bar-hidden', String(Date.now())); }
      if (a.dataset.a === 'install' && deferred) { deferred.prompt(); deferred.userChoice.then(function () { a.hidden = true; deferred = null; }); }
      if (a.dataset.a === 'bell') subscribe(a);
    });
    return bar;
  }
  function show() { var h = +(store.get('app-bar-hidden') || 0); if (Date.now() - h > 7 * 864e5) ui().hidden = false; }
  function say(t) { ui().querySelector('.app-msg').textContent = t; }
  function b64(s) {
    var raw = atob((s + '='.repeat((4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')), out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  var reg = null;
  function subscribe(btn) {
    say('Asking…');
    Notification.requestPermission().then(function (p) {
      if (p !== 'granted') { say('Notices are blocked — allow them in the phone settings for this app.'); return; }
      return fetch('/api/push/key').then(function (r) { return r.json(); })
        .then(function (k) { return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(k.key) }); })
        .then(function (s) { return fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Garden-App': '1' },
          body: JSON.stringify({ subscription: s.toJSON() }) }); })
        .then(function () { btn.hidden = true; say('🔔 You\'ll get a notice when a new issue comes out.'); });
    }).catch(function () { say('Couldn\'t turn notices on — try again in a minute.'); });
  }
  addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; var b = ui().querySelector('[data-a="install"]'); b.hidden = false; show(); });
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function (r) {
    reg = r;
    if (!('PushManager' in window) || !('Notification' in window)) return;
    return r.pushManager.getSubscription().then(function (sub) {
      var go = function () { if (!(sub && Notification.permission === 'granted')) show(); else if (deferred) show(); if (sub && Notification.permission === 'granted') ui().querySelector('[data-a="bell"]').hidden = true; };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
    });
  }).catch(function () {});
})();
