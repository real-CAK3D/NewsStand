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
             10: 'GARDEN KITCHEN', 11: 'COMMERCIALS', 12: 'SHOPPING', 13: 'LATE MOVIE', 14: 'FIREPLACE', 15: '[ADULT SWIM]', 16: 'LECTURE HALL', 17: 'JOE ROGAN',
             18: 'SEASONAL', 19: 'THREE STOOGES' };
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
    11: function (box, loud) {   // the vintage ads, with this season's commercial breaks mixed in
      var sk = seasonKey(), extra = sk && DATA && DATA.seasonal ? DATA.seasonal[sk].filter(function (x) { return /^Commercial/.test(x.title); }) : [];
      var list = ((DATA && DATA.ads) || []).slice(); extra.forEach(function (x, k) { list.splice(2 + k * 3, 0, x); });
      return videoChannel(box, loud, list, function (c) { return 'COMMERCIAL BREAK · ' + c.title.replace(/^Commercial( break)? · /, ''); }); },
    12: shopping,
    13: function (box, loud) { return videoChannel(box, loud, DATA && DATA.movies, function (c) { return '🎬 THE LATE MOVIE · ' + c.title; }); },
    14: fireplace,
    15: aswim,
    16: lectures,
    17: jre,
    18: seasonal,
    19: function (box, loud) { return videoChannel(box, loud, DATA && DATA.stooges, function (c) { return '🥧 THE THREE STOOGES · ' + c.title; }); }
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

  // ---------- YouTube channels: one player that joins the schedule mid-show, credits in the corner, and bumpers between videos
  var ytReady = null;
  function ytAPI() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (!ytReady) ytReady = new Promise(function (res) { var prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = function () { if (prev) prev(); res(); };
      var sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(sc); });
    return ytReady;
  }
  function ytChannel(box, loud, list, o) {
    o = o || {};
    if (!list || !list.length) { box.innerHTML = '<div class="tv-card">NO SIGNAL</div>'; return null; }
    box.innerHTML = '<div class="tv-yt ' + (o.cls || '') + '"><div class="yt-slot"></div>' + (o.frame || '') + (o.bug || '') + '<div class="yt-cred"></div><div class="yt-bump"></div></div>';
    var at = nowIn(list), i = at.i, player = null, dead = false, credT = null, bump = box.querySelector('.yt-bump');
    function credit() { if (!o.credit) return; var c = box.querySelector('.yt-cred'); c.innerHTML = o.credit(list[i]); c.classList.add('on'); clearTimeout(credT); credT = setTimeout(function () { c.classList.remove('on'); }, o.credMs || 10000); }
    function play(t) { if (dead || !player || !player.loadVideoById) return; player.loadVideoById({ videoId: list[i].id, startSeconds: Math.floor(t || 0) }); if (loud) player.unMute(); else player.mute(); credit(); }
    function next() {
      i = (i + 1) % list.length; var b = o.between && o.between(i);
      if (b) { bump.innerHTML = b.html; bump.className = 'yt-bump on ' + (b.cls || ''); try { player.pauseVideo(); } catch (e) {}
        setTimeout(function () { if (dead) return; bump.className = 'yt-bump'; play(0); }, b.ms || 6000); }
      else play(0);
    }
    ytAPI().then(function () {
      if (dead) return;
      player = new YT.Player(box.querySelector('.yt-slot'), { width: '100%', height: '100%', videoId: list[i].id, host: 'https://www.youtube-nocookie.com',
        playerVars: { autoplay: 1, mute: loud ? 0 : 1, start: Math.floor(at.t), controls: 0, modestbranding: 1, playsinline: 1, rel: 0, iv_load_policy: 3, disablekb: 1, fs: 0 },
        events: { onReady: function (e) { if (loud) e.target.unMute(); else e.target.mute(); e.target.playVideo(); credit(); },
                  onStateChange: function (e) { if (e.data === 0) { if (list.length === 1) play(0); else next(); } }, onError: function () { setTimeout(next, 800); } } });
    });
    var bumpIv = o.every ? setInterval(function () { if (!o.every.test()) return; }, 60000) : null;
    return function () { dead = true; clearTimeout(credT); if (bumpIv) clearInterval(bumpIv); try { if (player && player.destroy) player.destroy(); } catch (e) {} };
  }

  // ---------- 8: Garden MTV — music videos (the artists' own YouTube uploads), with the classic lower-left credit
  function mtv(box, loud) {
    return ytChannel(box, loud, DATA && DATA.mtv, { cls: 'tv-mtv', bug: '<div class="mtv-bug"><b>M</b><small>GARDEN</small></div>',
      credit: function (v) { return '<div class="mtv-cred on"><b>' + esc(v.artist) + '</b><span>"' + esc(v.title) + '"</span>' + (v.album ? '<small>' + esc(v.album) + '</small>' : '') + '<small>Official video</small></div>'; } });
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

  // ---------- 10: Garden Kitchen — a '90s/2000s daytime cooking block (Martha, Granny PottyMouth), with a Baked Goods recipe card between shows
  function kitchen(box, loud) {
    var rs = (DATA && DATA.recipes) || [], k = Math.floor(secsToday() / 600);
    return ytChannel(box, loud, DATA && DATA.kitchen, { cls: 'tv-cook90',
      frame: '<div class="ck90-frame"></div>',
      bug: '<div class="ck90-bug"><i>🍅</i><b>Garden</b><span>KITCHEN</span></div>',
      credit: function (v) { return '<div class="ck90-lower"><b>' + esc(v.title) + '</b><span>with ' + esc(v.show) + '</span></div>'; }, credMs: 12000,
      between: function () { var r = rs[(k++) % Math.max(1, rs.length)]; if (!r) return null; var ing = listy(r.ingredients).slice(0, 4);
        return { cls: 'ck90-card', ms: 9000, html: '<div class="ck90-rc"><small>COMING UP ON GARDEN KITCHEN · FROM BAKED GOODS</small><h4>' + esc(r.title) + '</h4><p>' + esc(r.intro || '') + '</p><ul>' +
          ing.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul><em>' + esc([r.prep, r.difficulty].filter(Boolean).join(' · ')) + '</em></div>' }; } });
  }

  // ---------- 12: The Garden Shopping Network — '90s home shopping: today's special value, the turntable, the phone lines lit up
  function shopping(box) {
    var items = [{ n: 'Garden Papers · King Size', p: 15, d: '32 leaves, slow burning, and a cheat sheet on every single leaf.', i: '📜', no: 'G-1015' },
                 { n: 'Hand-Rolled Pre-Roll', p: 25, d: 'Rolled right at the counter this morning. Spark it for a fortune!', i: '🚬', no: 'G-2025' },
                 { n: 'Swirl Glass Spoon Pipe', p: 60, d: 'Fumed borosilicate, hand-blown. Every single one is one of a kind.', i: '🥄', no: 'G-3060' },
                 { n: 'Beaker Bong with Ice Pinch', p: 120, d: 'Thick glass, 12 inches, downstem and bowl included at no extra charge.', i: '🧪', no: 'G-4120' }];
    var HOST = ['Now folks, I have one of these at home and I use it every day.', 'Look at that clarity. Just look at it.', 'The phones are ringing off the hook, so don\'t wait!',
                'This is a Today\'s Special Value, and once it\'s gone, it\'s gone.', 'Clydius gave this one two paws up.', 'Three easy payments, and it ships free to the Garden.'];
    var k = Math.floor(secsToday() / 90) % items.length, sold = 400 + Math.floor(Math.random() * 300), left = 60 + Math.floor(Math.random() * 40), h = 0;
    box.innerHTML = '<div class="tv-qvc"><div class="qv-top"><b>GSN</b><span>THE GARDEN SHOPPING NETWORK</span><i class="qv-clock"></i></div>' +
      '<div class="qv-main"><div class="qv-stage"><div class="qv-turn"></div><span class="qv-ico"></span><div class="qv-spot"></div></div>' +
      '<div class="qv-side"><div class="qv-tsv">TODAY\'S SPECIAL VALUE®</div><div class="qv-no"></div><h4 class="qv-name"></h4><div class="qv-was"></div><div class="qv-price"></div>' +
      '<div class="qv-pay"></div><div class="qv-sh">+ S&amp;H 0 GB</div></div></div>' +
      '<div class="qv-host"></div><div class="qv-bar"><span class="qv-left"></span><span class="qv-sold"></span><span class="qv-call">📞 CALL 1-800-GARDEN</span></div></div>';
    function $q(c) { return box.querySelector(c); }
    function show() { var it = items[k % items.length]; $q('.qv-ico').textContent = it.i; $q('.qv-name').textContent = it.n; $q('.qv-no').textContent = 'ITEM ' + it.no;
      $q('.qv-was').textContent = 'Retail Value ' + Math.round(it.p * 1.9) + ' GB'; $q('.qv-price').textContent = it.p + ' GB'; $q('.qv-pay').textContent = '3 Easy Pays of ' + (it.p / 3).toFixed(2) + ' GB'; }
    function tick() {
      if (Math.random() < 0.6) { sold += 1 + Math.floor(Math.random() * 3); if (left > 4) left--; }
      $q('.qv-left').textContent = left <= 10 ? 'ALMOST SOLD OUT! ' + left + ' LEFT' : left + ' REMAINING'; $q('.qv-sold').textContent = sold.toLocaleString() + ' SOLD';
      $q('.qv-clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ' ET';
      if (Math.random() < 0.15) { var hh = $q('.qv-host'); hh.textContent = '“' + HOST[h++ % HOST.length] + '”'; hh.classList.remove('in'); void hh.offsetWidth; hh.classList.add('in'); }
      if (Math.random() < 0.012) { k++; left = 60 + Math.floor(Math.random() * 40); show(); }
    }
    show(); tick(); return every(1200, tick);
  }

  // ---------- 14: The Fireplace — the real thing, all night
  function fireplace(box, loud) { return ytChannel(box, loud, DATA && DATA.fire, { cls: 'tv-firep' }); }

  // ---------- 15: [adult swim] — shows from the network's own uploads, with plain white-on-black bumps in between
  var BUMPS = [['hey.', 'it\'s late.', 'you know that, right?'], ['we were going to show you something educational.', 'we changed our minds.'],
    ['clydius says hi.', 'he\'s a very good dog.', 'that\'s it. that\'s the bump.'], ['the plants in the garden are doing well.', 'thank you for asking.'],
    ['if you\'re still up,', 'you might as well stay up.'], ['somebody left the radio on 90.3.', 'art bell is talking about bigfoot again.'],
    ['this bump is sponsored by nobody.', 'we just like you.'], ['go to bed.', '', 'kidding. stay.']];
  function aswim(box, loud) {
    var b = Math.floor(secsToday() / 300);
    return ytChannel(box, loud, DATA && DATA.aswim, { cls: 'tv-as', bug: '<div class="as-bug">[adult swim]</div>',
      credit: function (v) { return '<div class="as-cred">' + esc(v.show) + '<br>“' + esc(v.title) + '”</div>'; }, credMs: 7000,
      between: function () { var t = BUMPS[(b++) % BUMPS.length]; return { cls: 'as-bump', ms: 7500, html: '<div class="as-lines">' + t.map(function (l, n) {
        return '<p style="animation-delay:' + (n * 1.4) + 's">' + (esc(l) || '&nbsp;') + '</p>'; }).join('') + '</div><div class="as-mark">[adult swim]</div>' }; } });
  }

  // ---------- 16: The Lecture Hall — Milton Friedman and Alan Watts, with a thought between talks
  var WATTS = ['The meaning of life is just to be alive.', 'Muddy water is best cleared by leaving it alone.', 'You are the universe experiencing itself.',
    'Trying to define yourself is like trying to bite your own teeth.', 'The only way to make sense out of change is to plunge into it.'];
  function lectures(box, loud) {
    var q = Math.floor(secsToday() / 900);
    return ytChannel(box, loud, DATA && DATA.lectures, { cls: 'tv-lec', bug: '<div class="lec-bug">THE LECTURE HALL</div>',
      credit: function (v) { return '<div class="lec-lower"><b>' + esc(v.show) + '</b><span>' + esc(v.title) + '</span></div>'; }, credMs: 14000,
      between: function () { return { cls: 'lec-card', ms: 9000, html: '<div class="lec-q"><p>“' + esc(WATTS[(q++) % WATTS.length]) + '”</p><small>— Alan Watts</small></div>' }; } });
  }

  // ---------- 17: The Joe Rogan Experience
  function jre(box, loud) {
    return ytChannel(box, loud, DATA && DATA.jre, { cls: 'tv-jre', bug: '<div class="jre-bug">JRE</div>',
      credit: function (v) { return '<div class="jre-lower"><b>' + esc(v.show) + '</b><span>' + esc(v.title) + '</span></div>'; }, credMs: 12000 });
  }

  // ---------- 18: Seasonal Specials — Halloween in the fall, Christmas at the holidays (public domain, with commercial breaks from the season)
  function seasonKey() { var m = new Date().getMonth(); return m === 8 || m === 9 ? 'halloween' : m === 10 || m === 11 ? 'christmas' : null; }
  function seasonal(box, loud) {
    var key = seasonKey(), list = key && DATA && DATA.seasonal && DATA.seasonal[key];
    if (!list) { box.innerHTML = '<div class="tv-card">SEASONAL SPECIALS<br><small>BACK FOR HALLOWEEN · SEE YOU IN SEPTEMBER</small></div>'; return null; }
    return videoChannel(box, loud, list, function (c) { return (key === 'halloween' ? '🎃 HALLOWEEN SPECIALS · ' : '🎄 HOLIDAY SPECIALS · ') + c.title; });
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
      '<p class="kv-p tv-note">Toon Town, the commercials, the Late Movie, the Three Stooges and the Seasonal Specials come from the Internet Archive; Garden MTV, Garden Kitchen, the Fireplace, [adult swim], the Lecture Hall and JRE play each channel&rsquo;s own videos from YouTube; the Weather Channel is live from weather.gov.</p></div>', 'kv-tv');
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
