/* Garden OS 11 — the computer behind the counter (with a Garden 95 classic theme in Settings), after henryheffernan.com: the desktop lives on the monitor (mapped onto the render), and
   clicking the screen moves you in until it fills the view; click anywhere off the screen (or Start ▸ Shut Down) to step back.
   Apps: Register (type OPEN and the cash drawer pops), Security Cams, Smoke Shop, Ledger, Garden Explorer (a browser for the papers),
   Notepad, Minesweeper, My Computer and the Recycle Bin. On phones the desktop opens full screen so it's usable.
   Needs scene.js (sceneZoomQuad, sceneReset) and kiosk.js (window.kiosk). */
(function () {
  'use strict';
  var root = document.getElementById('gos'), screenEl = document.getElementById('k-posq'); if (!root || !screenEl) return;
  var K = function () { return window.kiosk; };
  var phone = matchMedia('(max-width: 899px), (pointer: coarse)').matches;
  var drawerImg = document.getElementById('k-drawer-open'), drawerBtn = document.getElementById('k-cash-open');
  var inPC = false, booted = false, isOpen = false, zTop = 10, wins = {}, full = null;
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function $(s, r) { return (r || root).querySelector(s); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem('gos-' + k) || 'null'); localStorage.setItem('gos-' + k, JSON.stringify(v)); } catch (e) { return null; } }

  var APPS = [
    { id: 'web', name: 'Garden Explorer', ico: '🌐', w: 780, h: 520, open: web, pin: 1 },
    { id: 'files', name: 'File Explorer', ico: '📁', w: 640, h: 420, open: files, pin: 1 },
    { id: 'register', name: 'Register', ico: '💵', w: 480, h: 340, open: register, pin: 1 },
    { id: 'settings', name: 'Settings', ico: '⚙️', w: 720, h: 500, open: settings, pin: 1 },
    { id: 'google', name: 'Google', ico: '🔎', w: 780, h: 520, open: function (b, w) { return web(b, w, 'https://www.google.com/webhp?igu=1'); } },
    { id: 'github', name: 'My GitHub', ico: '🐙', w: 780, h: 520, open: function (b, w) { return web(b, w, 'garden://github/real-CAK3D'); } },
    { id: 'cams', name: 'Security Cams', ico: '📹', w: 580, h: 400, open: cams, pin: 1 },
    { id: 'shop', name: 'Smoke Shop', ico: '🛒', w: 460, h: 380, open: shop },
    { id: 'ledger', name: 'Ledger', ico: '📊', w: 560, h: 360, open: ledger },
    { id: 'photos', name: 'Photos', ico: '🖼️', w: 640, h: 440, open: photos },
    { id: 'paint', name: 'Paint', ico: '🎨', w: 640, h: 460, open: paint },
    { id: 'calc', name: 'Calculator', ico: '🧮', w: 300, h: 440, open: calc },
    { id: 'notes', name: 'Notepad', ico: '📝', w: 460, h: 320, open: notes },
    { id: 'mines', name: 'Minesweeper', ico: '💣', w: 260, h: 330, open: mines },
    { id: 'bin', name: 'Recycle Bin', ico: '🗑️', w: 400, h: 260, open: bin }];
  function app(id) { return APPS.filter(function (a) { return a.id === id; })[0]; }

  // ---------------------------------------------------------------- settings (kept in this browser)
  var DEF = { theme: 'eleven', mode: 'dark', accent: '#2f9e6a', wall: 'bloom', wallImg: '', fit: 'cover', saver: 'starfield', saverMin: 2, align: 'center',
              clock24: false, seconds: false, sounds: true, bright: 100, night: false, scale: 100, user: 'CAK3D', avatar: '🌿', icons: 'medium' };
  var S = Object.assign({}, DEF, store('settings') || {});
  function saveS() { store('settings', S); applyS(); }
  var WALLS = { bloom: 'radial-gradient(ellipse at 28% 108%, #7fd1ae 0%, transparent 46%), radial-gradient(ellipse at 76% 18%, #3f7fd9 0%, transparent 52%), radial-gradient(ellipse at 62% 84%, #a23fd9 0%, transparent 46%), linear-gradient(135deg, #0b1f3a, #07121f)',
    garden: 'radial-gradient(circle at 50% 45%, rgba(243,213,138,.18), transparent 30%), linear-gradient(#0f6b58, #0b5546)', sunset: 'linear-gradient(160deg, #ff9a5a, #d9486e 55%, #402060)',
    night: 'radial-gradient(ellipse at 50% 120%, #1d3b6e, #050a18 70%)', meadow: 'linear-gradient(#8fd3ff, #d9f4ff 45%, #7cc46a 46%, #3f8f3a)', teal95: '#008080',
    desk: 'url(/scene/desk-day.jpg) center/cover', desknight: 'url(/scene/desk-night.jpg) center/cover', behind: 'url(/scene/behind-day.jpg) center/cover', till: 'url(/scene/drawer-day.jpg) center/cover' };
  var ACCENTS = ['#2f9e6a', '#0067c0', '#8e44ad', '#c0392b', '#d35400', '#d4ac0d', '#16a085', '#e84393', '#555'];

  // ---------------------------------------------------------------- the desktop
  root.innerHTML = '<div class="gos-boot"></div>' +
    '<div class="gos-lock" hidden><div class="gl-time"></div><div class="gl-date"></div><div class="gl-hint">Click anywhere to sign in</div>' +
    '<div class="gl-sign" hidden><div class="gl-av gos-me-av"></div><div class="gl-name gos-me-name"></div><button type="button" class="gl-go">Sign in</button></div></div>' +
    '<div class="gos-desk"><div class="gos-icons">' + APPS.filter(function (a) { return a.id !== 'google' || true; }).map(function (a) {
      return '<button type="button" class="gos-ico" data-app="' + a.id + '"><span>' + a.ico + '</span><b>' + a.name + '</b></button>'; }).join('') + '</div>' +
    '<div class="gos-wins"></div>' +
    '<div class="gos-start-menu" hidden><div class="sm-search"><input type="text" placeholder="Search for apps, settings and the web" spellcheck="false"></div>' +
      '<div class="sm-h">Pinned</div><div class="sm-grid"></div><div class="sm-h sm-rec-h">Recommended</div><div class="sm-rec"></div>' +
      '<div class="sm-foot"><span class="sm-me"><i class="gos-me-av"></i><b class="gos-me-name"></b></span><button type="button" class="sm-power" data-cmd="shutdown" title="Stand up">⏻ Stand up</button></div></div>' +
    '<div class="gos-qs" hidden><div class="qs-grid"><button type="button" class="qs-t on" data-qs="wifi">📶<small>The Garden</small></button><button type="button" class="qs-t on" data-qs="bt">🔵<small>Bluetooth</small></button>' +
      '<button type="button" class="qs-t" data-qs="night">🌙<small>Night light</small></button><button type="button" class="qs-t" data-qs="mode">🌗<small>Dark mode</small></button>' +
      '<button type="button" class="qs-t" data-qs="sounds">🔔<small>Sounds</small></button><button type="button" class="qs-t" data-qs="settings">⚙️<small>All settings</small></button></div>' +
      '<label class="qs-sl">☀️ <input type="range" min="40" max="120" data-qs="bright"></label><div class="qs-foot"><span>🔋 100% · plugged into the kiosk</span></div></div>' +
    '<div class="gos-cal" hidden></div>' +
    '<div class="gos-bar"><div class="gb-mid"><button type="button" class="gos-start" title="Start"><i class="gos-logo"></i><span class="gs-word">Start</span></button>' +
      '<button type="button" class="gb-search" title="Search">🔍</button><div class="gos-pins">' + APPS.filter(function (a) { return a.pin; }).map(function (a) {
        return '<button type="button" class="gos-pin" data-app="' + a.id + '" title="' + a.name + '">' + a.ico + '</button>'; }).join('') + '</div><div class="gos-tasks"></div></div>' +
      '<div class="gos-tray"><button type="button" class="gt-qs" title="Quick settings">📶 <span class="gt-vol">🔊</span> 🔋</button>' +
      '<button type="button" class="gt-clock" title="Calendar"><span class="gos-clock"></span><small class="gos-date"></small></button>' +
      '<button type="button" class="gt-stand" title="Stand up from the computer">⏏ Stand up</button></div></div></div>' +
    '<div class="gos-saver" hidden><canvas></canvas></div>' +
    '<div class="gos-idle"><b>GARDEN OS</b><span>click the screen to sit down</span></div>';
  root.classList.add('off');
  function fmtTime(d) { return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: S.seconds ? '2-digit' : undefined, hour12: !S.clock24 }); }
  function clock() {
    var d = new Date(), c = $('.gos-clock'), dt = $('.gos-date'); if (c) c.textContent = fmtTime(d); if (dt) dt.textContent = d.toLocaleDateString();
    var lt = $('.gl-time'), ld = $('.gl-date'); if (lt) lt.textContent = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: !S.clock24 }).replace(/\s?[AP]M/i, '');
    if (ld) ld.textContent = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  }
  setInterval(clock, 1000);
  function applyS() {
    root.classList.toggle('w11', S.theme === 'eleven'); root.classList.toggle('w95', S.theme !== 'eleven');
    root.classList.toggle('dark', S.mode === 'dark'); root.classList.toggle('bar-left', S.align === 'left');
    root.dataset.icons = S.icons; root.style.setProperty('--acc', S.accent); root.style.setProperty('--gz', S.scale / 100);
    $('.gos-desk').style.background = S.wall === 'custom' && S.wallImg ? 'url(' + S.wallImg + ') center/' + S.fit + ' no-repeat #000' : (WALLS[S.wall] || WALLS.bloom);
    $('.gos-lock').style.background = $('.gos-desk').style.background;
    root.style.filter = (S.bright !== 100 ? 'brightness(' + (S.bright / 100) + ')' : '') + (S.night ? ' sepia(.35) saturate(1.15) hue-rotate(-12deg)' : '') || '';
    Array.prototype.forEach.call(root.querySelectorAll('.gos-me-av'), function (a) { a.textContent = S.avatar; });
    Array.prototype.forEach.call(root.querySelectorAll('.gos-me-name'), function (a) { a.textContent = S.user; });
    Array.prototype.forEach.call(root.querySelectorAll('[data-qs]'), function (b) { var k = b.dataset.qs;
      if (b.tagName === 'INPUT') b.value = S.bright; else if (k === 'night') b.classList.toggle('on', S.night); else if (k === 'mode') b.classList.toggle('on', S.mode === 'dark'); else if (k === 'sounds') b.classList.toggle('on', S.sounds); });
    $('.gt-vol').textContent = S.sounds ? '🔊' : '🔇';
    clock();
  }
  function click() { if (S.sounds && K()) K().sfx.click(); }
  function paintStart(filter) {
    var q = String(filter || '').toLowerCase(), list = APPS.filter(function (a) { return !q || a.name.toLowerCase().indexOf(q) >= 0; });
    $('.sm-grid').innerHTML = list.map(function (a) { return '<button type="button" data-app="' + a.id + '"><span>' + a.ico + '</span><b>' + a.name + '</b></button>'; }).join('') ||
      '<p class="sm-none">Press Enter to search the web for “' + esc(filter) + '”</p>';
    var rec = [['📝', 'notes.txt', 'notes'], ['📊', 'receipts (Ledger)', 'ledger'], ['🖼️', 'desk-night.jpg', 'photos'], ['🐙', 'github.com/real-CAK3D', 'github']];
    $('.sm-rec').innerHTML = rec.map(function (r) { return '<button type="button" data-app="' + r[2] + '"><span>' + r[0] + '</span><b>' + r[1] + '</b></button>'; }).join('');
    root.classList.toggle('sm-searching', !!q);
  }
  function panels(which) {   // only one flyout at a time
    ['.gos-start-menu', '.gos-qs', '.gos-cal'].forEach(function (c) { var p = $(c); p.hidden = c !== which ? true : !p.hidden; });
    if (which === '.gos-start-menu' && !$(which).hidden) { var i = $('.sm-search input'); i.value = ''; paintStart(''); setTimeout(function () { try { i.focus({ preventScroll: true }); } catch (e) {} }, 30); }
    if (which === '.gos-cal' && !$(which).hidden) paintCal();
  }
  function paintCal() {
    var d = new Date(), y = d.getFullYear(), m = d.getMonth(), first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), cells = '';
    for (var i = 0; i < first; i++) cells += '<i></i>';
    for (var k = 1; k <= days; k++) cells += '<i class="' + (k === d.getDate() ? 'today' : '') + '">' + k + '</i>';
    $('.gos-cal').innerHTML = '<div class="cal-now">' + fmtTime(d) + '<small>' + d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + '</small></div>' +
      '<div class="cal-m">' + d.toLocaleDateString([], { month: 'long', year: 'numeric' }) + '</div><div class="cal-g">' + ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(function (x) { return '<b>' + x + '</b>'; }).join('') + cells + '</div>' +
      '<div class="cal-n"><b>Notifications</b><p>🗞️ The Double Wide is on the rack.</p><p>📻 KBEL 90.3: Art Bell is on the air.</p></div>';
  }
  paintStart(''); applyS();
  var lastInput = Date.now();
  root.addEventListener('pointerdown', function () { lastInput = Date.now(); }, true);
  root.addEventListener('keydown', function () { lastInput = Date.now(); }, true);
  root.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target : null; if (!t || !inPC) return;
    if (saverOn) return stopSaver();
    var lock = t.closest('.gos-lock'); if (lock) { if (t.closest('.gl-go')) return signIn(); $('.gl-sign').hidden = false; $('.gl-hint').hidden = true; return; }
    var ico = t.closest('.gos-ico'); if (ico) { var now = Date.now();   // desktop icons: select, then double-click (a single tap on phones)
      if (phone || (ico.dataset.last && now - ico.dataset.last < 450)) { launch(ico.dataset.app); ico.dataset.last = ''; }
      else { Array.prototype.forEach.call(root.querySelectorAll('.gos-ico'), function (x) { x.classList.toggle('sel', x === ico); }); ico.dataset.last = now; }
      return; }
    if (t.closest('.gos-start') || t.closest('.gb-search')) { click(); return panels('.gos-start-menu'); }
    if (t.closest('.gt-qs')) { click(); return panels('.gos-qs'); }
    if (t.closest('.gt-clock')) { click(); return panels('.gos-cal'); }
    if (t.closest('.gt-stand') || t.closest('[data-cmd="shutdown"]')) { panels(null); return leave(); }
    var qs = t.closest('.qs-t'); if (qs) { var k = qs.dataset.qs; click();
      if (k === 'night') S.night = !S.night; else if (k === 'mode') S.mode = S.mode === 'dark' ? 'light' : 'dark'; else if (k === 'sounds') S.sounds = !S.sounds;
      else if (k === 'settings') { panels(null); return launch('settings'); } else qs.classList.toggle('on');
      return saveS(); }
    var item = t.closest('.sm-grid [data-app], .sm-rec [data-app], .gos-pin'); if (item) { panels(null); return launch(item.dataset.app); }
    if (!t.closest('.gos-start-menu, .gos-qs, .gos-cal')) panels(null);
    var task = t.closest('.gos-task'); if (task) { var w = wins[task.dataset.app]; if (w) { if (w.classList.contains('min') || +w.style.zIndex !== zTop) { w.classList.remove('min'); focus(w); } else w.classList.add('min'); } }
  });
  root.addEventListener('input', function (e) { if (e.target.matches('.sm-search input')) paintStart(e.target.value); if (e.target.matches('[data-qs="bright"]')) { S.bright = +e.target.value; saveS(); } });
  root.addEventListener('keydown', function (e) {
    if (e.target.matches && e.target.matches('.sm-search input') && e.key === 'Enter') {
      var q = e.target.value.trim(), hit = APPS.filter(function (a) { return a.name.toLowerCase().indexOf(q.toLowerCase()) >= 0; })[0]; panels(null);
      if (hit && q) return launch(hit.id);
      if (q) { var w = launch('web'); if (w && w.go) w.go(q); }
    }
    if (!$('.gos-lock').hidden && inPC) signInPrompt();
  });
  function signInPrompt() { $('.gl-sign').hidden = false; $('.gl-hint').hidden = true; }
  function signIn() { $('.gos-lock').hidden = true; if (S.sounds && K()) K().sfx.bell(); }

  // ---------------------------------------------------------------- windows
  function launch(id) {
    var a = app(id); if (!a) return; click();
    if (wins[id]) { wins[id].classList.remove('min'); focus(wins[id]); return wins[id]; }
    var n = Object.keys(wins).length, w = el('div', 'gos-win');
    w.style.width = a.w + 'px'; w.style.height = a.h + 'px'; w.style.left = (60 + n * 28) + 'px'; w.style.top = (30 + n * 24) + 'px';
    w.innerHTML = '<div class="gos-title"><span><i>' + a.ico + '</i> ' + a.name + '</span><button type="button" data-w="min" title="Minimize">─</button><button type="button" data-w="max" title="Maximize">▢</button>' +
      '<button type="button" data-w="x" class="gw-x" title="Close">✕</button></div><div class="gos-body"></div><i class="gos-grip"></i>';
    $('.gos-wins').appendChild(w); wins[id] = w; focus(w);
    var pin = root.querySelector('.gos-pin[data-app="' + id + '"]');
    if (pin) { pin.classList.add('run'); w.task = pin; } else { var task = el('button', 'gos-task', '<i>' + a.ico + '</i><span>' + a.name + '</span>'); task.type = 'button'; task.dataset.app = id; $('.gos-tasks').appendChild(task); w.task = task; }
    w.addEventListener('pointerdown', function () { focus(w); });
    var title = w.querySelector('.gos-title');
    title.addEventListener('click', function (e) { var b = e.target.closest('[data-w]'); if (!b) return;
      if (b.dataset.w === 'x') closeWin(id); else if (b.dataset.w === 'min') w.classList.add('min'); else w.classList.toggle('max'); click(); });
    title.addEventListener('dblclick', function (e) { if (!e.target.closest('[data-w]')) w.classList.toggle('max'); });
    drag(w, title); grip(w, w.querySelector('.gos-grip'));
    w.clean = a.open(w.querySelector('.gos-body'), w) || null;
    return w;
  }
  function closeWin(id) { var w = wins[id]; if (!w) return; if (w.clean && typeof w.clean === 'function') w.clean(); if (w.task) { if (w.task.classList.contains('gos-pin')) w.task.classList.remove('run', 'active'); else w.task.remove(); } w.remove(); delete wins[id]; }
  function focus(w) { zTop++; w.style.zIndex = zTop; Array.prototype.forEach.call(root.querySelectorAll('.gos-win'), function (x) { x.classList.toggle('active', x === w); });
    Array.prototype.forEach.call(root.querySelectorAll('.gos-task, .gos-pin'), function (x) { x.classList.toggle('active', x === w.task); }); }
  function kScale() { return root.getBoundingClientRect().width / root.offsetWidth || 1; }
  function drag(w, handle) {   // the desktop is scaled (and in perspective) on the monitor: turn screen pixels back into desktop pixels
    var st = null;
    handle.addEventListener('pointerdown', function (e) { if (e.target.closest('button') || w.classList.contains('max')) return;
      st = { x: e.clientX, y: e.clientY, l: w.offsetLeft, t: w.offsetTop, k: kScale() }; try { handle.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
    handle.addEventListener('pointermove', function (e) { if (!st) return;
      w.style.left = Math.max(-w.offsetWidth + 60, Math.min(root.offsetWidth - 60, st.l + (e.clientX - st.x) / st.k)) + 'px';
      w.style.top = Math.max(0, Math.min(root.offsetHeight - 80, st.t + (e.clientY - st.y) / st.k)) + 'px'; });
    handle.addEventListener('pointerup', function () { if (st && parseFloat(w.style.top) <= 0) w.classList.add('max'); st = null; });   // drag to the top to maximize, like Windows
  }
  function grip(w, g) {
    var st = null;
    g.addEventListener('pointerdown', function (e) { st = { x: e.clientX, y: e.clientY, w: w.offsetWidth, h: w.offsetHeight, k: kScale() }; try { g.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); e.stopPropagation(); });
    g.addEventListener('pointermove', function (e) { if (!st) return; w.style.width = Math.max(220, st.w + (e.clientX - st.x) / st.k) + 'px'; w.style.height = Math.max(160, st.h + (e.clientY - st.y) / st.k) + 'px'; });
    g.addEventListener('pointerup', function () { st = null; });
  }

  // ---------------------------------------------------------------- the screen saver (on the monitor too, when nobody's touched it for a while)
  var saverOn = false, saverStop = null;
  function startSaver(kind, preview) {
    if (saverOn) stopSaver(); var box = $('.gos-saver'), c = box.querySelector('canvas'); box.hidden = false; saverOn = true;
    c.width = root.offsetWidth; c.height = root.offsetHeight; var x = c.getContext('2d'), W = c.width, H = c.height, run = true, t0 = performance.now();
    var stars = [], lines = [], bubs = [], drops = [], leaves = [];
    for (var i = 0; i < 260; i++) stars.push({ x: (Math.random() - 0.5) * W, y: (Math.random() - 0.5) * H, z: Math.random() * W });
    for (var j = 0; j < 2; j++) { var pts = []; for (var k = 0; k < 4; k++) pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5 }); lines.push({ pts: pts, hist: [], hue: j * 160 }); }
    for (var b = 0; b < 14; b++) bubs.push({ x: Math.random() * W, y: Math.random() * H, r: 20 + Math.random() * 50, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, h: Math.random() * 360 });
    for (var d = 0; d < W / 16; d++) drops.push(Math.random() * H / 16);
    for (var l = 0; l < 40; l++) leaves.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 6, s: 1 + Math.random() * 2, c: ['#c0392b', '#d35400', '#e67e22', '#e5a50a', '#8e3b1c'][l % 5] });
    (function frame(now) {
      if (!run) return; var t = (now - t0) / 1000;
      if (kind === 'starfield') { x.fillStyle = '#000'; x.fillRect(0, 0, W, H); x.fillStyle = '#fff';
        stars.forEach(function (s) { s.z -= 6; if (s.z <= 1) { s.z = W; s.x = (Math.random() - 0.5) * W; s.y = (Math.random() - 0.5) * H; }
          var sx = W / 2 + s.x / s.z * W * 0.5, sy = H / 2 + s.y / s.z * H * 0.5, r = Math.max(0.5, 2.4 * (1 - s.z / W)); x.fillRect(sx, sy, r, r); }); }
      if (kind === 'mystify') { x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(0, 0, W, H);
        lines.forEach(function (L) { L.pts.forEach(function (p) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; });
          x.strokeStyle = 'hsl(' + ((L.hue + t * 20) % 360) + ',90%,60%)'; x.lineWidth = 2; x.beginPath(); L.pts.forEach(function (p, i) { if (i) x.lineTo(p.x, p.y); else x.moveTo(p.x, p.y); }); x.closePath(); x.stroke(); }); }
      if (kind === 'bubbles') { x.fillStyle = '#04121f'; x.fillRect(0, 0, W, H);
        bubs.forEach(function (o) { o.x += o.vx; o.y += o.vy; if (o.x < o.r || o.x > W - o.r) o.vx *= -1; if (o.y < o.r || o.y > H - o.r) o.vy *= -1;
          var g = x.createRadialGradient(o.x - o.r / 3, o.y - o.r / 3, 2, o.x, o.y, o.r); g.addColorStop(0, 'rgba(255,255,255,.8)'); g.addColorStop(0.3, 'hsla(' + o.h + ',80%,60%,.35)'); g.addColorStop(1, 'hsla(' + o.h + ',80%,50%,.05)');
          x.fillStyle = g; x.beginPath(); x.arc(o.x, o.y, o.r, 0, 7); x.fill(); }); }
      if (kind === 'matrix') { x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(0, 0, W, H); x.fillStyle = '#35e07a'; x.font = '15px monospace';
        drops.forEach(function (y, i) { x.fillText(String.fromCharCode(0x30A0 + Math.random() * 96), i * 16, y * 16); drops[i] = y * 16 > H && Math.random() > 0.975 ? 0 : y + 1; }); }
      if (kind === 'leaves') { x.fillStyle = '#1a120a'; x.fillRect(0, 0, W, H);
        leaves.forEach(function (o) { o.y += o.s; o.x += Math.sin(t + o.r) * 1.2; o.r += 0.03; if (o.y > H + 20) { o.y = -20; o.x = Math.random() * W; }
          x.save(); x.translate(o.x, o.y); x.rotate(o.r); x.fillStyle = o.c; x.beginPath(); x.ellipse(0, 0, 10, 5, 0, 0, 7); x.fill(); x.restore(); }); }
      if (kind === 'clock') { x.fillStyle = '#000'; x.fillRect(0, 0, W, H); var s = fmtTime(new Date()); x.font = '700 72px Segoe UI, Arial, sans-serif'; x.fillStyle = S.accent;
        var tx = (Math.sin(t / 7) * 0.35 + 0.5) * (W - x.measureText(s).width), ty = (Math.cos(t / 9) * 0.35 + 0.5) * (H - 80) + 70; x.fillText(s, tx, ty); }
      if (kind === 'photos') { var imgs = saverImgs(); var im = imgs[Math.floor(t / 6) % imgs.length]; if (im.complete) { x.globalAlpha = 0.08; x.drawImage(im, -((t * 8) % 60), 0, W + 60, H); x.globalAlpha = 1; } }
      requestAnimationFrame(frame);
    })(t0);
    saverStop = function () { run = false; box.hidden = true; saverOn = false; };
    if (preview) setTimeout(function () { if (saverOn) stopSaver(); }, 6000);
  }
  var SIMGS = null;
  function saverImgs() { if (!SIMGS) SIMGS = ['/scene/desk-day.jpg', '/scene/desk-night.jpg', '/scene/behind-day.jpg', '/scene/drawer-day.jpg'].map(function (u) { var i = new Image(); i.src = u; return i; }); return SIMGS; }
  function stopSaver() { if (saverStop) saverStop(); saverStop = null; lastInput = Date.now(); }
  setInterval(function () {   // idle? start the saver: while you sit at it, or on the monitor while you're behind the counter
    var visible = inPC || document.body.classList.contains('behind');
    if (saverOn && !visible) return stopSaver();
    if (!saverOn && visible && S.saver !== 'none' && Date.now() - lastInput > S.saverMin * 60000) startSaver(S.saver);
  }, 4000);
  root.addEventListener('pointermove', function () { if (saverOn && inPC) stopSaver(); });

  // ---------------------------------------------------------------- sitting down / standing up
  function enter(then) {
    if (inPC) { if (then) then(); return; }
    inPC = true; lastInput = Date.now(); if (saverOn) stopSaver(); document.body.classList.add('in-pc'); root.classList.remove('off');
    if (window.sceneZoomQuad) window.sceneZoomQuad('behind', 'pos_screen', phone ? 0.98 : 0.92);
    if (K() && S.sounds) K().sfx.click();
    if (phone) setTimeout(function () { full = el('div', 'gos-full'); full.appendChild(root); document.body.appendChild(full); }, 420);   // on a phone the desktop fills the screen
    if (!booted) boot(then); else if (then) setTimeout(then, phone ? 450 : 50);
  }
  function leave() {
    if (!inPC) return; inPC = false; document.body.classList.remove('in-pc'); root.classList.add('off');
    if (full) { screenEl.appendChild(root); full.remove(); full = null; }
    panels(null);
    if (document.activeElement && root.contains(document.activeElement)) document.activeElement.blur();
    if (window.sceneReset) window.sceneReset();
  }
  function boot(then) {
    var b = $('.gos-boot'), lines = ['GARDEN BIOS v11.0  (C) 2026 The Garden', '', 'CPU: Clydius Core i4.20 @ 4.20 GHz', 'Memory Test: 16384 MB OK', 'Detecting drives ... CLYDE.SYS  OK',
      'Detecting cash drawer ... COM1  OK', 'Mounting the papers ... 16 found', '', 'Starting Garden OS...'];
    root.classList.add('booting'); b.textContent = ''; var k = 0;
    (function next() {
      if (k < lines.length) { b.textContent += lines[k++] + '\n'; if (K() && S.sounds) K().sfx.click(); setTimeout(next, k === lines.length ? 400 : 130); return; }
      b.innerHTML = '<div class="gos-splash"><i class="gos-logo big"></i><div class="gos-spin"></div></div>';
      setTimeout(function () { root.classList.remove('booting'); booted = true; $('.gos-lock').hidden = false; $('.gl-sign').hidden = true; $('.gl-hint').hidden = false; clock(); if (then) setTimeout(then, 10); }, 1500);
    })();
  }
  screenEl.addEventListener('click', function (e) { if (!inPC) { e.stopPropagation(); enter(); } });
  window.gardenOS = { enter: enter, leave: leave, launch: function (id) { enter(function () { if (!$('.gos-lock').hidden) signIn(); launch(id); }); } };
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && inPC && !(document.activeElement && root.contains(document.activeElement) && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) leave(); });

  // ---------------------------------------------------------------- the cash drawer
  function kaching() { var s = K().sfx; s.bell(); setTimeout(s.drawer, 140); setTimeout(s.thwack, 330); }
  function openDrawer() { if (isOpen) return false; isOpen = true; kaching(); if (drawerImg) drawerImg.classList.add('open'); if (drawerBtn) drawerBtn.hidden = false; document.body.classList.add('drawer-open'); return true; }
  function closeDrawer() { if (!isOpen) return false; isOpen = false; K().sfx.thwack(); if (drawerImg) drawerImg.classList.remove('open'); if (drawerBtn) drawerBtn.hidden = true; document.body.classList.remove('drawer-open'); return true; }
  function bills(n) { var out = [], left = Math.max(0, Math.floor(n)); [100, 50, 20, 10, 5, 1].forEach(function (d) { var c = Math.floor(left / d); if (c) { out.push([d, c]); left -= c * d; } }); return out; }
  function ledgerRows(n) { var st = K().state() || {}; return ((st.wallet && st.wallet.ledger) || []).slice(-n).reverse(); }
  function cashSheet() {
    K().sfx.drawer();
    K().loadState().then(function (st) {
      var bal = st.wallet.balance, b = bills(bal);
      var v = K().sheet('cash', 'Behind the counter', 'The Cash Drawer',
        '<img class="drawer-shot" alt="The open cash drawer: Garden Bucks under the clips, coins in the cups" src="/scene/drawer-day.jpg">' +
        '<div class="reg-bal"><small>Garden Bucks in the drawer</small><b>' + bal + '</b></div><div class="drawer-count">' +
        (b.map(function (x) { return '<span class="dc-bill dc-' + x[0] + '"><b>' + x[0] + '</b>× ' + x[1] + '</span>'; }).join('') || '<span>Empty. Read a paper to earn some.</span>') + '</div>' +
        '<p class="kv-p">Pretend money, shared with Dime Bags. You earn <b>10 a day</b> for reading a paper plus whatever you win at the Dime Bags window; you spend it on seed packs and at the smoke shop.</p>' +
        '<div class="kv-row"><button type="button" class="kv-btn" id="dr-shut">Shut the drawer</button><a class="kv-btn ghost" href="/dime-bags/">🏇 Dime Bags ›</a></div>', 'kv-register');
      v.querySelector('#dr-shut').onclick = function () { K().close(v); closeDrawer(); };
    });
  }
  if (drawerBtn) drawerBtn.addEventListener('click', cashSheet);
  var cashHot = document.getElementById('k-cash'), keyHot = document.getElementById('k-pos');
  if (cashHot) cashHot.addEventListener('click', function () { if (isOpen) return cashSheet(); K().toast('🔒 Locked. Ring it up on the computer: Register ▸ OPEN'); window.gardenOS.launch('register'); });
  if (keyHot) keyHot.addEventListener('click', function () { window.gardenOS.launch('register'); });

  // ---------------------------------------------------------------- apps
  function register(body) {
    body.innerHTML = '<div class="gos-term"><div class="gt-out"></div><label class="gt-in">&gt; <input type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go"></label></div>';
    var out = body.querySelector('.gt-out'), inp = body.querySelector('input');
    function say() { for (var i = 0; i < arguments.length; i++) { var l = arguments[i], d = el('div', l[0] === '!' ? 'hi' : ''); d.textContent = l[0] === '!' ? l.slice(1) : l; out.appendChild(d); } out.scrollTop = out.scrollHeight; }
    say('!THE CORNER CHRONICLE  POS 3.0', 'CLERK CAK3D · ' + new Date().toLocaleString(), 'TYPE HELP AND PRESS ENTER');
    var CMDS = {
      HELP: function () { say('OPEN    OPEN THE CASH DRAWER (NO SALE)', 'CLOSE   SHUT IT', 'BAL     GARDEN BUCKS ON HAND', 'LEDGER  LAST RECEIPTS', 'CLS     CLEAR THE SCREEN'); },
      OPEN: function () { if (!openDrawer()) return say('DRAWER IS ALREADY OPEN'); say('!*** NO SALE ***', 'DRAWER OPEN · STAND UP TO SEE IT'); setTimeout(leave, 1300); },
      CLOSE: function () { say(closeDrawer() ? 'DRAWER CLOSED' : 'DRAWER IS ALREADY SHUT'); },
      BAL: function () { K().loadState().then(function (st) { say('!ON HAND: ' + st.wallet.balance + ' GB', bills(st.wallet.balance).map(function (b) { return b[1] + '×$' + b[0]; }).join('  ')); }); },
      LEDGER: function () { K().loadState().then(function () { var l = ledgerRows(6); if (!l.length) return say('NO RECEIPTS YET');
        l.forEach(function (x) { say((x.delta > 0 ? '+' : '') + x.delta + '  ' + String(x.note || '').toUpperCase().slice(0, 34)); }); }); },
      CLS: function () { out.innerHTML = ''; },
      CLYDE: function () { say('!WOOF.', '(HE WANTS A TREAT)'); K().sfx.thwack(); }
    };
    CMDS['NO SALE'] = CMDS.NS = CMDS.OPEN; CMDS.SHUT = CMDS.CLOSE; CMDS.BALANCE = CMDS.BAL; CMDS.CLEAR = CMDS.CLS;
    inp.addEventListener('input', function () { inp.value = inp.value.toUpperCase(); click(); });
    inp.addEventListener('keydown', function (e) { if (e.key !== 'Enter') return; e.preventDefault(); var c = inp.value.trim(); inp.value = ''; say('> ' + c); if (!c) return;
      var f = CMDS[c] || CMDS[c.split(' ')[0]]; if (f) f(); else { say('?? ' + c.slice(0, 20) + ' — TRY HELP'); K().sfx.lid(); } });
    body.addEventListener('click', function () { inp.focus({ preventScroll: true }); });
    setTimeout(function () { try { inp.focus({ preventScroll: true }); } catch (e) {} }, 60);
  }
  function cams(body) {
    var n = document.body.classList.contains('t-night') ? 'night' : 'day';
    var list = [['CAM 1 · STREET', '/scene/desk-' + n + '.jpg', '10% 70%', 2.4], ['CAM 2 · BEHIND THE COUNTER', '/scene/behind-' + n + '.jpg', '40% 50%', 1.15],
                ['CAM 3 · CASH DRAWER', '/scene/drawer-day.jpg', '50% 60%', 1.25], ['CAM 4 · THE JARS', '/scene/desk-' + n + '.jpg', '50% 31%', 3.2]];
    body.innerHTML = '<div class="gos-cams">' + list.map(function (c, k) { return '<div class="sec-cam" data-k="' + k + '"><img alt="" src="' + c[1] + '" style="object-position:' + c[2] +
      ';transform:scale(' + c[3] + ');transform-origin:' + c[2] + '"><div class="sec-lab">' + c[0] + '</div></div>'; }).join('') + '<div class="sec-ts"></div><div class="sec-rec">● REC</div></div>';
    var g = body.querySelector('.gos-cams'), step = 0;
    var a = setInterval(function () { body.querySelector('.sec-ts').textContent = new Date().toLocaleString(); }, 1000);
    var b = setInterval(function () { step = (step + 1) % 6; g.dataset.full = step < 4 ? step : ''; }, 5000);
    g.addEventListener('click', function (e) { var c = e.target.closest('.sec-cam'); if (c) g.dataset.full = g.dataset.full === c.dataset.k ? '' : c.dataset.k; });
    return function () { clearInterval(a); clearInterval(b); };
  }
  function shop(body) {
    function paint() { K().loadState().then(function (st) { var s = st.shop || {}, have = {};
      ((st.stash || {}).goods || []).forEach(function (g) { have[g.item] = (have[g.item] || 0) + 1; });
      body.innerHTML = '<div class="gos-pad"><div class="gs-bal">Garden Bucks: <b>' + st.wallet.balance + '</b></div><table class="gos-table"><tr><th>Item</th><th>Price</th><th>In stash</th><th></th></tr>' +
        Object.keys(s).map(function (k) { return '<tr><td><b>' + esc(s[k].name) + '</b><br><small>' + esc(s[k].blurb) + '</small></td><td>' + s[k].price + ' GB</td><td>' + (have[k] || 0) + '</td>' +
          '<td><button type="button" class="gos-btn" data-buy="' + k + '">Buy</button></td></tr>'; }).join('') + '</table><div class="gos-msg"></div></div>';
      Array.prototype.forEach.call(body.querySelectorAll('[data-buy]'), function (b) { b.onclick = function () { b.disabled = true;
        K().post('/api/shop', { item: b.dataset.buy }).then(function (r) { if (r.ok) { kaching(); paint(); } else { body.querySelector('.gos-msg').textContent = r.message || ''; b.disabled = false; } }); }; });
    }); }
    paint();
  }
  function ledger(body) {
    K().loadState().then(function (st) { var l = ((st.wallet && st.wallet.ledger) || []).slice().reverse();
      body.innerHTML = '<div class="gos-sheet"><table class="gos-table xls"><tr><th></th><th>A · When</th><th>B · Change</th><th>C · What</th><th>D · Balance</th></tr>' +
        (l.map(function (x, k) { return '<tr><th>' + (k + 1) + '</th><td>' + esc(String(x.at).replace('T', ' ').slice(0, 16)) + '</td><td class="' + (x.delta < 0 ? 'neg' : 'pos') + '">' + (x.delta > 0 ? '+' : '') + x.delta +
          '</td><td>' + esc(x.note) + '</td><td>' + x.balance + '</td></tr>'; }).join('') || '<tr><td colspan="5">No receipts yet.</td></tr>') + '</table></div>'; });
  }
  var PAPERS = [['The Double Wide', '/double-wide/'], ['The Re-Up', '/re-up/'], ['The Sunday Smoke', '/sunday-smoke/'], ['Roach Clips', '/roach-clips/'], ['The Green Thumb', '/green-thumb/'],
    ['Dime Bags', '/dime-bags/'], ['Trail Mix', '/trail-mix/'], ['Dab Magazine', '/dab/'], ['Hashish', '/hashish/'], ['The Perennial', '/perennial/'], ['Baked Goods', '/baked-goods/'],
    ['Extra! Extra!', '/extra-extra/'], ['The Yearbook', '/yearbook/'], ['The Zines', '/zines/'], ['The Seed Catalog', '/seed-catalog/'], ['The Crossword Times', '/crossword-times/']];
  // Garden Explorer: really online. Sites that allow it open right inside; the ones that refuse to be framed (GitHub, YouTube, Reddit…)
  // get a real new tab, and GitHub gets its own view built from GitHub's public API.
  var BOOKMARKS = [['🔎 Google', 'https://www.google.com/webhp?igu=1'], ['🐙 GitHub', 'garden://github/real-CAK3D'], ['📚 Wikipedia', 'https://en.m.wikipedia.org/wiki/Main_Page'],
    ['🗞️ Hacker News', 'https://news.ycombinator.com/'], ['🏛️ Internet Archive', 'https://archive.org/'], ['⛅ Lewiston Weather', 'https://forecast.weather.gov/MapClick.php?lat=44.1004&lon=-70.2148'],
    ['🗺️ Map', 'https://www.openstreetmap.org/export/embed.html?bbox=-70.26%2C44.07%2C-70.18%2C44.12&layer=mapnik'], ['🕸️ Wiby (the old web)', 'https://wiby.me/'], ['🎲 The Useless Web', 'https://theuselessweb.com/'],
    ['📰 The Papers', 'garden://home']];
  var NOFRAME = /(^|\.)(github\.com|youtube\.com|youtu\.be|reddit\.com|x\.com|twitter\.com|facebook\.com|instagram\.com|bing\.com|duckduckgo\.com|amazon\.com|netflix\.com|spotify\.com|tiktok\.com|linkedin\.com|neal\.fun|discord\.com|chatgpt\.com|claude\.ai)$/i;
  var FRAMEOK = /google\.com|wikipedia\.org|archive\.org|ycombinator\.com|weather\.gov|openstreetmap\.org|wiby\.me|theuselessweb\.com/;
  function web(body, w, start) {
    body.innerHTML = '<div class="gos-web"><div class="gw-bar"><button type="button" class="gos-btn" data-b="back" title="Back">◀</button><button type="button" class="gos-btn" data-b="home" title="Home">⌂</button>' +
      '<input type="text" class="gw-url" value="garden://home" spellcheck="false"><button type="button" class="gos-btn" data-b="go">Go</button><button type="button" class="gos-btn" data-b="out" title="Open in a real tab">↗</button></div>' +
      '<div class="gw-marks">' + BOOKMARKS.map(function (m) { return '<button type="button" data-go="' + m[1] + '">' + m[0] + '</button>'; }).join('') + '</div><div class="gw-page"></div></div>';
    var page = body.querySelector('.gw-page'), url = body.querySelector('.gw-url'), hist = [], cur = 'garden://home';
    function home() {
      page.innerHTML = '<div class="gw-home"><h2>🌿 Garden Explorer</h2><form class="gw-search"><input type="text" placeholder="Search Google or type a web address" spellcheck="false"><button class="gos-btn">Search</button></form>' +
        '<h3>On the web</h3><div class="gw-links">' + BOOKMARKS.slice(0, -1).map(function (m) { return '<a href="#" data-go="' + m[1] + '">' + esc(m[0]) + '</a>'; }).join('') + '</div>' +
        '<h3>The papers of The Corner Chronicle</h3><div class="gw-links">' + PAPERS.map(function (p) { return '<a href="#" data-go="' + p[1] + '">' + esc(p[0]) + '</a>'; }).join('') + '</div></div>';
      page.querySelector('form').onsubmit = function (e) { e.preventDefault(); go(page.querySelector('.gw-search input').value); };
    }
    function resolve(q) {
      q = String(q || '').trim(); if (!q) return 'garden://home';
      if (/^garden:\/\//.test(q) || /^\//.test(q)) return q;
      if (/^https?:\/\//i.test(q)) return q;
      if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(q)) return 'https://' + q;
      return 'https://www.google.com/search?igu=1&q=' + encodeURIComponent(q);   // anything else is a search
    }
    function real(u) { return u.replace(/^garden:\/\/github\//, 'https://github.com/').replace(/[?&]igu=1/, ''); }
    function go(q, noHist) {
      var u = resolve(q); if (!noHist && cur) hist.push(cur); cur = u; url.value = u.replace(/[?&]igu=1/, ''); click();
      if (u === 'garden://home') return home();
      var gh = u.match(/^garden:\/\/github\/([\w-]+)/) || u.match(/^https:\/\/github\.com\/([\w-]+)\/?$/); if (gh) return github(gh[1]);
      var host = (u.match(/^https?:\/\/([^/]+)/) || [])[1] || '';
      if (NOFRAME.test(host)) {
        page.innerHTML = '<div class="gw-home gw-out"><h2>↗ ' + esc(host) + '</h2><p>This site doesn\'t allow itself to be shown inside another page, so the Garden opens it in a real tab.</p>' +
          '<p><a class="gos-btn gw-real" href="' + esc(u) + '" target="_blank" rel="noopener">Open ' + esc(host) + ' in a new tab ↗</a></p></div>';
        return;
      }
      page.innerHTML = '<iframe title="Garden Explorer" src="' + esc(u) + '" referrerpolicy="no-referrer"></iframe>' + (/^\//.test(u) || FRAMEOK.test(host) ? '' :
        '<div class="gw-note">Blank page? Some sites won\'t open inside the Garden. <a href="' + esc(u) + '" target="_blank" rel="noopener">Open it in a new tab ↗</a></div>');
    }
    function github(user) {
      page.innerHTML = '<div class="gw-home"><p>Loading github.com/' + esc(user) + '…</p></div>';
      Promise.all([fetch('https://api.github.com/users/' + user).then(function (r) { return r.json(); }),
                   fetch('https://api.github.com/users/' + user + '/repos?sort=updated&per_page=40').then(function (r) { return r.json(); })]).then(function (r) {
        var u = r[0] || {}, repos = Array.isArray(r[1]) ? r[1] : [];
        page.innerHTML = '<div class="gw-gh"><div class="gh-head">' + (u.avatar_url ? '<img alt="" src="' + esc(u.avatar_url) + '">' : '') + '<div><h2>' + esc(u.name || u.login || user) + '</h2><p>@' + esc(u.login || user) +
          (u.public_repos != null ? ' · ' + u.public_repos + ' public repos' : '') + '</p><a class="gos-btn" href="https://github.com/' + esc(user) + '" target="_blank" rel="noopener">Open on github.com ↗</a></div></div>' +
          '<div class="gh-list">' + repos.map(function (x) { return '<a class="gh-repo" href="' + esc(x.html_url) + '" target="_blank" rel="noopener"><b>' + esc(x.name) + '</b><span>' + esc(x.description || '') + '</span>' +
            '<small>' + esc([x.language, (x.stargazers_count ? '★ ' + x.stargazers_count : ''), 'updated ' + String(x.pushed_at || x.updated_at || '').slice(0, 10)].filter(Boolean).join(' · ')) + '</small></a>'; }).join('') + '</div></div>';
      }).catch(function () { page.innerHTML = '<div class="gw-home gw-out"><h2>GitHub</h2><p>Couldn\'t reach GitHub.</p><p><a class="gos-btn gw-real" href="https://github.com/' + esc(user) + '" target="_blank" rel="noopener">Open github.com/' + esc(user) + ' ↗</a></p></div>'; });
    }
    body.addEventListener('click', function (e) {
      var a = e.target.closest('[data-go]'); if (a) { e.preventDefault(); return go(a.dataset.go); }
      var b = e.target.closest('[data-b]'); if (!b) return;
      if (b.dataset.b === 'home') go('garden://home'); else if (b.dataset.b === 'go') go(url.value);
      else if (b.dataset.b === 'out') { if (!/^garden:\/\/home/.test(cur) && !/^\//.test(cur)) window.open(real(cur), '_blank', 'noopener'); else window.open(cur === 'garden://home' ? '/' : cur, '_blank', 'noopener'); }
      else { var prev = hist.pop(); if (prev) go(prev, true); }
    });
    url.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(url.value); });
    if (w) w.go = go;
    go(start || 'garden://home', true);
  }
  function notes(body) {
    body.innerHTML = '<textarea class="gos-notes" spellcheck="false" placeholder="Jot something down. It stays on this computer."></textarea>';
    var t = body.querySelector('textarea'); t.value = store('notes') || ''; t.addEventListener('input', function () { store('notes', t.value); });
  }
  function mines(body) {
    var N = 9, M = 10, cells, over;
    function reset() { over = false; cells = []; var bombs = {}; while (Object.keys(bombs).length < M) bombs[Math.floor(Math.random() * N * N)] = 1;
      for (var i = 0; i < N * N; i++) cells.push({ b: !!bombs[i], o: false, f: false });
      body.innerHTML = '<div class="gos-mines"><div class="gm-top"><span class="gm-n">' + M + '</span><button type="button" class="gm-face">🙂</button><span class="gm-t">0</span></div><div class="gm-grid"></div></div>';
      var g = body.querySelector('.gm-grid'); cells.forEach(function (c, i) { var b = el('button', 'gm-c'); b.type = 'button'; b.dataset.i = i; g.appendChild(b); c.el = b; });
      body.querySelector('.gm-face').onclick = reset;
      g.addEventListener('click', function (e) { var b = e.target.closest('.gm-c'); if (b) dig(+b.dataset.i); });
      g.addEventListener('contextmenu', function (e) { var b = e.target.closest('.gm-c'); if (!b) return; e.preventDefault(); var c = cells[+b.dataset.i]; if (c.o || over) return; c.f = !c.f; b.textContent = c.f ? '🚩' : ''; }); }
    function nb(i) { var x = i % N, y = Math.floor(i / N), r = []; for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) { var nx = x + dx, ny = y + dy; if ((dx || dy) && nx >= 0 && ny >= 0 && nx < N && ny < N) r.push(ny * N + nx); } return r; }
    function dig(i) { var c = cells[i]; if (over || c.o || c.f) return; c.o = true; c.el.classList.add('open'); click();
      if (c.b) { over = true; c.el.textContent = '💥'; cells.forEach(function (d) { if (d.b) d.el.textContent = d.el.textContent || '💣'; }); body.querySelector('.gm-face').textContent = '😵'; return; }
      var n = nb(i).filter(function (j) { return cells[j].b; }).length; c.el.textContent = n || ''; c.el.dataset.n = n; if (!n) nb(i).forEach(dig);
      if (cells.filter(function (d) { return !d.o && !d.b; }).length === 0) { over = true; body.querySelector('.gm-face').textContent = '😎'; } }
    reset();
  }
  function mypc(body) {
    body.innerHTML = '<div class="gos-pad gos-pc"><div class="gp-ico">🖥️</div><div><b>Garden OS 95</b><br>Registered to: CAK3D<br>The Corner Chronicle<br><br>' +
      'Clydius 486DX2 · 640 KB RAM<br>Drives: A:\\ (papers), C:\\ (the stash)<br>Cash drawer on COM1<br><br><small>Pretend computer. Real papers.</small></div></div>';
  }
  function bin(body) {
    body.innerHTML = '<div class="gos-pad"><table class="gos-table"><tr><th>Name</th><th>Size</th></tr><tr><td>📄 old_bong_water.txt</td><td>1 KB</td></tr><tr><td>📄 roach_clip_draft_final_FINAL.doc</td><td>12 KB</td></tr>' +
      '<tr><td>🖼️ clyde_blurry_zoomies.bmp</td><td>900 KB</td></tr><tr><td>📄 i_owe_herbie_5_GB.txt</td><td>1 KB</td></tr></table><p><small>The Recycle Bin is for show. Nothing here gets deleted for real.</small></p></div>';
  }
  // ---------------------------------------------------------------- Settings
  function settings(body) {
    var PAGES = [['system', '🖥️', 'System'], ['personal', '🎨', 'Personalization'], ['saver', '🌌', 'Screen saver'], ['taskbar', '▬', 'Taskbar'], ['time', '🕒', 'Time & language'],
                 ['sound', '🔊', 'Sound'], ['accounts', '👤', 'Accounts'], ['about', 'ℹ️', 'About']];
    body.innerHTML = '<div class="gset"><nav class="gs-nav"><div class="gs-me"><i class="gos-me-av"></i><div><b class="gos-me-name"></b><small>Local account</small></div></div>' +
      PAGES.map(function (p) { return '<button type="button" data-p="' + p[0] + '"><i>' + p[1] + '</i>' + p[2] + '</button>'; }).join('') + '</nav><section class="gs-page"></section></div>';
    var page = body.querySelector('.gs-page');
    function row(label, ctl, sub) { return '<div class="gs-row"><div><b>' + label + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div><div class="gs-ctl">' + ctl + '</div></div>'; }
    function sel(key, opts) { return '<select data-k="' + key + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(S[key]) === String(o[0]) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; }
    function tog(key) { return '<label class="gs-tog"><input type="checkbox" data-k="' + key + '"' + (S[key] ? ' checked' : '') + '><i></i></label>'; }
    function show(p) {
      Array.prototype.forEach.call(body.querySelectorAll('.gs-nav [data-p]'), function (b) { b.classList.toggle('on', b.dataset.p === p); });
      var h = '<h2>' + PAGES.filter(function (x) { return x[0] === p; })[0][2] + '</h2>';
      if (p === 'system') h += row('Brightness', '<input type="range" min="40" max="120" data-k="bright" value="' + S.bright + '">') + row('Night light', tog('night'), 'Warmer colors, easier at night') +
        row('Text & app size', sel('scale', [[90, '90%'], [100, '100% (recommended)'], [110, '110%'], [125, '125%']]));
      if (p === 'personal') h += '<h3>Background</h3><div class="gs-walls">' + Object.keys(WALLS).map(function (k) { return '<button type="button" class="gs-wall' + (S.wall === k ? ' on' : '') + '" data-wall="' + k + '" style="background:' + WALLS[k] + '"></button>'; }).join('') +
        (S.wallImg ? '<button type="button" class="gs-wall' + (S.wall === 'custom' ? ' on' : '') + '" data-wall="custom" style="background:url(' + S.wallImg + ') center/cover"></button>' : '') + '</div>' +
        row('Your own picture', '<label class="gos-btn gs-file">Browse photos<input type="file" accept="image/*" hidden></label>', 'Kept on this computer only') +
        row('Choose a fit', sel('fit', [['cover', 'Fill'], ['contain', 'Fit'], ['auto', 'Center'], ['100% 100%', 'Stretch']])) +
        '<h3>Colors</h3>' + row('Mode', sel('mode', [['dark', 'Dark'], ['light', 'Light']])) +
        row('Accent color', '<div class="gs-acc">' + ACCENTS.map(function (c) { return '<button type="button" data-acc="' + c + '" style="background:' + c + '"' + (S.accent === c ? ' class="on"' : '') + '></button>'; }).join('') + '</div>') +
        '<h3>Themes</h3>' + row('Theme', sel('theme', [['eleven', 'Garden 11'], ['classic', 'Garden 95 (classic)']])) + row('Desktop icons', sel('icons', [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']]));
      if (p === 'saver') h += row('Screen saver', sel('saver', [['none', '(None)'], ['starfield', 'Starfield'], ['mystify', 'Mystify'], ['bubbles', 'Bubbles'], ['matrix', 'Falling code'], ['leaves', 'Fall leaves'], ['clock', 'Floating clock'], ['photos', 'Photos of the stand']])) +
        row('Wait', sel('saverMin', [[1, '1 minute'], [2, '2 minutes'], [5, '5 minutes'], [10, '10 minutes'], [15, '15 minutes']]), 'It also comes on on the monitor while you\'re behind the counter') +
        row('Preview', '<button type="button" class="gos-btn" data-act="preview">Preview</button>');
      if (p === 'taskbar') h += row('Taskbar alignment', sel('align', [['center', 'Center'], ['left', 'Left']])) + row('Show seconds in the clock', tog('seconds'));
      if (p === 'time') h += row('24-hour clock', tog('clock24')) + row('Time zone', '<span>' + esc(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local') + '</span>');
      if (p === 'sound') h += row('System sounds', tog('sounds'), 'Clicks, the chime, the cash drawer');
      if (p === 'accounts') h += row('Name', '<input type="text" data-k="user" value="' + esc(S.user) + '" maxlength="20">') +
        row('Picture', '<div class="gs-avs">' + ['🌿', '🐶', '🍄', '🔥', '🌙', '🧑‍🌾', '🦉', '🎸'].map(function (a) { return '<button type="button" data-av="' + a + '"' + (S.avatar === a ? ' class="on"' : '') + '>' + a + '</button>'; }).join('') + '</div>');
      if (p === 'about') h += '<div class="gs-about"><i class="gos-logo big"></i><div><b>Garden OS 11</b><p>Device name: THE-KIOSK-PC<br>Processor: Clydius Core i4.20 @ 4.20 GHz<br>Installed RAM: 16.0 GB<br>Cash drawer: COM1<br>Registered to: ' + esc(S.user) +
        '</p><p><small>A pretend PC with real papers. Your settings are kept in this browser.</small></p></div></div>' + row('Reset everything', '<button type="button" class="gos-btn" data-act="reset">Reset settings</button>');
      page.innerHTML = h; Array.prototype.forEach.call(body.querySelectorAll('.gos-me-av'), function (a) { a.textContent = S.avatar; });
      Array.prototype.forEach.call(body.querySelectorAll('.gos-me-name'), function (a) { a.textContent = S.user; });
    }
    body.addEventListener('click', function (e) {
      var n = e.target.closest('[data-p]'); if (n) return show(n.dataset.p);
      var wl = e.target.closest('[data-wall]'); if (wl) { S.wall = wl.dataset.wall; saveS(); return show('personal'); }
      var ac = e.target.closest('[data-acc]'); if (ac) { S.accent = ac.dataset.acc; saveS(); return show('personal'); }
      var av = e.target.closest('[data-av]'); if (av) { S.avatar = av.dataset.av; saveS(); return show('accounts'); }
      var act = e.target.closest('[data-act]'); if (!act) return;
      if (act.dataset.act === 'preview') startSaver(S.saver === 'none' ? 'starfield' : S.saver, true);
      if (act.dataset.act === 'reset') { S = Object.assign({}, DEF); saveS(); show('about'); }
    });
    body.addEventListener('change', function (e) {
      var k = e.target.dataset.k;
      if (e.target.type === 'file' && e.target.files[0]) { var f = e.target.files[0], r = new FileReader();
        r.onload = function () { var im = new Image(); im.onload = function () {   // shrink it so it fits in the browser's storage
          var c = document.createElement('canvas'), sc = Math.min(1, 1600 / Math.max(im.width, im.height)); c.width = im.width * sc; c.height = im.height * sc; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          S.wallImg = c.toDataURL('image/jpeg', 0.82); S.wall = 'custom'; saveS(); show('personal'); }; im.src = r.result; }; r.readAsDataURL(f); return; }
      if (!k) return;
      S[k] = e.target.type === 'checkbox' ? e.target.checked : (/^(bright|scale|saverMin)$/.test(k) ? +e.target.value : e.target.value); saveS();
    });
    body.addEventListener('input', function (e) { if (e.target.dataset.k === 'bright') { S.bright = +e.target.value; saveS(); } if (e.target.dataset.k === 'user') { S.user = e.target.value || 'CAK3D'; saveS(); } });
    show('personal');
  }

  // ---------------------------------------------------------------- File Explorer
  var PICS = [['desk-day.jpg', '/scene/desk-day.jpg'], ['desk-night.jpg', '/scene/desk-night.jpg'], ['behind-day.jpg', '/scene/behind-day.jpg'], ['behind-night.jpg', '/scene/behind-night.jpg'],
              ['the-till.jpg', '/scene/drawer-day.jpg']].concat([0, 1, 2, 3, 4, 5, 6].map(function (i) { return ['jar-' + (i + 1) + '.jpg', '/scene/jar_' + i + '-day.jpg']; }));
  function files(body) {
    var PLACES = [['home', '🏠', 'Home'], ['docs', '📄', 'Documents'], ['pics', '🖼️', 'Pictures'], ['papers', '📰', 'The papers'], ['pc', '💻', 'This PC']];
    body.innerHTML = '<div class="gfx"><nav>' + PLACES.map(function (p) { return '<button type="button" data-pl="' + p[0] + '"><i>' + p[1] + '</i>' + p[2] + '</button>'; }).join('') + '</nav><div class="gfx-main"><div class="gfx-path"></div><div class="gfx-grid"></div></div></div>';
    function item(ico, name, act, arg, sub) { return '<button type="button" class="gfx-it" data-act="' + act + '" data-arg="' + esc(arg || '') + '"><span>' + ico + '</span><b>' + esc(name) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</button>'; }
    function show(p) {
      Array.prototype.forEach.call(body.querySelectorAll('[data-pl]'), function (b) { b.classList.toggle('on', b.dataset.pl === p); });
      body.querySelector('.gfx-path').textContent = 'This PC › ' + PLACES.filter(function (x) { return x[0] === p; })[0][2];
      var h = '';
      if (p === 'home' || p === 'docs') h += item('📝', 'notes.txt', 'app', 'notes', 'Text document') + item('📊', 'receipts.xlsx', 'app', 'ledger', 'Garden Bucks ledger') + item('💵', 'register.exe', 'app', 'register', 'Application');
      if (p === 'home' || p === 'pics') h += PICS.map(function (x) { return '<button type="button" class="gfx-it gfx-pic" data-act="pic" data-arg="' + x[1] + '"><img alt="" src="' + x[1] + '"><b>' + x[0] + '</b></button>'; }).join('');
      if (p === 'papers') h += PAPERS.map(function (x) { return item('📰', x[0], 'web', x[1], 'Web page'); }).join('');
      if (p === 'pc') h += item('💽', 'Local Disk (C:)', 'none', '', '420 GB free of 1 TB') + item('🗃️', 'The Stash (D:)', 'none', '', 'Seed packs, pre-rolls, tools') + item('🌐', 'The Garden (\\\\garden)', 'web', 'garden://home', 'Network');
      body.querySelector('.gfx-grid').innerHTML = h;
    }
    body.addEventListener('click', function (e) {
      var pl = e.target.closest('[data-pl]'); if (pl) return show(pl.dataset.pl);
      var it = e.target.closest('.gfx-it'); if (!it) return;
      var a = it.dataset.act, g = it.dataset.arg;
      if (a === 'app') launch(g); if (a === 'pic') { var w = launch('photos'); if (w && w.showPic) w.showPic(g); } if (a === 'web') { var ww = launch('web'); if (ww && ww.go) ww.go(g); }
    });
    show('home');
  }

  // ---------------------------------------------------------------- Photos
  function photos(body, w) {
    var i = 0;
    body.innerHTML = '<div class="gph"><div class="gph-view"><img alt=""></div><div class="gph-bar"><button type="button" class="gos-btn" data-d="-1">◀</button><span class="gph-name"></span>' +
      '<button type="button" class="gos-btn" data-d="1">▶</button><button type="button" class="gos-btn" data-d="wall">Set as background</button></div></div>';
    function show() { var p = PICS[(i + PICS.length) % PICS.length]; body.querySelector('img').src = p[1]; body.querySelector('.gph-name').textContent = p[0]; }
    body.addEventListener('click', function (e) { var b = e.target.closest('[data-d]'); if (!b) return;
      if (b.dataset.d === 'wall') { var p = PICS[(i + PICS.length) % PICS.length][1], key = Object.keys(WALLS).filter(function (k) { return WALLS[k].indexOf(p) >= 0; })[0];
        if (key) S.wall = key; else { S.wall = 'custom'; S.wallImg = p; } saveS(); return; }
      i += +b.dataset.d; show(); });
    if (w) w.showPic = function (src) { var k = PICS.map(function (x) { return x[1]; }).indexOf(src); if (k >= 0) i = k; show(); };
    show();
  }

  // ---------------------------------------------------------------- Calculator
  function calc(body) {
    var cur = '0', acc = null, op = null, fresh = true;
    var KEYS = ['%', 'CE', 'C', '⌫', '¹/x', 'x²', '√x', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '±', '0', '.', '='];
    body.innerHTML = '<div class="gcalc"><div class="gc-hist"></div><div class="gc-out">0</div><div class="gc-keys">' + KEYS.map(function (k) { return '<button type="button" class="' + (/[0-9.]/.test(k) ? 'n' : k === '=' ? 'eq' : '') + '">' + k + '</button>'; }).join('') + '</div></div>';
    var out = body.querySelector('.gc-out'), hist = body.querySelector('.gc-hist');
    function num() { return parseFloat(cur) || 0; }
    function fmt(n) { return (Math.round(n * 1e10) / 1e10).toString(); }
    function doOp() { if (op == null || acc == null) return num(); var b = num(); return op === '+' ? acc + b : op === '−' ? acc - b : op === '×' ? acc * b : b === 0 ? NaN : acc / b; }
    body.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var k = b.textContent; click();
      if (/^[0-9]$/.test(k)) { cur = fresh || cur === '0' ? k : cur + k; fresh = false; }
      else if (k === '.') { if (fresh) { cur = '0.'; fresh = false; } else if (cur.indexOf('.') < 0) cur += '.'; }
      else if (k === 'C') { cur = '0'; acc = null; op = null; fresh = true; hist.textContent = ''; }
      else if (k === 'CE') { cur = '0'; fresh = true; }
      else if (k === '⌫') { cur = cur.length > 1 ? cur.slice(0, -1) : '0'; }
      else if (k === '±') cur = fmt(-num()); else if (k === '%') cur = fmt(num() / 100); else if (k === '¹/x') cur = fmt(1 / num()); else if (k === 'x²') cur = fmt(num() * num()); else if (k === '√x') cur = fmt(Math.sqrt(num()));
      else if (k === '=') { var r = doOp(); hist.textContent = (acc != null ? fmt(acc) + ' ' + op + ' ' + cur + ' =' : ''); cur = isNaN(r) ? 'Cannot divide by zero' : fmt(r); acc = null; op = null; fresh = true; }
      else { acc = op ? doOp() : num(); op = k; fresh = true; hist.textContent = fmt(acc) + ' ' + k; cur = fmt(acc); }
      out.textContent = cur; });
  }

  // ---------------------------------------------------------------- Paint
  function paint(body) {
    var COLS = ['#000000', '#7f7f7f', '#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8', '#3f48cc', '#a349a4', '#ffffff', '#c3c3c3', '#b97a57', '#ffaec9', '#ffc90e', '#b5e61d', '#99d9ea', '#7092be'];
    body.innerHTML = '<div class="gpaint"><div class="gp-tools"><button type="button" data-t="brush" class="on">🖌️</button><button type="button" data-t="eraser">🧽</button><button type="button" data-t="fill">🪣</button>' +
      '<select class="gp-size"><option value="2">2 px</option><option value="5" selected>5 px</option><option value="10">10 px</option><option value="20">20 px</option></select>' +
      '<div class="gp-cols">' + COLS.map(function (c, k) { return '<button type="button" data-c="' + c + '" style="background:' + c + '"' + (k === 0 ? ' class="on"' : '') + '></button>'; }).join('') + '</div>' +
      '<button type="button" class="gos-btn" data-a="clear">New</button><button type="button" class="gos-btn" data-a="save">Save</button><button type="button" class="gos-btn" data-a="wall">Set as background</button></div>' +
      '<div class="gp-canvas"><canvas width="800" height="500"></canvas></div></div>';
    var c = body.querySelector('canvas'), x = c.getContext('2d'), tool = 'brush', col = '#000000', size = 5, drawing = null;
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    var saved = store('paint'); if (saved) { var im = new Image(); im.onload = function () { x.drawImage(im, 0, 0); }; im.src = saved; }
    function pos(e) { var r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * c.width / r.width, y: (e.clientY - r.top) * c.height / r.height }; }
    function keep() { try { store('paint', c.toDataURL('image/png')); } catch (e) {} }
    function fill(p) {   // a simple flood fill
      var d = x.getImageData(0, 0, c.width, c.height), W = c.width, H = c.height, i0 = ((p.y | 0) * W + (p.x | 0)) * 4, t = [d.data[i0], d.data[i0 + 1], d.data[i0 + 2]];
      var rgb = [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)]; if (t[0] === rgb[0] && t[1] === rgb[1] && t[2] === rgb[2]) return;
      var st = [[p.x | 0, p.y | 0]], seen = new Uint8Array(W * H);
      while (st.length) { var q = st.pop(), qx = q[0], qy = q[1]; if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue; var k = qy * W + qx; if (seen[k]) continue; seen[k] = 1;
        var j = k * 4; if (Math.abs(d.data[j] - t[0]) + Math.abs(d.data[j + 1] - t[1]) + Math.abs(d.data[j + 2] - t[2]) > 40) continue;
        d.data[j] = rgb[0]; d.data[j + 1] = rgb[1]; d.data[j + 2] = rgb[2]; d.data[j + 3] = 255; st.push([qx + 1, qy], [qx - 1, qy], [qx, qy + 1], [qx, qy - 1]); }
      x.putImageData(d, 0, 0);
    }
    c.addEventListener('pointerdown', function (e) { var p = pos(e); if (tool === 'fill') { fill(p); keep(); return; } drawing = p; try { c.setPointerCapture(e.pointerId); } catch (z) {} e.preventDefault(); });
    c.addEventListener('pointermove', function (e) { if (!drawing) return; var p = pos(e); x.strokeStyle = tool === 'eraser' ? '#fff' : col; x.lineWidth = tool === 'eraser' ? size * 3 : size; x.lineCap = x.lineJoin = 'round';
      x.beginPath(); x.moveTo(drawing.x, drawing.y); x.lineTo(p.x, p.y); x.stroke(); drawing = p; });
    c.addEventListener('pointerup', function () { if (drawing) keep(); drawing = null; });
    body.addEventListener('click', function (e) {
      var t = e.target.closest('[data-t]'); if (t) { tool = t.dataset.t; Array.prototype.forEach.call(body.querySelectorAll('[data-t]'), function (b) { b.classList.toggle('on', b === t); }); }
      var cc = e.target.closest('[data-c]'); if (cc) { col = cc.dataset.c; Array.prototype.forEach.call(body.querySelectorAll('[data-c]'), function (b) { b.classList.toggle('on', b === cc); }); }
      var a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'clear') { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); keep(); }
      if (a.dataset.a === 'save') { var l = document.createElement('a'); l.download = 'garden-paint.png'; l.href = c.toDataURL('image/png'); l.click(); }
      if (a.dataset.a === 'wall') { S.wallImg = c.toDataURL('image/jpeg', 0.85); S.wall = 'custom'; saveS(); }
    });
    body.querySelector('.gp-size').addEventListener('change', function (e) { size = +e.target.value; });
  }
})();
