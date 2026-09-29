/* The little TV hanging in the kiosk window. Channels: 2 Static · 3 Off the Air (color bars + tone) · 4 Toon Town (public-domain classic
   cartoons, playing "live" like real TV) · 5 WDWN News at Six (headlines + the news-radio audio) · 6 The Weather Channel (a retro local
   forecast for Lewiston from weather.gov, smooth music) · 7 Token Ticker · 8 The Funnies Network · 9 Garden Cam.
   The small screen in the window plays silently; tap the TV for the big screen, the remote and the sound. Data: /tv.json. */
(function () {
  'use strict';
  var small = document.getElementById('tv-small'), hot = document.getElementById('k-tv'); if (!small) return;
  var DATA = null, WX = null, ch = 4, big = null, bigBox = null, cleanup = [], audio = null, AC = null, tone = null;
  var CH = { 2: 'STATIC', 3: 'OFF THE AIR', 4: 'TOON TOWN', 5: 'WDWN NEWS', 6: 'WEATHER', 7: 'TOKEN TICKER', 8: 'FUNNIES', 9: 'GARDEN CAM' };
  var order = [2, 3, 4, 5, 6, 7, 8, 9];
  function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }
  function get(u) { return fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw r.status; return r.json(); }); }
  function secsToday() { var t = new Date(); return t.getHours() * 3600 + t.getMinutes() * 60 + t.getSeconds(); }
  try { ch = +(localStorage.getItem('tv-ch') || 4) || 4; } catch (e) {}

  // ---- the programs: each fills a box; `loud` = the big screen (sound on)
  var PROGRAMS = {
    2: function (box, loud) {
      var c = document.createElement('canvas'); c.width = 96; c.height = 72; c.className = 'tv-noise'; box.appendChild(c);
      var x = c.getContext('2d'), img = x.createImageData(96, 72), run = true;
      (function frame() { if (!run) return; for (var i = 0; i < img.data.length; i += 4) { var v = Math.random() * 255 | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
        x.putImageData(img, 0, 0); setTimeout(function () { requestAnimationFrame(frame); }, 45); })();
      if (loud) hiss(); return function () { run = false; };
    },
    3: function (box, loud) {
      box.innerHTML = '<div class="tv-bars"><div class="b1"><i style="background:#c0c0c0"></i><i style="background:#c0c000"></i><i style="background:#00c0c0"></i><i style="background:#00c000"></i>' +
        '<i style="background:#c000c0"></i><i style="background:#c00000"></i><i style="background:#0000c0"></i></div><div class="b2"><i style="background:#0000c0"></i><i style="background:#131313"></i>' +
        '<i style="background:#c000c0"></i><i style="background:#131313"></i><i style="background:#00c0c0"></i><i style="background:#131313"></i><i style="background:#c0c0c0"></i></div>' +
        '<div class="tv-card">THE GARDEN<br><small>OFF THE AIR · PLEASE STAND BY</small></div></div>';
      if (loud) beep(); return null;
    },
    4: function (box, loud) {
      var list = (DATA && DATA.cartoons) || []; if (!list.length) { box.innerHTML = '<div class="tv-card">NO SIGNAL</div>'; return null; }
      var total = list.reduce(function (a, c) { return a + c.secs; }, 0), t = secsToday() % total, i = 0;
      while (t > list[i].secs) { t -= list[i].secs; i = (i + 1) % list.length; }
      var vid = document.createElement('video'); vid.className = 'tv-vid'; vid.muted = !loud; vid.playsInline = true; vid.autoplay = true; vid.preload = 'auto';
      var play = function (k, at) { vid.src = list[k].url; vid.currentTime = at || 0; vid.play().catch(function () {}); lab.textContent = '📺 ' + list[k].title; };
      var lab = document.createElement('div'); lab.className = 'tv-lab';
      box.appendChild(vid); box.appendChild(lab);
      vid.addEventListener('loadedmetadata', function () { if (t && vid.currentTime < 1) vid.currentTime = t; t = 0; });
      vid.addEventListener('ended', function () { i = (i + 1) % list.length; play(i, 0); });
      play(i, t); return function () { vid.pause(); vid.removeAttribute('src'); vid.load(); };
    },
    5: function (box, loud) {
      var hs = (DATA && DATA.headlines) || [], k = 0;
      box.innerHTML = '<div class="tv-news"><div class="nw-top"><b>WDWN</b> NEWS AT SIX<span class="nw-live">● LIVE</span></div><div class="nw-desk"><img alt="" src="/double-wide/img/gardener.png">' +
        '<div class="nw-story"><small class="nw-tag"></small><h4 class="nw-h"></h4><p class="nw-d"></p></div></div><div class="nw-crawl"><span>' +
        hs.map(function (h) { return esc(h.title); }).join('  ✦  ') + '</span></div></div>';
      var show = function () { var h = hs[k % Math.max(1, hs.length)] || { title: 'Good evening, Garden.' }; box.querySelector('.nw-tag').textContent = h.tag || 'TOP STORY';
        box.querySelector('.nw-h').textContent = h.title; box.querySelector('.nw-d').textContent = h.dek || ''; k++; };
      show(); var iv = setInterval(show, 7000);
      if (loud) get('/radio/today.json').then(function (r) { var n = (r.stations || []).filter(function (s) { return s.id === 'news'; })[0]; if (n) sound('/radio/' + n.file, (secsToday() % (n.dur || 300))); }).catch(function () {});
      return function () { clearInterval(iv); };
    },
    6: function (box, loud) {
      box.innerHTML = '<div class="tv-wx"><div class="wx-top">THE WEATHER CHANNEL · LOCAL FORECAST</div><div class="wx-city">LEWISTON, MAINE</div><div class="wx-now"></div><div class="wx-per"></div>' +
        '<div class="wx-clock"></div></div>';
      var paint = function () { var w = WX || {}; box.querySelector('.wx-now').innerHTML = w.now ? '<b>' + esc(w.now.temp) + '°F</b><span>' + esc(w.now.text) + '</span><small>Wind ' + esc(w.now.wind || '—') + '</small>' : 'Getting the latest…';
        box.querySelector('.wx-per').innerHTML = (w.periods || []).slice(0, 3).map(function (p) { return '<div><b>' + esc(p.name) + '</b><span>' + esc(p.temp) + '°</span><small>' + esc(p.short) + '</small></div>'; }).join('');
        box.querySelector('.wx-clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
      paint(); var iv = setInterval(paint, 5000); weather().then(paint);
      if (loud) sound('/api/stream/tvjazz', null); return function () { clearInterval(iv); };
    },
    7: function (box) {
      box.innerHTML = '<div class="tv-tick"><div class="tk-top">GTA · THE GARDEN TOKEN AVERAGE</div><div class="tk-rows">loading…</div></div>';
      if (DATA && DATA.usage) get(DATA.usage).then(function (u) { var a = u.by_agent || {}, ks = Object.keys(a).sort(function (x, y) { return a[y] - a[x]; }), mx = a[ks[0]] || 1;
        box.querySelector('.tk-rows').innerHTML = ks.slice(0, 7).map(function (k2) { return '<div><span>' + esc(k2.toUpperCase().slice(0, 12)) + '</span><i style="width:' + Math.round(a[k2] / mx * 100) + '%"></i><b>' +
          (a[k2] >= 1e6 ? (a[k2] / 1e6).toFixed(1) + 'M' : Math.round(a[k2] / 1e3) + 'k') + ' ▲</b></div>'; }).join(''); }).catch(function () {});
      return null;
    },
    8: function (box) {
      var f = (DATA && DATA.funnies) || [], k = Math.floor(Math.random() * Math.max(1, f.length));
      box.innerHTML = '<div class="tv-fun"><img alt=""><div class="tv-lab">THE FUNNIES NETWORK</div></div>'; var img = box.querySelector('img');
      var show = function () { if (f.length) { img.src = f[k % f.length]; k++; } }; show(); var iv = setInterval(show, 9000); return function () { clearInterval(iv); };
    },
    9: function (box) {
      var night = document.body.classList.contains('t-night');
      box.innerHTML = '<div class="tv-cam"><img alt="" src="/scene/desk-' + (night ? 'night' : 'day') + '.jpg"><div class="cam-rec">● REC  CAM 1 · STREET</div><div class="cam-ts"></div></div>';
      var ts = box.querySelector('.cam-ts'); var iv = setInterval(function () { ts.textContent = new Date().toLocaleString(); }, 1000); return function () { clearInterval(iv); };
    }
  };
  // ---- sound: one stream at a time, only while the big screen is open
  function ac() { if (!AC) AC = (window.kioskAudio && window.kioskAudio()) || new (window.AudioContext || window.webkitAudioContext)(); return AC; }
  function sound(src, at) { stopSound(); audio = new Audio(src); audio.volume = 0.8; if (at != null) audio.addEventListener('loadedmetadata', function () { try { audio.currentTime = at; } catch (e) {} }, { once: true }); audio.play().catch(function () {}); }
  function hiss() { var c = ac(); if (!c) return; var n = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = n.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.15;
    var s = c.createBufferSource(), g = c.createGain(); s.buffer = n; s.loop = true; g.gain.value = 0.5; s.connect(g); g.connect(c.destination); s.start(); tone = { stop: function () { s.stop(); } }; }
  function beep() { var c = ac(); if (!c) return; var o = c.createOscillator(), g = c.createGain(); o.frequency.value = 1000; g.gain.value = 0.05; o.connect(g); g.connect(c.destination); o.start(); tone = { stop: function () { o.stop(); } }; }
  function stopSound() { if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); audio = null; } if (tone) { try { tone.stop(); } catch (e) {} tone = null; } }
  function weather() {
    if (WX) return Promise.resolve(WX);
    return Promise.all([fetch('https://api.weather.gov/stations/KLEW/observations/latest').then(function (r) { return r.json(); }),
                        fetch('https://api.weather.gov/points/44.1004,-70.2148').then(function (r) { return r.json(); }).then(function (p) { return fetch(p.properties.forecast); }).then(function (r) { return r.json(); })])
      .then(function (r) { var o = r[0].properties || {}, c = o.temperature && o.temperature.value;
        WX = { now: { temp: c == null ? '—' : Math.round(c * 9 / 5 + 32), text: o.textDescription || '', wind: o.windSpeed && o.windSpeed.value != null ? Math.round(o.windSpeed.value / 1.609) + ' mph' : '' },
               periods: ((r[1].properties || {}).periods || []).map(function (p) { return { name: p.name, temp: p.temperature, short: p.shortForecast }; }) }; return WX; })
      .catch(function () { return WX = WX || {}; });
  }
  // ---- tuning
  function tune(box, loud) { var fn = PROGRAMS[ch]; box.innerHTML = ''; box.dataset.ch = ch; var c = fn ? fn(box, loud) : null; return c; }
  function paintSmall() { cleanup.forEach(function (c) { if (c) c(); }); cleanup = [tune(small, false)]; }
  function paintBig() { if (!bigBox) return; stopSound(); if (big && big.clean) big.clean(); big.clean = tune(bigBox, true); big.querySelector('.tv-chn').textContent = 'CH ' + ch + ' · ' + CH[ch]; }
  function flip(d) { var i = order.indexOf(ch); ch = order[(i + d + order.length) % order.length]; try { localStorage.setItem('tv-ch', ch); } catch (e) {} paintSmall(); paintBig(); }
  function openBig() {
    if (!window.kiosk) return;
    big = window.kiosk.sheet('tv', 'The kiosk TV', 'Channel ' + ch, '<div class="tv-big"><div class="tv-bezel"><div class="tv-screen" id="tv-bigbox"></div><div class="tv-glass"></div></div>' +
      '<div class="tv-remote"><button type="button" data-tv="down">CH ▼</button><span class="tv-chn"></span><button type="button" data-tv="up">CH ▲</button>' +
      '<button type="button" data-tv="off">⏻ Off</button></div><p class="kv-p tv-note">Toon Town plays public-domain classic cartoons from the Internet Archive; the Weather Channel is live from weather.gov.</p></div>', 'kv-tv');
    bigBox = big.querySelector('#tv-bigbox'); if (window.gardenRadio) window.gardenRadio.off();
    Array.prototype.forEach.call(big.querySelectorAll('[data-tv]'), function (b) { b.onclick = function () {
      if (b.dataset.tv === 'off') { window.kiosk.close(big); return; } flip(b.dataset.tv === 'up' ? 1 : -1); big.querySelector('.kv-h').textContent = 'Channel ' + ch; }; });
    big.onclosed = function () { stopSound(); if (big.clean) big.clean(); bigBox = null; };
    paintBig();
  }
  get('/tv.json').then(function (d) { DATA = d; paintSmall(); }).catch(function () { paintSmall(); });
  weather();
  [hot, document.getElementById('k-tvq')].forEach(function (b) { if (b) b.addEventListener('click', function (e) { e.stopPropagation(); openBig(); }); });
})();
