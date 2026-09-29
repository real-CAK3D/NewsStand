/* Garden OS 95 — the computer behind the counter, after henryheffernan.com: the desktop lives on the monitor (mapped onto the render), and
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
  function click() { if (K()) K().sfx.click(); }

  var APPS = [
    { id: 'register', name: 'Register', ico: '💵', w: 460, h: 330, open: register },
    { id: 'cams', name: 'Security Cams', ico: '📹', w: 560, h: 380, open: cams },
    { id: 'shop', name: 'Smoke Shop', ico: '🛒', w: 440, h: 360, open: shop },
    { id: 'ledger', name: 'Ledger.xls', ico: '📊', w: 520, h: 340, open: ledger },
    { id: 'web', name: 'Garden Explorer', ico: '🌐', w: 700, h: 470, open: web },
    { id: 'notes', name: 'Notepad', ico: '📝', w: 420, h: 300, open: notes },
    { id: 'mines', name: 'Minesweeper', ico: '💣', w: 250, h: 320, open: mines },
    { id: 'pc', name: 'My Computer', ico: '🖥️', w: 400, h: 280, open: mypc },
    { id: 'bin', name: 'Recycle Bin', ico: '🗑️', w: 380, h: 250, open: bin }];

  // ---------------------------------------------------------------- the desktop
  root.innerHTML = '<div class="gos-boot"></div><div class="gos-desk"><div class="gos-wall">' + ((document.getElementById('tpl-seal') || {}).innerHTML || '') + '</div><div class="gos-icons">' + APPS.map(function (a) {
      return '<button type="button" class="gos-ico" data-app="' + a.id + '"><span>' + a.ico + '</span><b>' + a.name + '</b></button>'; }).join('') + '</div>' +
    '<div class="gos-wins"></div><div class="gos-start-menu" hidden><div class="gos-sm-side">Garden<b>OS 95</b></div><div class="gos-sm-list">' +
    APPS.map(function (a) { return '<button type="button" data-app="' + a.id + '"><span>' + a.ico + '</span>' + a.name + '</button>'; }).join('') +
    '<hr><button type="button" data-cmd="shutdown"><span>⏻</span>Shut Down…</button></div></div>' +
    '<div class="gos-bar"><button type="button" class="gos-start"><b>⊞</b> Start</button><div class="gos-tasks"></div><div class="gos-tray"><span class="gos-vol">🔊</span><span class="gos-clock"></span></div></div></div>' +
    '<div class="gos-idle"><b>GARDEN OS 95</b><span>click the screen to sit down</span></div>';
  root.classList.add('off');
  function clock() { var c = $('.gos-clock'); if (c) c.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
  clock(); setInterval(clock, 15000);
  root.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target : null; if (!t || !inPC) return;
    var ico = t.closest('.gos-ico'); if (ico) { var now = Date.now();   // desktop icons: select, then double-click (a single tap on phones)
      if (phone || (ico.dataset.last && now - ico.dataset.last < 450)) { launch(ico.dataset.app); ico.dataset.last = ''; }
      else { Array.prototype.forEach.call(root.querySelectorAll('.gos-ico'), function (x) { x.classList.toggle('sel', x === ico); }); ico.dataset.last = now; }
      return; }
    var sm = $('.gos-start-menu');
    if (t.closest('.gos-start')) { sm.hidden = !sm.hidden; click(); return; }
    var item = t.closest('.gos-sm-list [data-app], .gos-sm-list [data-cmd]');
    if (item) { sm.hidden = true; if (item.dataset.cmd === 'shutdown') return leave(); return launch(item.dataset.app); }
    if (!t.closest('.gos-start-menu')) sm.hidden = true;
    var task = t.closest('.gos-task'); if (task) { var w = wins[task.dataset.app]; if (w) { if (w.classList.contains('min') || +w.style.zIndex !== zTop) { w.classList.remove('min'); focus(w); } else w.classList.add('min'); } }
  });

  // ---------------------------------------------------------------- windows
  function launch(id) {
    var a = APPS.filter(function (x) { return x.id === id; })[0]; if (!a) return; click();
    if (wins[id]) { wins[id].classList.remove('min'); focus(wins[id]); return wins[id]; }
    var n = Object.keys(wins).length, w = el('div', 'gos-win');
    w.style.width = a.w + 'px'; w.style.height = a.h + 'px'; w.style.left = (40 + n * 26) + 'px'; w.style.top = (24 + n * 22) + 'px';
    w.innerHTML = '<div class="gos-title"><span>' + a.ico + ' ' + a.name + '</span><button type="button" data-w="min">_</button><button type="button" data-w="max">□</button><button type="button" data-w="x">×</button></div><div class="gos-body"></div>';
    $('.gos-wins').appendChild(w); wins[id] = w; focus(w);
    var task = el('button', 'gos-task', a.ico + ' ' + a.name); task.type = 'button'; task.dataset.app = id; $('.gos-tasks').appendChild(task); w.task = task;
    w.addEventListener('pointerdown', function () { focus(w); });
    w.querySelector('.gos-title').addEventListener('click', function (e) { var b = e.target.closest('[data-w]'); if (!b) return;
      if (b.dataset.w === 'x') closeWin(id); else if (b.dataset.w === 'min') w.classList.add('min'); else w.classList.toggle('max'); click(); });
    drag(w, w.querySelector('.gos-title'));
    w.clean = a.open(w.querySelector('.gos-body'), w) || null;
    return w;
  }
  function closeWin(id) { var w = wins[id]; if (!w) return; if (w.clean) w.clean(); w.task.remove(); w.remove(); delete wins[id]; }
  function focus(w) { zTop++; w.style.zIndex = zTop; Array.prototype.forEach.call(root.querySelectorAll('.gos-win'), function (x) { x.classList.toggle('active', x === w); });
    Array.prototype.forEach.call(root.querySelectorAll('.gos-task'), function (x) { x.classList.toggle('active', x === w.task); }); }
  function drag(w, handle) {   // the desktop is scaled (and in perspective) on the monitor: turn screen pixels back into desktop pixels
    var st = null;
    handle.addEventListener('pointerdown', function (e) { if (e.target.closest('button') || w.classList.contains('max')) return;
      var k = root.getBoundingClientRect().width / root.offsetWidth || 1; st = { x: e.clientX, y: e.clientY, l: w.offsetLeft, t: w.offsetTop, k: k };
      try { handle.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
    handle.addEventListener('pointermove', function (e) { if (!st) return;
      w.style.left = Math.max(-w.offsetWidth + 60, Math.min(root.offsetWidth - 60, st.l + (e.clientX - st.x) / st.k)) + 'px';
      w.style.top = Math.max(0, Math.min(root.offsetHeight - 60, st.t + (e.clientY - st.y) / st.k)) + 'px'; });
    handle.addEventListener('pointerup', function () { st = null; });
  }

  // ---------------------------------------------------------------- sitting down / standing up
  function enter(then) {
    if (inPC) { if (then) then(); return; }
    inPC = true; document.body.classList.add('in-pc'); root.classList.remove('off');
    if (window.sceneZoomQuad) window.sceneZoomQuad('behind', 'pos_screen', phone ? 0.98 : 0.92);
    if (K()) K().sfx.click();
    if (phone) setTimeout(function () {   // on a phone the desktop comes off the monitor and fills the screen
      full = el('div', 'gos-full'); var back = el('button', 'gos-full-x', '⤺ Stand up'); back.type = 'button'; back.onclick = leave;
      full.appendChild(root); full.appendChild(back); document.body.appendChild(full); }, 420);
    if (!booted) boot(then); else if (then) setTimeout(then, phone ? 450 : 50);
  }
  function leave() {
    if (!inPC) return; inPC = false; document.body.classList.remove('in-pc');
    if (full) { screenEl.appendChild(root); full.remove(); full = null; }
    var sm = $('.gos-start-menu'); if (sm) sm.hidden = true;
    if (document.activeElement && root.contains(document.activeElement)) document.activeElement.blur();
    if (window.sceneReset) window.sceneReset();
  }
  function boot(then) {
    var b = $('.gos-boot'), lines = ['GARDEN BIOS v4.20  (C) 2026 The Garden', '', 'CPU: Clydius 486DX2 @ 66 MHz', 'Memory Test: 640K OK', 'Detecting drives ... CLYDE.SYS  OK',
      'Detecting cash drawer ... COM1  OK', 'Mounting the papers ... 16 found', '', 'Starting Garden OS 95...'];
    root.classList.add('booting'); b.textContent = ''; var k = 0;
    (function next() {
      if (k < lines.length) { b.textContent += lines[k++] + '\n'; if (K()) K().sfx.click(); setTimeout(next, k === lines.length ? 500 : 170); return; }
      b.innerHTML = '<div class="gos-splash"><b>Garden</b><i>OS 95</i><div class="gos-load"><span></span></div></div>';
      setTimeout(function () { root.classList.remove('booting'); booted = true; if (K()) K().sfx.bell(); if (then) then(); }, 1300);
    })();
  }
  screenEl.addEventListener('click', function (e) { if (!inPC) { e.stopPropagation(); enter(); } });
  window.gardenOS = { enter: enter, leave: leave, launch: function (id) { enter(function () { launch(id); }); } };
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
  function web(body) {
    body.innerHTML = '<div class="gos-web"><div class="gw-bar"><button type="button" class="gos-btn" data-b="back">◀</button><button type="button" class="gos-btn" data-b="home">⌂</button>' +
      '<input type="text" class="gw-url" value="garden://home"><button type="button" class="gos-btn" data-b="go">Go</button></div><div class="gw-page"></div></div>';
    var page = body.querySelector('.gw-page'), url = body.querySelector('.gw-url'), hist = [];
    function home() { url.value = 'garden://home'; page.innerHTML = '<div class="gw-home"><h2>🌿 Garden Explorer</h2><p>The papers of The Corner Chronicle:</p><div class="gw-links">' +
      PAPERS.map(function (p) { return '<a href="#" data-go="' + p[1] + '">' + esc(p[0]) + '</a>'; }).join('') + '</div></div>'; }
    function go(p) { if (!p || p === 'garden://home') return home(); if (!/^\//.test(p)) p = '/' + p.replace(/^https?:\/\/[^/]+/, ''); hist.push(url.value); url.value = p;
      page.innerHTML = '<iframe title="Garden Explorer" src="' + esc(p) + '"></iframe>'; }
    body.addEventListener('click', function (e) { var a = e.target.closest('[data-go]'); if (a) { e.preventDefault(); go(a.dataset.go); }
      var b = e.target.closest('[data-b]'); if (!b) return; if (b.dataset.b === 'home') home(); else if (b.dataset.b === 'go') go(url.value.trim()); else { var prev = hist.pop(); if (prev) { url.value = prev; if (prev === 'garden://home') home(); else page.innerHTML = '<iframe title="Garden Explorer" src="' + esc(prev) + '"></iframe>'; } } });
    url.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(url.value.trim()); });
    home();
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
})();
