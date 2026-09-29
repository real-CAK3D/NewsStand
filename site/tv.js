/* The little TV hanging in the kiosk window. Channels:
    2 Static · 3 Off the Air · 4 Toon Town (public-domain cartoons) · 5 WDWN News at Six · 6 The Weather Channel (live, weather.gov)
    7 GNBC Markets (the Garden Token Average as a live stock market) · 8 Garden MTV (music videos, the artists' own YouTube uploads)
    9 Chopper 7 (a live police chase) · 10 Garden Kitchen (Baked Goods recipes, cooked on air) · 11 Commercial Break (vintage ads)
   12 The Garden Shopping Network · 13 The Late Movie (public-domain features) · 14 The Fireplace (the security cameras live on the computer)
   Everything with a schedule plays "live": tune in and you land mid-show, like real TV. The small screen in the window plays silently;
   tap the TV for the big screen, the remote and the sound. Data: /tv.json. */
(function () {
  'use strict';
  var small = document.getElementById('tv-small'), hot = document.getElementById('k-tv'); if (!small) return;
  var DATA = null, WX = null, USAGE = null, ch = 4, big = null, bigBox = null, cleanup = [], audio = null, AC = null, tone = null;
  var CH = { 2: 'STATIC', 3: 'OFF THE AIR', 4: 'TOON TOWN', 5: 'WDWN NEWS', 6: 'WEATHER', 7: 'GNBC MARKETS', 8: 'GARDEN MTV', 9: 'CHOPPER 7',
             10: 'GARDEN KITCHEN', 11: 'COMMERCIALS', 12: 'SHOPPING', 13: 'LATE MOVIE', 14: 'FIREPLACE' };
  var order = Object.keys(CH).map(Number);
  function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }
  function get(u) { return fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw r.status; return r.json(); }); }
  function secsToday() { var t = new Date(); return t.getHours() * 3600 + t.getMinutes() * 60 + t.getSeconds(); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function listy(v) { if (Array.isArray(v)) return v; try { return JSON.parse(String(v).replace(/'/g, '"')); } catch (e) { return String(v || '').split(/\n+/).filter(Boolean); } }
  function every(ms, fn) { var iv = setInterval(fn, ms); return function () { clearInterval(iv); }; }
  function loop(fn) { var run = true; (function f(t) { if (!run) return; fn(t); requestAnimationFrame(f); })(0); return function () { run = false; }; }
  try { ch = +(localStorage.getItem('tv-ch') || 4) || 4; if (!CH[ch]) ch = 4; } catch (e) {}

  // a schedule of clips that has been playing since midnight: where are we now?
  function nowIn(list) { var total = list.reduce(function (a, c) { return a + c.secs; }, 0), t = secsToday() % Math.max(1, total), i = 0;
    while (list.length && t > list[i].secs) { t -= list[i].secs; i = (i + 1) % list.length; } return { i: i, t: t }; }
  function videoChannel(box, loud, list, label) {
    if (!list || !list.length) { box.innerHTML = '<div class="tv-card">NO SIGNAL</div>'; return null; }
    var at = nowIn(list), i = at.i, t = at.t;
    var vid = el('video', 'tv-vid'); vid.muted = !loud; vid.playsInline = true; vid.autoplay = true; vid.preload = 'auto';
    var lab = el('div', 'tv-lab');
    var play = function (k, off) { vid.src = list[k].url; vid.play().catch(function () {}); lab.textContent = label(list[k]); t = off || 0; };
    box.appendChild(vid); box.appendChild(lab);
    vid.addEventListener('loadedmetadata', function () { if (t && vid.currentTime < 1) { try { vid.currentTime = t; } catch (e) {} } t = 0; });
    vid.addEventListener('ended', function () { i = (i + 1) % list.length; play(i, 0); });
    vid.addEventListener('error', function () { i = (i + 1) % list.length; setTimeout(function () { play(i, 0); }, 800); });
    play(i, t); return function () { vid.pause(); vid.removeAttribute('src'); vid.load(); };
  }

  var PROGRAMS = {
    2: function (box, loud) {
      var c = el('canvas', 'tv-noise'); c.width = 96; c.height = 72; box.appendChild(c);
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
    4: function (box, loud) { return videoChannel(box, loud, DATA && DATA.cartoons, function (c) { return '📺 TOON TOWN · ' + c.title; }); },
    5: function (box, loud) {
      var hs = (DATA && DATA.headlines) || [], k = 0;
      box.innerHTML = '<div class="tv-news"><div class="nw-top"><b>WDWN</b> NEWS AT SIX<span class="nw-live">● LIVE</span></div><div class="nw-desk"><img alt="" src="/double-wide/img/gardener.png">' +
        '<div class="nw-story"><small class="nw-tag"></small><h4 class="nw-h"></h4><p class="nw-d"></p></div></div><div class="nw-crawl"><span>' +
        hs.map(function (h) { return esc(h.title); }).join('  ✦  ') + '</span></div></div>';
      var show = function () { var h = hs[k % Math.max(1, hs.length)] || { title: 'Good evening, Garden.' }; box.querySelector('.nw-tag').textContent = h.tag || 'TOP STORY';
        box.querySelector('.nw-h').textContent = h.title; box.querySelector('.nw-d').textContent = h.dek || ''; k++; };
      show(); var stop = every(7000, show);
      if (loud) get('/radio/today.json').then(function (r) { var n = (r.stations || []).filter(function (s) { return s.id === 'news'; })[0]; if (n) sound('/radio/' + n.file, (secsToday() % (n.dur || 300))); }).catch(function () {});
      return stop;
    },
    6: function (box, loud) {
      box.innerHTML = '<div class="tv-wx"><div class="wx-top">THE WEATHER CHANNEL · LOCAL FORECAST</div><div class="wx-city">LEWISTON, MAINE</div><div class="wx-now"></div><div class="wx-per"></div>' +
        '<div class="wx-clock"></div></div>';
      var paint = function () { var w = WX || {}; box.querySelector('.wx-now').innerHTML = w.now ? '<b>' + esc(w.now.temp) + '°F</b><span>' + esc(w.now.text) + '</span><small>Wind ' + esc(w.now.wind || '—') + '</small>' : 'Getting the latest…';
        box.querySelector('.wx-per').innerHTML = (w.periods || []).slice(0, 3).map(function (p) { return '<div><b>' + esc(p.name) + '</b><span>' + esc(p.temp) + '°</span><small>' + esc(p.short) + '</small></div>'; }).join('');
        box.querySelector('.wx-clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
      paint(); var stop = every(5000, paint); weather().then(paint);
      if (loud) sound('/api/stream/tvjazz', null); return stop;
    },
    7: market,
    8: mtv,
    9: chase,
    10: kitchen,
    11: function (box, loud) { return videoChannel(box, loud, DATA && DATA.ads, function (c) { return 'COMMERCIAL BREAK · ' + c.title; }); },
    12: shopping,
    13: function (box, loud) { return videoChannel(box, loud, DATA && DATA.movies, function (c) { return '🎬 THE LATE MOVIE · ' + c.title; }); },
    14: fireplace
  };

  // ---------- 7: GNBC — the Garden Token Average, traded live
  function market(box) {
    var a = (USAGE && USAGE.by_agent) || {}, names = Object.keys(a).sort(function (x, y) { return a[y] - a[x]; }).slice(0, 10);
    if (!names.length) names = ['ganja', 'gardiner', 'maple', 'cyph3r', 'chronic', 'big', 'herbie', 'homie'];
    var stocks = names.map(function (n, k) {
      var sym = n.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 4), base = a[n] ? a[n] / 1e4 : 40 + k * 9;
      return { sym: sym, px: base, open: base * (0.96 + Math.random() * 0.06) };
    });
    var idx = [{ n: 'GTA', v: 42069.5 }, { n: 'S&P 420', v: 4204.2 }, { n: 'NAS-DAB', v: 13337.1 }, { n: 'CLYDE 100', v: 1001.9 }];
    idx.forEach(function (x) { x.open = x.v * (0.992 + Math.random() * 0.012); });
    box.innerHTML = '<div class="tv-mkt"><div class="mk-top"><b>GNBC</b><span>MARKETS LIVE</span><i class="mk-clock"></i></div>' +
      '<div class="mk-main"><div class="mk-idx"><small>GTA · GARDEN TOKEN AVERAGE</small><b class="mk-big"></b><span class="mk-chg"></span></div><canvas class="mk-chart" width="360" height="130"></canvas></div>' +
      '<div class="mk-board"></div><div class="mk-tape"><span class="mk-tape-in"></span></div></div>';
    var cv = box.querySelector('.mk-chart'), cx = cv.getContext('2d'), hist = [], board = box.querySelector('.mk-board'), tape = box.querySelector('.mk-tape-in');
    for (var i = 0; i < 120; i++) hist.push(idx[0].v + (idx[0].open - idx[0].v) * (1 - i / 119) + Math.sin(i / 9) * 22 * (1 - i / 119) + (Math.random() - 0.5) * 30 * (1 - i / 119));   // the day so far, ending where it is now
    function fmt(v) { return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    function chg(v, o) { var d = v - o, p = d / o * 100; return '<em class="' + (d >= 0 ? 'up' : 'dn') + '">' + (d >= 0 ? '▲' : '▼') + ' ' + fmt(Math.abs(d)) + ' (' + p.toFixed(2) + '%)</em>'; }
    function tick() {
      idx.forEach(function (x) { x.v *= 1 + (Math.random() - 0.48) * 0.0016; });
      stocks.forEach(function (s) { s.last = s.px; s.px *= 1 + (Math.random() - 0.485) * 0.012; });
      hist.push(idx[0].v); if (hist.length > 160) hist.shift();
      box.querySelector('.mk-big').textContent = fmt(idx[0].v); box.querySelector('.mk-chg').innerHTML = chg(idx[0].v, idx[0].open);
      box.querySelector('.mk-clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }) + ' ET';
      function pc(v, o) { var p = (v - o) / o * 100; return '<em class="' + (p >= 0 ? 'up' : 'dn') + '">' + (p >= 0 ? '▲' : '▼') + Math.abs(p).toFixed(2) + '%</em>'; }
      board.innerHTML = idx.slice(1).map(function (x) { return '<div class="mk-row mk-ix"><span>' + x.n + '</span><b>' + fmt(x.v) + '</b>' + pc(x.v, x.open) + '</div>'; }).join('') +
        stocks.slice(0, 6).map(function (s) { var up = s.px >= s.last; return '<div class="mk-row ' + (up ? 'flash-up' : 'flash-dn') + '"><span>' + s.sym + '</span><b>' + s.px.toFixed(2) + '</b>' + pc(s.px, s.open) + '</div>'; }).join('');
      var W = cv.width, H = cv.height, mn = Math.min.apply(null, hist), mx = Math.max.apply(null, hist);
      cx.clearRect(0, 0, W, H); cx.strokeStyle = 'rgba(255,255,255,.12)'; cx.lineWidth = 1;
      for (var g = 1; g < 4; g++) { cx.beginPath(); cx.moveTo(0, g * H / 4); cx.lineTo(W, g * H / 4); cx.stroke(); }
      var up = idx[0].v >= idx[0].open; cx.beginPath();
      hist.forEach(function (v, k) { var x = k / (hist.length - 1) * W, y = H - 6 - (v - mn) / Math.max(1, mx - mn) * (H - 12); if (k) cx.lineTo(x, y); else cx.moveTo(x, y); });
      cx.strokeStyle = up ? '#35e07a' : '#ff4d4d'; cx.lineWidth = 2.2; cx.stroke(); cx.lineTo(W, H); cx.lineTo(0, H); cx.closePath();
      var gr = cx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, up ? 'rgba(53,224,122,.35)' : 'rgba(255,77,77,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); cx.fillStyle = gr; cx.fill();
    }
    tape.innerHTML = stocks.concat(stocks).map(function (s) { return '<span>' + s.sym + ' <b>' + s.px.toFixed(2) + '</b> ' + (s.px >= s.open ? '<em class="up">▲</em>' : '<em class="dn">▼</em>') + '</span>'; }).join('');
    tick(); return every(1000, tick);
  }

  // ---------- 8: Garden MTV — music videos (embedded from the artists' own YouTube channels), with the classic lower-left credit
  function mtv(box, loud) {
    var list = (DATA && DATA.mtv) || []; if (!list.length) { box.innerHTML = '<div class="tv-card">NO SIGNAL</div>'; return null; }
    var at = nowIn(list), ids = list.slice(at.i).concat(list.slice(0, at.i)).map(function (v) { return v.id; });
    var src = 'https://www.youtube-nocookie.com/embed/' + ids[0] + '?autoplay=1&mute=' + (loud ? 0 : 1) + '&start=' + Math.floor(at.t) + '&controls=0&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&disablekb=1&playlist=' + ids.slice(1).join(',') + ',' + ids[0] + '&loop=1';
    box.innerHTML = '<div class="tv-mtv"><iframe title="Garden MTV" src="' + src + '" allow="autoplay; encrypted-media" referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
      '<div class="mtv-bug"><b>M</b><small>GARDEN</small></div><div class="mtv-cred"></div></div>';
    var cred = box.querySelector('.mtv-cred'), start = Date.now(), last = -1;
    function credit() {
      var el2 = (Date.now() - start) / 1000 + at.t, k = 0, left = el2;
      while (left > list[(at.i + k) % list.length].secs) { left -= list[(at.i + k) % list.length].secs; k++; }
      var v = list[(at.i + k) % list.length], show = left < 12 || (left > v.secs - 14 && left < v.secs - 2) || (Date.now() - start < 10000);
      if (k !== last) { last = k; cred.innerHTML = '<b>' + esc(v.artist) + '</b><span>"' + esc(v.title) + '"</span>' + (v.album ? '<small>' + esc(v.album) + '</small>' : '') + '<small>Official video</small>'; }
      cred.classList.toggle('on', show);
    }
    credit(); return every(1000, credit);
  }

  // ---------- 9: Chopper 7 — a live police chase through the streets, from the news helicopter
  function chase(box, loud) {
    box.innerHTML = '<div class="tv-chase"><canvas width="480" height="360"></canvas><div class="ch-live">● LIVE</div><div class="ch-bug">CHOPPER 7</div>' +
      '<div class="ch-lower"><b>POLICE PURSUIT</b><span class="ch-where"></span></div><div class="ch-spd"></div></div>';
    var c = box.querySelector('canvas'), x = c.getContext('2d'), B = 150, R = 34;   // city blocks and road width, in world px
    var ROADS = ['LISBON ST', 'CANAL ST', 'MAIN ST', 'PINE ST', 'ASH ST', 'MIDDLE ST', 'BATES ST', 'PARK ST'];
    var car = { x: 0, y: 0, dir: 0, spd: 3.2, hist: [] }, cops = [{ lag: 26 }, { lag: 50 }, { lag: 78 }], cam = { x: 0, y: 0 }, t0 = performance.now();
    var DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    function atCross(p) { return Math.abs(((p.x % B) + B) % B) < car.spd && Math.abs(((p.y % B) + B) % B) < car.spd; }
    function roof(bx, by) { var h = Math.abs(Math.sin(bx * 12.9 + by * 78.2) * 43758) % 1; return h; }
    var stop = loop(function (now) {
      var t = (now - t0) / 1000;
      car.x += DIRS[car.dir][0] * car.spd; car.y += DIRS[car.dir][1] * car.spd;
      if (atCross(car)) { car.x = Math.round(car.x / B) * B; car.y = Math.round(car.y / B) * B; var r = Math.random();
        if (r < 0.3) car.dir = (car.dir + 1) % 4; else if (r < 0.6) car.dir = (car.dir + 3) % 4; }
      car.hist.unshift({ x: car.x, y: car.y, dir: car.dir }); if (car.hist.length > 120) car.hist.pop();
      cam.x += (car.x - cam.x) * 0.06; cam.y += (car.y - cam.y) * 0.06;
      var W = c.width, H = c.height, sx = W / 2 - cam.x + Math.sin(t * 1.3) * 3, sy = H / 2 - cam.y + Math.cos(t * 1.1) * 3;
      x.fillStyle = '#3a3d3a'; x.fillRect(0, 0, W, H);   // asphalt
      var bx0 = Math.floor((cam.x - W) / B), by0 = Math.floor((cam.y - H) / B);
      for (var bx = bx0; bx < bx0 + 2 * W / B + 2; bx++) for (var by = by0; by < by0 + 2 * H / B + 2; by++) {
        var px = bx * B + R / 2 + sx, py = by * B + R / 2 + sy, s = B - R, h = roof(bx, by);
        x.fillStyle = '#6d6a62'; x.fillRect(px - 4, py - 4, s + 8, s + 8);   // sidewalk
        x.fillStyle = h < 0.2 ? '#4f6b3c' : ['#5a4f47', '#6b6259', '#4c4e55', '#7a6a55'][Math.floor(h * 40) % 4]; x.fillRect(px, py, s, s);   // roofs (and a park)
        if (h >= 0.2) { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(px + 8, py + 8, s * 0.4, s * 0.3); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(px + s * 0.55, py + s * 0.5, s * 0.3, s * 0.35); }
        else { x.fillStyle = '#3e5a2e'; for (var tr = 0; tr < 6; tr++) { x.beginPath(); x.arc(px + 20 + (tr * 37) % (s - 30), py + 20 + (tr * 53) % (s - 30), 9, 0, 7); x.fill(); } }
      }
      x.strokeStyle = 'rgba(255,220,120,.5)'; x.setLineDash([10, 12]); x.lineWidth = 2;   // lane lines
      for (var gx = bx0; gx < bx0 + 2 * W / B + 2; gx++) { x.beginPath(); x.moveTo(gx * B + sx, 0); x.lineTo(gx * B + sx, H); x.stroke(); }
      for (var gy = by0; gy < by0 + 2 * H / B + 2; gy++) { x.beginPath(); x.moveTo(0, gy * B + sy); x.lineTo(W, gy * B + sy); x.stroke(); }
      x.setLineDash([]);
      function drawCar(p, body, cop) {
        x.save(); x.translate(p.x + sx, p.y + sy); x.rotate(p.dir * Math.PI / 2);
        x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(-11, -6, 24, 14);
        x.fillStyle = body; x.fillRect(-12, -7, 24, 14); x.fillStyle = cop ? '#f2f2f2' : '#2b1a1a'; x.fillRect(-4, -6, 10, 12);
        x.fillStyle = 'rgba(160,200,255,.7)'; x.fillRect(5, -5, 3, 10);
        if (cop) { var on = Math.floor(t * 8) % 2; x.fillStyle = on ? '#ff2a2a' : '#2a5cff'; x.fillRect(-1, -6, 3, 6); x.fillStyle = on ? '#2a5cff' : '#ff2a2a'; x.fillRect(-1, 0, 3, 6);
          x.fillStyle = on ? 'rgba(255,40,40,.25)' : 'rgba(40,90,255,.25)'; x.beginPath(); x.arc(0, 0, 26, 0, 7); x.fill(); }
        x.restore();
      }
      cops.forEach(function (cp) { var h2 = car.hist[Math.min(cp.lag, car.hist.length - 1)]; if (h2) drawCar(h2, '#111', true); });
      drawCar(car, '#b3261e', false);
      x.fillStyle = 'rgba(255,255,255,.04)'; for (var n = 0; n < 40; n++) x.fillRect(Math.random() * W, Math.random() * H, 2, 2);   // grain
      var road = ROADS[Math.abs(car.dir % 2 ? Math.round(car.x / B) : Math.round(car.y / B)) % ROADS.length];
      box.querySelector('.ch-where').textContent = road + ' · LEWISTON · ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      box.querySelector('.ch-spd').textContent = Math.round(62 + Math.sin(t / 3) * 18) + ' MPH';
    });
    var siren = null;
    if (loud) { var ctx = ac(); if (ctx) { var o = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = 700; l.frequency.value = 0.6; lg.gain.value = 250; l.connect(lg); lg.connect(o.frequency); g.gain.value = 0.02;
      var n2 = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = n2.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (0.5 + 0.5 * Math.sin(i / 90));
      var rotor = ctx.createBufferSource(), rf = ctx.createBiquadFilter(), rg = ctx.createGain(); rotor.buffer = n2; rotor.loop = true; rf.type = 'lowpass'; rf.frequency.value = 180; rg.gain.value = 0.35;
      rotor.connect(rf); rf.connect(rg); rg.connect(ctx.destination); o.connect(g); g.connect(ctx.destination); o.start(); l.start(); rotor.start();
      siren = function () { try { o.stop(); l.stop(); rotor.stop(); } catch (e) {} }; } }
    return function () { stop(); if (siren) siren(); };
  }

  // ---------- 10: Garden Kitchen — a Baked Goods recipe, cooked on air
  function kitchen(box) {
    var rs = (DATA && DATA.recipes) || []; if (!rs.length) { box.innerHTML = '<div class="tv-card">GARDEN KITCHEN<br><small>BACK AFTER THESE MESSAGES</small></div>'; return null; }
    var slot = Math.floor(secsToday() / 240) % rs.length, r = rs[slot], ing = listy(r.ingredients), steps = listy(r.steps), phase = Math.floor((secsToday() % 240) / 12);
    box.innerHTML = '<div class="tv-cook"><div class="ck-top"><b>GARDEN KITCHEN</b><span>with ' + esc(r.agent || 'CHRONIC') + '</span></div><div class="ck-set">' +
      '<div class="ck-pot"><i></i><i></i><i></i></div><div class="ck-card"></div></div><div class="ck-lower"><b>' + esc(r.title) + '</b><span>' + esc([r.prep, r.difficulty, r.category].filter(Boolean).join(' · ')) + '</span></div></div>';
    var card = box.querySelector('.ck-card');
    var cards = [function () { return '<small>TODAY WE\'RE MAKING</small><h4>' + esc(r.title) + '</h4><p>' + esc(r.intro || '') + '</p>'; },
                 function () { return '<small>YOU\'LL NEED</small><ul>' + ing.slice(0, 6).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }]
      .concat(steps.map(function (s2, k) { return function () { return '<small>STEP ' + (k + 1) + ' OF ' + steps.length + '</small><p class="ck-step">' + esc(String(s2).replace(/`/g, '')) + '</p>'; }; }))
      .concat([function () { return '<small>CHEF\'S TIP</small><p>' + esc(listy(r.tips)[0] || 'Taste as you go.') + '</p><em>Full recipe in Baked Goods</em>'; }]);
    var show = function () { card.innerHTML = cards[phase % cards.length](); card.classList.remove('in'); void card.offsetWidth; card.classList.add('in'); phase++; };
    show(); return every(9000, show);
  }

  // ---------- 12: The Garden Shopping Network
  function shopping(box) {
    var items = [{ n: 'Garden Papers · King Size', p: 15, d: '32 leaves, slow burning, a cheat sheet on every leaf.', i: '📜' },
                 { n: 'Hand-Rolled Pre-Roll', p: 25, d: 'Rolled at the counter this morning. Spark it for a fortune.', i: '🚬' },
                 { n: 'Swirl Glass Spoon Pipe', p: 60, d: 'Fumed borosilicate, hand-blown, one of a kind.', i: '🥄' },
                 { n: 'Beaker Bong with Ice Pinch', p: 120, d: 'Thick glass, 12 inches, downstem and bowl included.', i: '🧪' }];
    var k = Math.floor(secsToday() / 60) % items.length, sold = 40 + Math.floor(Math.random() * 60), left = 20 + Math.floor(Math.random() * 20);
    box.innerHTML = '<div class="tv-shop"><div class="gs-top"><b>GSN</b><span>THE GARDEN SHOPPING NETWORK</span></div><div class="gs-item"><div class="gs-ico"></div><div class="gs-txt"><h4></h4><p></p>' +
      '<div class="gs-price"><s></s><b></b></div></div></div><div class="gs-bar"><span class="gs-left"></span><span class="gs-sold"></span><span class="gs-call">CALL NOW · 555-GARDEN</span></div></div>';
    function show() { var it = items[k % items.length]; box.querySelector('.gs-ico').textContent = it.i; box.querySelector('h4').textContent = it.n; box.querySelector('p').textContent = it.d;
      box.querySelector('.gs-price s').textContent = 'Retail ' + Math.round(it.p * 1.8) + ' GB'; box.querySelector('.gs-price b').textContent = 'TODAY ' + it.p + ' GB'; }
    function tick() { if (Math.random() < 0.5) { sold++; if (left > 3) left--; }
      box.querySelector('.gs-left').textContent = left <= 5 ? 'ONLY ' + left + ' LEFT!' : left + ' IN STOCK'; box.querySelector('.gs-sold').textContent = sold + ' SOLD';
      if (Math.random() < 0.02) { k++; left = 20 + Math.floor(Math.random() * 20); show(); } }
    show(); tick(); return every(1200, tick);
  }

  // ---------- 14: The Fireplace
  function fireplace(box, loud) {
    box.innerHTML = '<div class="tv-fire"><canvas width="320" height="240"></canvas><div class="tv-lab">THE FIREPLACE · ALL NIGHT LONG</div></div>';
    var c = box.querySelector('canvas'), x = c.getContext('2d'), P = [];
    var stop = loop(function () {
      var W = c.width, H = c.height; x.globalCompositeOperation = 'source-over'; x.fillStyle = '#140a06'; x.fillRect(0, 0, W, H);
      x.fillStyle = '#2a1a12'; for (var b = 0; b < 12; b++) x.fillRect(b * 28 - 4, 0, 26, H - 60);   // bricks
      x.fillStyle = '#100805'; x.fillRect(40, 30, W - 80, H - 70);   // the firebox
      for (var k = 0; k < 6; k++) P.push({ x: 90 + Math.random() * 140, y: H - 62, vx: (Math.random() - 0.5) * 0.6, vy: -1 - Math.random() * 1.8, l: 1, r: 10 + Math.random() * 14 });
      x.globalCompositeOperation = 'lighter';
      P = P.filter(function (p) { p.x += p.vx; p.y += p.vy; p.l -= 0.018; p.r *= 0.985; if (p.l <= 0) return false;
        var g = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, 'rgba(255,' + (160 + 80 * p.l | 0) + ',60,' + (0.5 * p.l) + ')'); g.addColorStop(1, 'rgba(255,60,0,0)');
        x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, p.r, 0, 7); x.fill(); return true; });
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = '#4a2c18'; x.save(); x.translate(W / 2, H - 52); x.rotate(0.12); x.fillRect(-80, -9, 160, 18); x.rotate(-0.26); x.fillRect(-76, -2, 150, 17); x.restore();   // logs
      x.fillStyle = 'rgba(255,120,30,.8)'; for (var e = 0; e < 8; e++) x.fillRect(100 + Math.random() * 120, H - 48 + Math.random() * 8, 3, 2);   // embers
      x.fillStyle = '#1d1d1d'; x.fillRect(30, H - 36, W - 60, 10);   // the grate
    });
    var crackle = null;
    if (loud) { var ctx = ac(); if (ctx) { var n = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), d = n.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.02 + (Math.random() < 0.0006 ? (Math.random() * 2 - 1) * 0.8 : 0);
      var s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = n; s.loop = true; g.gain.value = 0.6; s.connect(g); g.connect(ctx.destination); s.start();
      crackle = function () { try { s.stop(); } catch (e) {} }; } }
    return function () { stop(); if (crackle) crackle(); };
  }

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
  function paintSmall() { cleanup.forEach(function (c) { if (c) c(); }); cleanup = [big ? (small.innerHTML = '<div class="tv-card">' + ch + '</div>', null) : tune(small, false)]; }
  function paintBig() { if (!bigBox) return; stopSound(); if (big && big.clean) big.clean(); big.clean = tune(bigBox, true); big.querySelector('.tv-chn').textContent = 'CH ' + ch + ' · ' + CH[ch]; }
  function flip(d) { var i = order.indexOf(ch); ch = order[(i + d + order.length) % order.length]; try { localStorage.setItem('tv-ch', ch); } catch (e) {} paintBig(); paintSmall(); }
  function openBig() {
    if (!window.kiosk) return;
    big = window.kiosk.sheet('tv', 'The kiosk TV', 'Channel ' + ch, '<div class="tv-big"><div class="tv-bezel"><div class="tv-screen" id="tv-bigbox"></div><div class="tv-glass"></div></div>' +
      '<div class="tv-remote"><button type="button" data-tv="down">CH ▼</button><span class="tv-chn"></span><button type="button" data-tv="up">CH ▲</button>' +
      '<button type="button" data-tv="off">⏻ Off</button></div><div class="tv-guide">' + order.map(function (n) { return '<button type="button" data-go="' + n + '">' + n + ' <small>' + CH[n] + '</small></button>'; }).join('') + '</div>' +
      '<p class="kv-p tv-note">Toon Town, the commercials and the Late Movie are public domain from the Internet Archive; Garden MTV plays the artists\' own videos from YouTube; the Weather Channel is live from weather.gov.</p></div>', 'kv-tv');
    bigBox = big.querySelector('#tv-bigbox'); if (window.gardenRadio) window.gardenRadio.off();
    Array.prototype.forEach.call(big.querySelectorAll('[data-tv]'), function (b) { b.onclick = function () {
      if (b.dataset.tv === 'off') { window.kiosk.close(big); return; } flip(b.dataset.tv === 'up' ? 1 : -1); big.querySelector('.kv-h').textContent = 'Channel ' + ch; }; });
    Array.prototype.forEach.call(big.querySelectorAll('[data-go]'), function (b) { b.onclick = function () { ch = +b.dataset.go; flip(0); big.querySelector('.kv-h').textContent = 'Channel ' + ch; }; });
    big.onclosed = function () { stopSound(); if (big.clean) big.clean(); bigBox = null; big = null; paintSmall(); };
    paintSmall(); paintBig();
  }
  Promise.all([get('/tv.json').catch(function () { return {}; })]).then(function (r) { DATA = r[0];
    return DATA.usage ? get(DATA.usage).then(function (u) { USAGE = u; }).catch(function () {}) : null; }).then(paintSmall);
  weather();
  [hot, document.getElementById('k-tvq')].forEach(function (b) { if (b) b.addEventListener('click', function (e) { e.stopPropagation(); openBig(); }); });
})();
