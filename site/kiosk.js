/* The Corner Chronicle kiosk: the covers (dates, headlines, "new" badges, ☆ notices), the season and time of day, the counter (register
   display + token ticker tape), the punch card, the jars of best moments, seed packets, zines on the line, the stash box (seed packs +
   the pocket knife of Hermes / Claude Code / Codex / Ollama tips), the Scrapbook drawer, Letters to the Editor, the tip-line payphone,
   search across every paper, the ashtray, and the morning paper tossed onto the rack. The radio lives in radio.js. */
(function () {
  'use strict';
  var HDR = { 'Content-Type': 'application/json', 'X-Garden-App': '1' };
  var AGENTS = ['Ganja', 'The Gardiner', 'CHRONIC', 'Maple', 'Herbie', 'Homie', 'Ibby', 'Disco Stu', 'BAK3R', 'CYPH3R', 'Clydius', 'tinyZ', 'B.I.G', 'Fat Man', 'Little Boy'];
  var store = { get: function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
                set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }
  function get(u) { return fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw r.status; return r.json(); }); }
  function post(u, b) { return fetch(u, { method: 'POST', headers: HDR, body: JSON.stringify(b) }).then(function (r) { return r.json(); }); }
  function parts(d) { var p = String(d).split('-'); return new Date(+p[0], p[1] - 1, +(p[2] || 1)); }
  var toastT;
  function toast(t) { var el = $('#k-toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('on'); }, 3600); }
  window.kioskToast = toast;

  // ---------- sound: a few little synthesized effects (no files)
  var AC = null;
  function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (AC.state === 'suspended') AC.resume(); return AC; }
  window.kioskAudio = ac;
  function noiseBurst(dur, freq, vol, q) {
    var c = ac(); if (!c) return;
    var n = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = n.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = n; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(c.destination); s.start();
  }
  function tone(freq, dur, vol, type) {
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + dur);
  }
  var SFX = {
    thwack: function () { noiseBurst(0.18, 700, 0.9, 0.7); tone(90, 0.2, 0.5, 'triangle'); },
    click: function () { noiseBurst(0.04, 3200, 0.5, 2); tone(1800, 0.03, 0.15, 'square'); },
    flick: function () { noiseBurst(0.06, 2400, 0.4, 3); setTimeout(function () { tone(2600, 0.05, 0.12, 'triangle'); }, 40); },
    drawer: function () { noiseBurst(0.35, 240, 0.35, 0.6); },
    lid: function () { noiseBurst(0.12, 500, 0.4, 1); tone(180, 0.15, 0.2, 'triangle'); },
    bell: function () { tone(1320, 0.5, 0.2); setTimeout(function () { tone(1760, 0.6, 0.15); }, 90); },
    ring: function () { for (var i = 0; i < 6; i++) setTimeout(function () { tone(440, 0.07, 0.12, 'square'); tone(480, 0.07, 0.12, 'square'); }, i * 80); },
    puff: function () { noiseBurst(0.7, 400, 0.25, 0.4); },
    slot: function () { noiseBurst(0.15, 1600, 0.3, 1); setTimeout(function () { tone(300, 0.12, 0.25, 'triangle'); }, 120); }
  };
  window.kioskSfx = SFX;

  // ---------- greeting, time of day, the season (weather out the window and decorations on the awning)
  var now = new Date(), h = now.getHours(), m = now.getMonth();
  $('#ns-hi').textContent = (h < 4 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + ', CAK3D';
  $('#ns-date').textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  document.body.classList.add(h < 6 || h >= 21 ? 't-night' : h < 8 ? 't-dawn' : h >= 18 ? 't-dusk' : 't-day');
  var season = m === 11 || m < 2 ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'autumn';
  document.body.classList.add('s-' + season);
  (function fx() {
    var box = $('#k-fx'); if (!box || window.SCENE || matchMedia('(prefers-reduced-motion: reduce)').matches) return;   // the 3D kiosk: weather.js
    var n = innerWidth < 600 ? 10 : 18, pick = { winter: ['❄', '❅', '❆'], spring: ['🌸', '🌼', '·'], summer: [], autumn: ['🍂', '🍁', '🍂'] }[season];
    for (var i = 0; i < n; i++) {
      var el = document.createElement('i');
      if (season === 'summer') { if (!document.body.classList.contains('t-night') && !document.body.classList.contains('t-dusk')) return; el.className = 'fly'; el.style.left = (Math.random() * 100) + '%'; el.style.animationDelay = (-Math.random() * 6) + 's'; }
      else { el.textContent = pick[i % pick.length]; el.style.left = (Math.random() * 100) + '%'; el.style.fontSize = (12 + Math.random() * 16) + 'px';
             el.style.animationDuration = (9 + Math.random() * 10) + 's'; el.style.animationDelay = (-Math.random() * 18) + 's'; }
      el.style.setProperty('--dx', ((Math.random() - .5) * 200) + 'px'); el.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      box.appendChild(el);
    }
  })();
  (function decor() {
    if (!$('#k-decor')) return;
    var d = $('#k-decor'), day = now.getDate(), add = function (t, css) { var s = document.createElement('span'); s.className = 'dc'; s.textContent = t; s.style.cssText = css; d.appendChild(s); };
    if (m === 9) { add('🎃', 'left:3%;top:-14px'); add('🎃', 'right:4%;top:-10px;font-size:22px'); add('🕸', 'left:12%;top:40px;font-size:20px'); }
    if (m === 11) { var l = document.createElement('div'); l.className = 'lights'; d.appendChild(l); add('🎄', 'right:3%;top:-18px'); }
    if (m === 10 && day > 20) add('🦃', 'right:4%;top:-14px');
    if (m === 6 && day < 6) add('🎆', 'left:4%;top:-16px');
    if (m === 3 && day === 20) { add('🍃', 'left:3%;top:-12px'); add('🍃', 'right:3%;top:-12px'); }
    if (season === 'winter') add('⛄', 'left:2%;top:-18px');
  })();

  // ---------- the covers: dates, headlines, cover art, "new" badges, app-icon badge
  var read = store.get('ns-read', {}), total = 0, pending = 0;
  function badge() { if (navigator.setAppBadge) (total ? navigator.setAppBadge(total) : navigator.clearAppBadge()).catch(function () {}); }
  var mags = $$('.mag[data-id]'); pending = mags.length;
  var ex = $('#ns-extra');
  if (ex) get(ex.getAttribute('href') + 'latest.json').then(function (l) {
    if (l.active) { ex.querySelector('.ns-extra-head').textContent = l.title || ''; ex.hidden = false;
      if (read['extra-extra'] !== (l.issues || [])[0]) ex.classList.add('new');
      ex.addEventListener('click', function () { read['extra-extra'] = (l.issues || [])[0]; store.set('ns-read', read); }); }
  }).catch(function () {});
  var LATEST = {};
  mags.forEach(function (a) {
    var id = a.dataset.id, path = a.getAttribute('href');
    get(path + 'latest.json').then(function (l) {
      LATEST[id] = l;
      a.querySelector('.mg-head').textContent = l.title || '';
      var ln = a.querySelector('.mg-lines');
      (l.lines || []).forEach(function (t) { var i = document.createElement('i'); i.textContent = t; ln.appendChild(i); });
      if ((l.lines || []).length) a.classList.add('has-lines');
      if (l.date) { var d = parts(l.date);
        a.querySelector('.mg-dow').textContent = d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
        a.querySelector('.mg-md').textContent = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase(); }
      a.dataset.issue = l.date || '';
      if (l.cover) { var c = a.querySelector(a.classList.contains('mg-pr') ? '.mg-art' : '.mg-cover'); c.style.backgroundImage = 'url(' + path + l.cover + ')'; a.classList.add('has-img'); }
      var issues = l.issues || (l.url ? [l.date] : []), last = read[id] || '';
      var n = issues.filter(function (x) { return x > last; }).length;
      if (n) { a.classList.add('new'); a.querySelector('.mg-badge').textContent = n > 9 ? '9+' : n; total += n; }
      if (id === 'double-wide') counter(l);
    }).catch(function () { a.querySelector('.mg-head').textContent = 'First issue coming soon'; })
      .then(function () { if (--pending === 0) { badge(); newsboy(); } });
    a.addEventListener('click', function () {
      if (a.dataset.issue) { read[id] = a.dataset.issue; store.set('ns-read', read); }
      post('/api/read', { paper: id }).catch(function () {});
      if (navigator.serviceWorker) navigator.serviceWorker.ready.then(function (reg) {
        return reg.getNotifications({ tag: id }).then(function (ns) { ns.forEach(function (x) { x.close(); }); });
      }).catch(function () {});
    });
  });

  // ---------- ☆ stars: which papers ring this phone
  var endpoint = null;
  function paintStars(muted) { $$('.mag-star').forEach(function (b) { var off = muted.indexOf(b.dataset.id) >= 0; b.classList.toggle('muted', off); b.textContent = off ? '☆' : '★';
    b.title = off ? 'Muted — tap to get notices for this paper' : 'Rings your phone — tap to mute'; }); }
  function pushSub() {   // this phone's push subscription, if any — never waits on a service worker that isn't there
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    return Promise.race([navigator.serviceWorker.getRegistration().then(function (r) { return r && r.pushManager ? r.pushManager.getSubscription() : null; }),
                         new Promise(function (res) { setTimeout(function () { res(null); }, 1500); })]).catch(function () { return null; }); }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('.mag-star'); if (!b) return;
    ev.preventDefault(); ev.stopPropagation(); SFX.click();
    if (!endpoint) { toast('Turn on notices first (🔔 at the bottom), then choose papers with the stars.'); return; }
    var mute = !b.classList.contains('muted');
    post('/api/mute', { endpoint: endpoint, paper: b.dataset.id, muted: mute }).then(function (r) { paintStars(r.muted || []);
      toast(mute ? '☆ Muted — no notices for that paper on this phone.' : '★ You\'ll get notices for that paper.'); }).catch(function () { toast('Couldn\'t reach the kiosk.'); });
  });

  // ---------- state: wallet, punch card, clippings, stash
  var STATE = { wallet: { balance: 0 }, punch: { days: [] }, clips: [], stash: { packs: [] } };
  function loadState() {
    return pushSub().then(function (s) { endpoint = s ? s.endpoint : null;
      return get('/api/state' + (endpoint ? '?endpoint=' + encodeURIComponent(endpoint) : '')); })
      .then(function (s) { STATE = s; paintPunch(); paintStars(s.muted || []); $('#k-drawer-n').textContent = window.SCENE ? ((s.clips || []).length || '') : (s.clips || []).length + ' clipped'; return s; })
      .catch(function () { return STATE; });
  }
  function paintPunch() {
    var box = $('#k-punch-holes'); box.innerHTML = '';
    var days = STATE.punch.days || [], t = new Date();
    for (var i = 13; i >= 0; i--) { var d = new Date(t); d.setDate(t.getDate() - i); var iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      var s = document.createElement('span'); if (days.indexOf(iso) >= 0) s.className = 'on'; if (!i) s.classList.add('today'); s.title = iso; box.appendChild(s); }
    var st = STATE.punch.streak || 0;
    $('#k-punch-f').textContent = st ? st + '-day streak · ' + STATE.wallet.balance + ' Garden Bucks' : 'Read a paper to get punched · ' + STATE.wallet.balance + ' GB';
    $('#k-punch').classList.toggle('gold', st >= 14);
  }
  $('#k-punch').addEventListener('click', function () {
    var st = STATE.punch.streak || 0;
    sheet('punch', 'Regular\'s Card', 'Your streak: ' + st + ' day' + (st === 1 ? '' : 's'),
      '<p class="kv-p">Every day you open a paper, the newsie punches your card and slips you <b>10 Garden Bucks</b> — spend them on seed packs in The Seed Catalog (or at Dime Bags).</p>' +
      '<ul class="kv-list"><li><small>7 days in a row</small>+100 Garden Bucks and a bonus comic ' + (st >= 7 ? '✅' : '') + '</li><li><small>14 days</small>+250 and a gold card ' + (st >= 14 ? '✅' : '') +
      '</li><li><small>30 days</small>+1,000 and the Golden Joint for the counter ' + (st >= 30 ? '✅' : '') + '</li></ul><p class="kv-p">Wallet: <b>' + STATE.wallet.balance + ' Garden Bucks</b></p>' +
      (st >= 7 ? '<p class="kv-p"><a href="/sunday-smoke/funnies.html">🎁 Your bonus comic: the funnies archive ›</a></p>' : ''));
  });

  // ---------- the counter: register display cycles; the ticker tape carries the Garden Token Average
  function k(n) { n = +n || 0; return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(Math.round(n)); }
  function counter(l) {
    var base = '/double-wide/', disp = ['OPEN'];
    Promise.all([get(base + 'data/usage-' + l.date + '.json').catch(function () { return null; }),
                 get(base + 'data/weather-' + l.date + '.json').catch(function () { return null; }),
                 get('/dime-bags/latest.json').catch(function () { return null; })]).then(function (r) {
      var u = r[0], w = r[1], tb = r[2];
      if (w && w.now && w.now.temp_f) { $('#ns-wx').textContent = w.now.temp_f + '° ' + (w.now.text || '') + ' · Lewiston'; disp.push(w.now.temp_f + '° ' + String(w.now.text || '').toUpperCase()); }
      if (u) {
        disp.push('GTA ' + k(u.total));
        var tape = '★ THE GARDEN TOKEN AVERAGE ' + k(u.total) + ' ★ ' + Object.keys(u.by_agent || {}).sort(function (a, b) { return u.by_agent[b] - u.by_agent[a]; })
          .map(function (a) { return '<span class="up">' + esc(a.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 10)) + ' ▲ ' + k(u.by_agent[a]) + '</span>'; }).join(' · ') +
          ' ★ MODELS: ' + Object.keys(u.by_model || {}).map(function (mm) { return esc(mm) + ' ' + k(u.by_model[mm]); }).join(' · ');
        if (tb && tb.title) tape += ' ★ DIME BAGS: ' + esc(tb.title);
        if ($('#rg-tape')) $('#rg-tape').innerHTML = tape + ' ★';   // (the brass register and its tape are gone from the 3D kiosk)
      }
      if (tb && tb.title) disp.push(String(tb.title).toUpperCase().slice(0, 16));
      var i = 0; if ($('#rg-disp')) setInterval(function () { i = (i + 1) % disp.length; $('#rg-disp').textContent = disp[i]; }, 3000);
    });
  }

  // ---------- the ashtray: tap for a puff and a fortune from the smoke
  var SMOKE = ['A watched cron job never runs.', 'Back it up before you break it.', 'The SD card remembers everything… until it doesn\'t.',
               'Roll slow, commit often.', 'Today\'s lucky port: 8444.', 'Somebody\'s token bill is about to be legendary.', 'Clydius knows where the good snacks are.',
               'Your next idea is already in a seed pack.', 'Read-only is just the Pi asking for a nap.', 'The stars say: reboot at your own risk.'];
  $('#k-ash').addEventListener('click', function () {
    var a = $('#k-ash'); SFX.puff(); a.classList.add('puff');
    var old = a.querySelector('.puffmsg'); if (old) old.remove();
    var b = document.createElement('div'); b.className = 'puffmsg'; b.textContent = SMOKE[Math.floor(Math.random() * SMOKE.length)]; a.appendChild(b);
    setTimeout(function () { a.classList.remove('puff'); }, 1600); setTimeout(function () { b.remove(); }, 4200);
  });

  // ---------- overlays
  var sheets = {};
  function sheet(key, kick, title, html, cls) {
    var v = sheets[key];
    if (!v) { v = document.createElement('div'); v.className = 'kv ' + (cls || ''); v.innerHTML = '<div class="kv-card" role="dialog" aria-modal="true"><button type="button" class="kv-home" aria-label="Back to the stand">' + (($('#tpl-seal') || {}).innerHTML || '⌂') + '</button><button type="button" class="kv-x" aria-label="Close">×</button>' +
      '<div class="kv-kick"></div><h2 class="kv-h"></h2><div class="kv-in"></div></div>'; document.body.appendChild(v); sheets[key] = v;
      v.addEventListener('click', function (e) { if (e.target === v || (e.target.closest && e.target.closest('.kv-x, .kv-home'))) close(v); }); }
    v.querySelector('.kv-kick').textContent = kick; v.querySelector('.kv-h').textContent = title; v.querySelector('.kv-in').innerHTML = html;
    v.hidden = false; document.documentElement.style.overflow = 'hidden'; return v;
  }
  function close(v) { v.hidden = true; document.documentElement.style.overflow = ''; if (v.onclosed) v.onclosed(); }
  addEventListener('keydown', function (e) { if (e.key === 'Escape') Object.keys(sheets).forEach(function (k2) { if (!sheets[k2].hidden) close(sheets[k2]); }); });

  // ---------- the jars: the Garden's best moments
  var JARS = null;
  $$('.k-jar').forEach(function (b) { b.addEventListener('click', function () {
    SFX.lid();
    (JARS ? Promise.resolve(JARS) : get('/jars.json').then(function (j) { JARS = j; return j; })).then(function (j) {
      var jar = (j.jars || [])[+b.dataset.jar] || {};
      var v = sheet('jar', 'From the jar', jar.name || 'The jar', '<img class="jar-shot" alt="" src="/scene/jar_' + (+b.dataset.jar) + '-day.jpg"><p class="kv-p"><i>' + esc(jar.blurb || '') + '</i></p><ul class="kv-list">' +
        ((jar.moments || []).map(function (x) { return '<li><small>' + esc(x.date || '') + (x.paper ? ' · ' + esc(x.paper) : '') + '</small>' +
          (x.url ? '<a href="' + esc(x.url) + '">' + esc(x.title) + '</a>' : '<b>' + esc(x.title) + '</b>') + (x.text ? '<br>' + esc(x.text) : '') + '</li>'; }).join('') ||
          '<li>Still curing — moments land in this jar as they happen.</li>') + '</ul>', 'kv-jar');
      v.querySelector('.kv-card').style.setProperty('--jc', jar.color || '#2f6b4f');
    }).catch(function () { toast('The jars are still curing — try again in a bit.'); });
  }); });

  // ---------- seed packets in the window (from The Seed Catalog)
  var CATALOG = null;
  get('/seed-catalog/catalog.json').then(function (c) {
    CATALOG = c; var box = $('#k-seeds'), more = box && box.querySelector('.k-seed-more');
    if (!more) return;   // the 3D kiosk: the packets are in the render; the shelf links to the catalog
    (c.packs || []).slice(0, 8).forEach(function (p) { var a = document.createElement('a'); a.className = 'k-seed'; a.href = '/seed-catalog/#pack-' + p.id;
      a.style.setProperty('--c', p.color || '#e2584c'); a.innerHTML = '<b>' + esc(p.name) + '</b><i>' + esc(p.theme || '') + '</i><s>' + esc(p.price) + ' GB</s>'; box.insertBefore(a, more); });
  }).catch(function () {});

  // ---------- zines on the line
  if ($('#k-zines')) get('/zines/latest.json').then(function (z) {
    var line = $('#k-zines'), list = (z.zines || []).slice(0, 12), w = line.clientWidth || 300;
    list.forEach(function (x, i) { var a = document.createElement('a'); a.className = 'k-zine'; a.href = '/zines/' + x.url;
      a.style.left = Math.round(6 + i * Math.max(40, (w - 64) / Math.max(1, list.length - 1 || 1))) + 'px'; a.style.animationDelay = (-i * 0.7) + 's';
      a.innerHTML = (x.cover ? '<img src="/zines/' + esc(x.cover) + '" alt="">' : '') + '<b>' + esc(x.agent) + '</b>'; a.title = x.title || x.agent; line.appendChild(a); });
    if (!list.length) line.insertAdjacentHTML('beforeend', '<span class="k-zine" style="left:10px"><b>zines soon</b></span>');
  }).catch(function () { if ($('#k-zines')) $('#k-zines').insertAdjacentHTML('beforeend', '<span class="k-zine" style="left:10px"><b>zines soon</b></span>'); });

  // ---------- the stash box: seed packs you bought + the pocket knife
  var TOOLS = null;
  function openStash() {
    var sb = $('#k-stash'); sb.classList.add('open'); SFX.lid();
    Promise.all([loadState(), TOOLS ? TOOLS : get('/stash-tools.json').catch(function () { return { tools: {} }; })]).then(function (r) {
      TOOLS = r[1]; var packs = (STATE.stash && STATE.stash.packs) || [];
      var v = sheet('stash', 'Your stash box', 'The Stash',
        '<div class="sb-in"><div class="kv-kick" style="color:#d9e8c8">Seed packs · ' + STATE.wallet.balance + ' Garden Bucks in your pocket</div><div class="sb-packs">' +
        (packs.map(function (p, i) { var n = Object.keys(p.seeds || {}).length, g = Object.keys(p.seeds || {}).filter(function (s) { return p.seeds[s].status === 'grown'; }).length;
          return '<button type="button" class="sb-pack" data-i="' + i + '" style="--c:' + esc(p.color || '#e2584c') + ';--r:' + ((i % 3) - 1) * 3 + 'deg"><b>' + esc(p.name) + '</b><small>' + n + ' seeds · ' + g + ' grown</small></button>'; }).join('') ||
         '<p class="sb-empty">No seed packs yet — pick some up in <a href="/seed-catalog/" style="color:#f3d58a">The Seed Catalog</a>.</p>') +
        '</div><div class="kn-wrap" id="kn-wrap">' + $('#tpl-knife').innerHTML + '</div><div class="kn-hint" id="kn-hint">Tap the knife to flick it open · then tap a blade</div>' +
        '<div class="kn-tips" id="kn-tips"></div></div>', 'kv-stash');
      v.onclosed = function () { sb.classList.remove('open'); };
      var kn = v.querySelector('#kn-wrap');
      kn.addEventListener('click', function (e) {
        var bl = e.target.closest && e.target.closest('.kn-blade');
        if (!kn.classList.contains('open')) { kn.classList.add('open'); for (var i = 0; i < 6; i++) setTimeout(SFX.flick, i * 90); v.querySelector('#kn-hint').textContent = 'Tap a blade · tap the handle to fold it'; return; }
        if (bl) { SFX.click(); showTool(v, bl.dataset.tool); return; }
        kn.classList.remove('open'); SFX.flick(); v.querySelector('#kn-tips').classList.remove('on'); v.querySelector('#kn-hint').textContent = 'Tap the knife to flick it open · then tap a blade';
      });
      $$('.sb-pack', v).forEach(function (b) { b.addEventListener('click', function () { openPack(packs[+b.dataset.i]); }); });
    });
  }
  function showTool(v, id) {
    var t = (TOOLS.tools || {})[id] || {}, box = v.querySelector('#kn-tips');
    var secs = (t.sections || []).map(function (s) { return '<div class="kn-sec">' + esc(s.name) + '</div><dl>' + (s.items || []).map(function (it) {
      return '<dt>' + esc(it.cmd) + '</dt><dd>' + esc(it.what) + '</dd>'; }).join('') + '</dl>'; }).join('');
    if (id === 'fresh') secs = (TOOLS.fresh || []).map(function (f) { return '<div class="kn-sec">' + esc(f.for || 'Fresh find') + (f.date ? ' · ' + esc(f.date) : '') + '</div><dl><dt>' + esc(f.title) + '</dt><dd>' +
      esc(f.what) + (f.url ? ' <a href="' + esc(f.url) + '" target="_blank" rel="noopener">link ›</a>' : '') + '</dd></dl>'; }).join('') || '<p>B.I.G drops fresh finds in here every week.</p>';
    box.innerHTML = '<h3>' + esc(t.title || (id === 'fresh' ? 'Fresh Finds' : id)) + '</h3><p>' + esc(t.blurb || (id === 'fresh' ? 'New plugins, tools and tricks B.I.G found this week.' : '')) + '</p>' + secs;
    box.classList.add('on'); box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function openPack(p) {
    if (!p) return; var cat = ((CATALOG || {}).packs || []).filter(function (x) { return x.id === p.pack; })[0] || { seeds: [] };
    var v = sheet('pack', 'Seed pack', p.name, '<p class="kv-p"><i>' + esc(cat.theme || p.theme || '') + '</i></p><ul class="sd-seeds">' + (cat.seeds || []).map(function (s) {
      var st = (p.seeds || {})[s.id] || {}, btn = st.status === 'grown' ? '<a class="kv-btn" href="' + esc(st.url) + '">📖 Grow guide</a>' :
        st.status === 'planting' ? '<button class="kv-btn ghost" disabled>🌱 Growing…</button>' : '<button type="button" class="kv-btn" data-seed="' + esc(s.id) + '">🌱 Plant it</button>';
      return '<li><div style="flex:1"><b>' + esc(s.name) + '</b><p>' + esc(s.what || '') + '</p><small class="kv-kick" style="letter-spacing:.08em">' + esc([s.level, s.time, s.cost].filter(Boolean).join(' · ')) + '</small></div>' + btn + '</li>'; }).join('') +
      '</ul><div class="kv-msg"></div><p class="kv-p" style="font-size:13px">Planting a seed has CHRONIC write a full grow guide for your gear — parts, steps, code and where it runs. You get a notice when it sprouts.</p>');
    $$('[data-seed]', v).forEach(function (b) { b.addEventListener('click', function () { b.disabled = true; v.querySelector('.kv-msg').textContent = 'Planting…';
      post('/api/plant', { pack: p.pack, seed: b.dataset.seed }).then(function (r) { v.querySelector('.kv-msg').textContent = r.message || ''; if (r.ok) b.textContent = '🌱 Growing…'; else b.disabled = false; })
        .catch(function () { v.querySelector('.kv-msg').textContent = 'Couldn\'t reach the kiosk.'; b.disabled = false; }); }); });
  }
  if (!document.querySelector('.sc-behind')) $('#k-stash').addEventListener('click', openStash);   // the 3D kiosk's stash box lives in stash.js

  // ---------- the Scrapbook drawer
  $('#k-drawer').addEventListener('click', function () {
    SFX.drawer(); loadState().then(function () {
      var clips = (STATE.clips || []).slice().reverse();
      var v = sheet('drawer', 'The drawer under the counter', 'Your Scrapbook', clips.length ? '<ul class="kv-list">' + clips.map(function (c) {
        return '<li data-id="' + esc(c.id) + '"><small>' + esc(c.paper) + ' · ' + esc(String(c.at).slice(0, 10)) + ' · ' + esc(c.kind) + '</small><a href="' + esc(c.url) + '">' + esc(c.title) + '</a>' +
          (c.text ? '<br><i>' + esc(c.text.slice(0, 240)) + '</i>' : '') + ' <button type="button" class="kv-btn ghost" data-un="' + esc(c.id) + '" style="font-size:11px;padding:4px 8px;margin-top:4px">remove</button></li>'; }).join('') + '</ul>'
        : '<p class="kv-p">Nothing clipped yet. Inside any paper, tap <b>✂ Clip</b> (bottom right) to save a story, recipe, coupon or trail here.</p>');
      $$('[data-un]', v).forEach(function (b) { b.addEventListener('click', function () { post('/api/unclip', { id: b.dataset.un }).then(function () { b.closest('li').remove(); loadState(); }); }); });
    });
  });

  // ---------- Letters to the Editor (the brass mail slot)
  $('#k-mail').addEventListener('click', function () {
    var v = sheet('letter', 'Letters to the Editor', 'Dear Double Wide…', '<textarea id="lt-text" maxlength="1500" placeholder="Write your letter… Ganja prints the good ones (and answers them) in tomorrow\'s Opinion page."></textarea>' +
      '<div class="kv-row"><label style="font:600 12px Oswald;letter-spacing:.1em">TO&nbsp;</label><select id="lt-to" style="max-width:220px"><option>The Editor</option>' +
      AGENTS.map(function (a) { return '<option>' + esc(a) + '</option>'; }).join('') + '</select><button type="button" class="kv-btn" id="lt-send">📬 Drop it in the slot</button></div><div class="kv-msg" id="lt-msg"></div>', 'kv-letter');
    v.querySelector('#lt-send').onclick = function () { var t = v.querySelector('#lt-text').value.trim(); if (t.length < 3) return;
      post('/api/letter', { text: t, to: v.querySelector('#lt-to').value }).then(function (r) { SFX.slot(); v.querySelector('#lt-msg').textContent = r.message || 'Posted.'; v.querySelector('#lt-text').value = ''; setTimeout(function () { close(v); toast(r.message || 'Posted.'); }, 1200); })
        .catch(function () { v.querySelector('#lt-msg').textContent = 'The slot is jammed — try again.'; }); };
  });

  // ---------- the tip line (payphone)
  $('#k-phone').addEventListener('click', function () {
    var p = $('#k-phone'); p.classList.add('ring'); SFX.ring();
    var v = sheet('phone', 'The tip line · free calls', 'Phone in a tip', '<p class="kv-p">Got a story, a job for an agent, or something the paper should chase? Pick a desk — Ganja assigns it in the next Double Wide and the agent follows up.</p>' +
      '<div class="kv-row"><select id="tp-to">' + AGENTS.map(function (a) { return '<option>' + esc(a) + '</option>'; }).join('') + '</select></div>' +
      '<textarea id="tp-text" maxlength="1500" style="margin-top:10px" placeholder="e.g. Maple — check whether the Bradbury trails are muddy this weekend."></textarea>' +
      '<div class="kv-row"><button type="button" class="kv-btn" id="tp-send">☎ Phone it in</button></div><div class="kv-msg" id="tp-msg"></div>', 'kv-phone');
    v.onclosed = function () { p.classList.remove('ring'); };
    v.querySelector('#tp-send').onclick = function () { var t = v.querySelector('#tp-text').value.trim(); if (t.length < 3) return;
      post('/api/tip', { text: t, agent: v.querySelector('#tp-to').value }).then(function (r) { SFX.bell(); v.querySelector('#tp-msg').textContent = r.message || 'Got it.'; v.querySelector('#tp-text').value = ''; })
        .catch(function () { v.querySelector('#tp-msg').textContent = 'Line\'s busy — try again.'; }); };
  });

  // ---------- search every paper
  var INDEX = null;
  $('#k-search').addEventListener('click', function () {
    var v = sheet('search', 'Every paper, every issue', 'Search the stand', '<input id="sr-q" type="search" placeholder="theBAK3RY, Tailscale, trail, recipe…" autocomplete="off">' +
      '<div class="kv-msg" id="sr-msg"></div><ul class="kv-list" id="sr-out"></ul>', 'kv-search');
    var q = v.querySelector('#sr-q'), out = v.querySelector('#sr-out'), msg = v.querySelector('#sr-msg'); setTimeout(function () { q.focus(); }, 50);
    (INDEX ? Promise.resolve(INDEX) : get('/search.json').then(function (x) { INDEX = x; return x; })).then(function (ix) { msg.textContent = (ix.pages || []).length + ' pages on the stand'; })
      .catch(function () { msg.textContent = 'The index is still being printed — try again later.'; });
    var t; q.oninput = function () { clearTimeout(t); t = setTimeout(run, 180); };
    function run() {
      var s = q.value.trim().toLowerCase(); out.innerHTML = ''; if (!INDEX || s.length < 2) return;
      var words = s.split(/\s+/), hits = [];
      (INDEX.pages || []).forEach(function (pg) { var hay = (pg.title + ' ' + pg.text).toLowerCase(); if (words.every(function (w) { return hay.indexOf(w) >= 0; })) hits.push(pg); });
      msg.textContent = hits.length + ' found';
      out.innerHTML = hits.slice(0, 60).map(function (pg) { var i = pg.text.toLowerCase().indexOf(words[0]), sn = pg.text.slice(Math.max(0, i - 70), i + 150);
        var re = new RegExp('(' + words.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'gi');
        return '<li><small>' + esc(pg.paper) + ' · ' + esc(pg.date || '') + '</small><a href="' + esc(pg.url) + '">' + esc(pg.title) + '</a><br>' + esc(sn).replace(re, '<mark>$1</mark>') + '…</li>'; }).join('');
    }
  });

  // ---------- newsboy morning: the first visit each day, today's paper gets tossed onto the rack
  function newsboy() {
    var today = new Date().toDateString(), dw = LATEST['double-wide'];
    if (!dw || store.get('ns-toss', '') === today) return;
    store.set('ns-toss', today);
    var roll = $('#k-newsroll'), target = $('.mag[data-id="double-wide"]'); if (!roll || !target) return;
    setTimeout(function () {
      roll.classList.add('throw');
      setTimeout(function () { SFX.thwack(); target.classList.add('thwack'); toast('🗞 Today\'s Double Wide just hit the rack!'); }, 1000);
      setTimeout(function () { roll.classList.add('gone'); target.classList.remove('thwack'); }, 2400);
    }, 900);
  }
  addEventListener('pointerdown', function unlock() { ac(); removeEventListener('pointerdown', unlock); }, { once: true });

  // ---------- the register (front) and the smoke-shop shelf: ring things up; the cash box (behind): the Garden Bucks ledger
  function ledgerRows(n) {
    return ((STATE.wallet && STATE.wallet.ledger) || []).slice(-n).reverse().map(function (x) {
      return '<li><small>' + esc(String(x.at).replace('T', ' ').slice(0, 16)) + '</small><b class="' + (x.delta < 0 ? 'neg' : 'pos') + '">' + (x.delta > 0 ? '+' : '') + x.delta +
        '</b> ' + esc(x.note) + ' <span class="led-bal">= ' + x.balance + '</span></li>'; }).join('') || '<li>No receipts yet.</li>';
  }
  function register() {
    SFX.bell(); setTimeout(function () { SFX.slot(); }, 250);
    loadState().then(function () {
      var shop = STATE.shop || {}, have = {};
      ((STATE.stash || {}).goods || []).forEach(function (g) { have[g.item] = (have[g.item] || 0) + 1; });
      var v = sheet('register', 'Behind the glass', 'The Smoke Shop', '<div class="reg-bal"><small>Garden Bucks on account</small><b>' + STATE.wallet.balance + '</b></div>' +
        '<h3 class="reg-h">The smoke shop</h3><div class="reg-shop">' + Object.keys(shop).map(function (k) { var it = shop[k];
          return '<div class="reg-item"><div class="reg-ico reg-' + k + '"></div><div><b>' + esc(it.name) + '</b><p>' + esc(it.blurb) + '</p><small>' + (have[k] ? have[k] + ' in your stash' : '') + '</small></div>' +
            '<button type="button" class="kv-btn" data-buy="' + k + '">' + it.price + ' GB</button></div>'; }).join('') + '</div><div class="kv-msg" id="reg-msg"></div>' +
        '<h3 class="reg-h">Receipts</h3><ul class="kv-list reg-led">' + ledgerRows(8) + '</ul>', 'kv-register');
      $$('[data-buy]', v).forEach(function (b) { b.addEventListener('click', function () { b.disabled = true;
        post('/api/shop', { item: b.dataset.buy }).then(function (r) { v.querySelector('#reg-msg').textContent = r.message || ''; if (r.ok) { SFX.slot(); setTimeout(register, 900); } else b.disabled = false; })
          .catch(function () { b.disabled = false; }); }); });
    });
  }
  if ($('#k-register')) $('#k-register').addEventListener('click', register);
  if ($('#k-shop')) $('#k-shop').addEventListener('click', register);
  if ($('#k-cash') && !$('#pos-scr')) $('#k-cash').addEventListener('click', function () {   // with the terminal, pos.js owns the drawer
    SFX.lid(); loadState().then(function () {
      sheet('cash', 'Under the counter', 'The Cash Box', '<div class="reg-bal"><small>Garden Bucks</small><b>' + STATE.wallet.balance + '</b></div>' +
        '<p class="kv-p">Pretend money, shared with Dime Bags. You earn <b>10 a day</b> for reading a paper (bonuses at 7, 14 and 30-day streaks) plus whatever you win at the Dime Bags window; ' +
        'you spend it on seed packs and at the smoke shop.</p><ul class="kv-list reg-led">' + ledgerRows(40) + '</ul><p class="kv-p"><a href="/dime-bags/">🏇 The Dime Bags window ›</a></p>', 'kv-register');
    });
  });
  // ---------- Clyde's bowls
  if ($('#k-bowl')) $('#k-bowl').addEventListener('click', function () {
    var n = store.get('clyde-treats', 0);
    var v = sheet('bowl', "Clyde's corner", 'Food, water & a bone', '<p class="kv-p">Clydius keeps his bowls behind the counter, right where he can watch the door. ' +
      'The food bowl says <b>CLYDE</b>. The water is fresh every morning.</p><p class="kv-p">Treats given: <b id="clyde-n">' + n + '</b></p>' +
      '<div class="kv-row"><button type="button" class="kv-btn" id="clyde-treat">🦴 Give Clyde a treat</button><a class="kv-btn ghost" href="/zines/">📰 Good Boy Gazette</a></div><div class="kv-msg" id="clyde-msg"></div>');
    v.querySelector('#clyde-treat').onclick = function () { n++; store.set('clyde-treats', n); v.querySelector('#clyde-n').textContent = n;
      SFX.thwack(); var W = ['WOOF!', 'Woof woof!', 'Arf! (happy tail thumps)', '*crunch* … WOOF.', 'Awoo!'];
      v.querySelector('#clyde-msg').textContent = '🐶 ' + W[n % W.length]; };
  });
  // ---------- the tear-off flyer above the payphone
  (function flyer() {
    var fl = $('#k-flyer'); if (!fl) return;
    get('/flyer.json').then(function (f) {
      var torn = store.get('flyer-torn', {}); if (torn.date !== f.date) torn = { date: f.date, tabs: [] };
      $('#fl-kind').textContent = f.kind || 'NOTICE'; $('#fl-title').textContent = f.title || ''; $('#fl-text').textContent = f.text || '';
      $('#fl-tabs').innerHTML = (f.tabs || []).map(function (t, i) { return '<a class="fl-tab' + (torn.tabs.indexOf(i) >= 0 ? ' gone' : '') + '" data-i="' + i + '" href="' + esc(f.url) + '"><span>' + esc(String(f.title || '').slice(0, 22)) + '</span><b>' + esc(t) + '</b></a>'; }).join('');
      $$('.fl-tab', fl).forEach(function (a) { a.addEventListener('click', function (e) {
        e.preventDefault(); var i = +a.dataset.i; if (torn.tabs.indexOf(i) < 0) torn.tabs.push(i); store.set('flyer-torn', torn);
        a.classList.add('tearing'); SFX.puff(); toast('📞 You tore off ' + a.querySelector('b').textContent + ' — ' + (f.who ? 'ask for ' + f.who : 'give them a ring'));
        setTimeout(function () { location.href = a.getAttribute('href'); }, 900); }); });
    }).catch(function () {});
  })();
  window.kiosk = { sheet: sheet, close: close, post: post, get: get, esc: esc, toast: toast, sfx: SFX, state: function () { return STATE; }, loadState: loadState,
                   catalog: function () { return CATALOG; }, store: store };
  loadState();
})();
