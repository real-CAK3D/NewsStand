/* The Corner Chronicle, the 3D kiosk: lays the live layer onto the Blender renders and lets you zoom in.
   window.SCENE (inlined by build_newsstand.py) holds, per camera view ("desk" = out front, "behind" = behind the counter), the render size
   and where every rack slot, sign and prop landed in the image. Covers, the sign, the chalkboard, the punch card, the radio dial, the TV
   screen, the tear-off flyer, the register screen and tape, the zines and the EXTRA poster are real HTML mapped onto those spots with a
   perspective transform (matrix3d); every prop gets an invisible button over it.
   One view on every screen, like the web: tap an area to zoom to it (on phones the first tap always zooms), tap a prop or a paper to use it,
   tap the stand itself to zoom back out; drag to look around while zoomed. "Behind the counter" swaps to the view from inside.
   Runs before kiosk.js, radio.js, tv.js, stash.js and weather.js, which find the same ids. */
(function () {
  'use strict';
  var SC = window.SCENE, PAPERS = window.SCENE_PAPERS || {};
  if (!SC || !SC.desk) return;
  var phone = matchMedia('(max-width: 899px), (pointer: coarse)').matches;
  var hr = new Date().getHours(), night = hr < 6 || hr >= 19;
  var LABELS = { radio: 'Radio — tap for the controls', ashtray: 'Ashtray', bell: 'Ring the bell — search every paper', register: 'The register — shop & Garden Bucks',
                 phone: 'Tip line', mail: 'Letters to the Editor', drawer: 'Your Scrapbook', stash: 'Your stash box', seeds: 'Seed packs — The Seed Catalog',
                 shop: 'The smoke shop', tv: 'The TV', cashbox: 'The cash drawer', pos: 'The computer — click the screen', bowl: "Clyde's bowls" };
  var JARS = ['First Light Haze', 'Big Fix OG', 'Crash Cart Kush', 'Front Page Purple', 'Belly Laugh Blue', 'Payday Punch', "Keeper's Reserve"];

  // ---- the math: a w×h box onto four corners (TL, TR, BR, BL) with a CSS matrix3d
  function adj(m) { return [m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4], m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6],
                             m[2] * m[3] - m[0] * m[5], m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3]]; }
  function mm(a, b) { var c = []; for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) { var s = 0; for (var k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j]; c[3 * i + j] = s; } return c; }
  function mv(m, v) { return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]]; }
  function basis(p) { var m = [p[0][0], p[1][0], p[2][0], p[0][1], p[1][1], p[2][1], 1, 1, 1], v = mv(adj(m), [p[3][0], p[3][1], 1]); return mm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]); }
  function matrix3d(w, h, q) {
    var t = mm(basis([q[0], q[1], q[3], q[2]]), adj(basis([[0, 0], [w, 0], [0, h], [w, h]])));
    for (var i = 0; i < 9; i++) t[i] = t[i] / t[8];
    return 'matrix3d(' + [t[0], t[3], 0, t[6], t[1], t[4], 0, t[7], 0, 0, 1, 0, t[2], t[5], 0, t[8]].join(',') + ')';
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function pct(node, r) { node.style.left = (r[0] * 100) + '%'; node.style.top = (r[1] * 100) + '%'; node.style.width = ((r[2] - r[0]) * 100) + '%'; node.style.height = ((r[3] - r[1]) * 100) + '%'; }

  var root = document.getElementById('k-scenes'), placed = [], views = {};
  function mapped(v, name, node, w, h) {
    var q = v.anch.quads[name]; if (!q) return null;
    node.style.width = w + 'px'; node.style.height = h + 'px'; node.classList.add('q');
    v.ov.appendChild(node); placed.push({ v: v, node: node, q: q, w: w, h: h }); return node;
  }
  function spot(v, name, id, tag, cls) {
    var r = v.anch.rects[name]; if (!r) return null;
    var b = el(tag || 'button', 'hs ' + (cls || '')); if (id) b.id = id;
    if (b.tagName === 'BUTTON') b.type = 'button';
    pct(b, r); b.setAttribute('aria-label', LABELS[name] || name); b.dataset.tip = LABELS[name] || '';
    v.ov.appendChild(b); return b;
  }
  function point(v, name, cls, html) { var p = v.anch.points[name]; if (!p) return null; var n = el('div', cls, html); n.style.left = (p[0] * 100) + '%'; n.style.top = (p[1] * 100) + '%'; v.ov.appendChild(n); return n; }
  function layout() {
    placed.forEach(function (p) {
      var W = p.v.stage.clientWidth, H = p.v.stage.clientHeight; if (!W) return;
      p.node.style.transform = matrix3d(p.w, p.h, p.q.map(function (c) { return [c[0] * W, c[1] * H]; }));
    });
  }

  function makeView(name) {
    var anch = SC[name]; if (!anch) return null;
    var wrap = el('div', 'sc-view sc-' + name), frame = el('div', 'sc-frame'), stage = el('div', 'sc-stage');
    stage.style.aspectRatio = anch.size[0] + ' / ' + anch.size[1];
    stage.innerHTML = '<img class="sc-img" alt="" draggable="false" src="/scene/' + name + '-' + (night ? 'night' : 'day') + '.jpg">';
    var ov = el('div', 'sc-ov'); stage.appendChild(ov); frame.appendChild(stage); wrap.appendChild(frame); root.appendChild(wrap);
    var v = { name: name, anch: anch, wrap: wrap, frame: frame, stage: stage, ov: ov, s: 1, tx: 0, ty: 0 };
    views[name] = v; zoomable(v); return v;
  }

  // ---------------------------------------------------------------- OUT FRONT
  var F = makeView('desk');
  var fx = el('div', 'k-fx'); fx.id = 'k-fx'; F.stage.insertBefore(fx, F.ov);
  var wx = el('div', 'k-wx'); wx.id = 'k-wx'; F.stage.insertBefore(wx, F.ov);
  ['front', 'left', 'right'].forEach(function (side) {
    (PAPERS[side] || []).forEach(function (id, i) {
      var t = document.getElementById('tpl-mag-' + id); if (!t) return;
      var n = el('div', 'slot'); n.innerHTML = t.innerHTML; mapped(F, side + '_' + i, n, 200, 266);
    });
  });
  for (var z = 0; z < 5; z++) { var zn = el('a', 'zine-q'); zn.id = 'zine-q-' + z; zn.hidden = true; mapped(F, 'zine_' + z, zn, 120, 160); }
  var ex = document.getElementById('ns-extra-tpl');
  if (ex) { var e2 = el('a', 'ns-extra'); e2.innerHTML = ex.innerHTML; e2.id = 'ns-extra'; e2.href = ex.dataset.href; e2.hidden = true; mapped(F, 'extra_poster', e2, 560, 170); }
  mapped(F, 'sign', el('div', 'sg', '★ The Corner Chronicle ★'), 960, 80);
  mapped(F, 'marquee', el('div', 'mq', '<span id="ns-hi">Good morning, CAK3D</span> · <span id="ns-date"></span>'), 600, 40);
  mapped(F, 'chalkboard', el('div', 'cb', '<b>TODAY</b><p id="cb-head">Fresh papers on the rack</p><i id="ns-wx"></i><s>📻 8 stations on the counter radio</s>'), 300, 390);
  var pc = mapped(F, 'punch', el('div', 'k-punch', '<div class="k-punch-h">REGULAR\'S CARD</div><div class="k-punch-holes" id="k-punch-holes"></div><div class="k-punch-f" id="k-punch-f"></div>'), 150, 120);
  if (pc) { pc.id = 'k-punch'; pc.setAttribute('role', 'button'); pc.tabIndex = 0; }
  var rd = mapped(F, 'register_screen', el('div', 'rg-disp', 'OPEN'), 130, 50); if (rd) rd.id = 'rg-disp';
  mapped(F, 'ticker', el('div', 'rg-tape', '<div class="rg-tape-in" id="rg-tape">THE GARDEN TOKEN AVERAGE · loading…</div>'), 900, 50);
  mapped(F, 'radio_dial', el('div', 'rd-dial', '<div class="rd-scale"><span>88</span><span>92</span><span>96</span><span>100</span><span>104</span><span>108</span></div>' +
    '<div class="rd-needle-h"></div><div class="rd-station">OFF</div>'), 280, 110);
  var tvq = mapped(F, 'tv_screen', el('div', 'tv-q', '<div class="tv-ch" id="tv-small"></div><div class="tv-glass"></div>'), 320, 290); if (tvq) tvq.id = 'k-tvq';
  var fl = mapped(F, 'flyer', el('div', 'flyer', '<div class="fl-kind" id="fl-kind"></div><div class="fl-title" id="fl-title"></div><div class="fl-text" id="fl-text"></div><div class="fl-tabs" id="fl-tabs"></div>'), 280, 430);
  if (fl) fl.id = 'k-flyer';
  var radio = spot(F, 'radio', 'k-radio', 'div', 'k-radio');
  if (radio) {
    var r = F.anch.rects.radio, W_ = r[2] - r[0], H_ = r[3] - r[1];
    [['radio_vol', 'vol'], ['radio_tune', 'tune']].forEach(function (p) { var q = F.anch.rects[p[0]]; if (!q) return;
      var k = el('button', 'hs rd-knob'); k.type = 'button'; k.dataset.k = p[1]; k.setAttribute('aria-label', p[1] === 'vol' ? 'Volume' : 'Tuning');
      pct(k, [(q[0] - r[0]) / W_, (q[1] - r[1]) / H_, (q[2] - r[0]) / W_, (q[3] - r[1]) / H_]); radio.appendChild(k); });
    radio.appendChild(el('div', 'rd-panel', '<div class="rd-panel-h">GARDEN-TONE RADIO</div><div class="rd-panel-row"><button type="button" data-r="power" class="rd-big">⏻</button>' +
      '<button type="button" data-r="down" aria-label="Tune down">◀</button><button type="button" data-r="up" aria-label="Tune up">▶</button>' +
      '<button type="button" data-r="vdown" aria-label="Volume down">−</button><button type="button" data-r="vup" aria-label="Volume up">+</button></div><div class="rd-panel-now" id="rd-now"></div>'));
    radio.querySelector('.rd-panel').hidden = true;
  }
  spot(F, 'ashtray', 'k-ash', 'button', 'k-ash');
  point(F, 'ember', 'smoke', '<i></i><i></i><i></i><b class="glow"></b>');
  point(F, 'steam', 'steam', '<i></i><i></i><i></i>');
  spot(F, 'bell', 'k-search');
  spot(F, 'register', 'k-register');
  spot(F, 'phone', 'k-phone', 'button', 'k-phone');
  spot(F, 'mail', 'k-mail');
  var sd = spot(F, 'seeds', 'k-seeds', 'a'); if (sd) sd.href = '/seed-catalog/';
  spot(F, 'shop', 'k-shop');
  spot(F, 'tv', 'k-tv');
  for (var jl = 0; jl < 7; jl++) { var lw = JARS[jl].split(' '), last = lw.pop();   // the strain on each jar's label
    mapped(F, 'jar_' + jl + '_label', el('div', 'jar-lab', '<small>' + lw.join(' ') + '</small><b>' + last + '</b>'), 210, 120); }
  for (var j = 0; j < 7; j++) { var jb = spot(F, 'jar_' + j, null, 'button', 'k-jar'); if (jb) { jb.dataset.jar = j; jb.setAttribute('aria-label', JARS[j] + ' jar'); jb.dataset.tip = JARS[j]; } }

  // ---------------------------------------------------------------- BEHIND THE COUNTER
  var B = makeView('behind');
  if (B) {
    B.wrap.hidden = true;
    spot(B, 'stash', 'k-stash', 'button', 'k-stash');
    var crop = B.anch.crops && B.anch.crops.drawer_open;   // the drawer pulled out: a cut of the same render, laid over the closed one
    if (crop) {
      var dimg = el('img', 'pos-drawer'); dimg.id = 'k-drawer-open'; dimg.alt = ''; dimg.draggable = false;
      dimg.src = '/scene/behind_open-' + (night ? 'night' : 'day') + '.jpg'; pct(dimg, crop); B.stage.insertBefore(dimg, B.ov);
    }
    spot(B, 'cashbox', 'k-cash');
    spot(B, 'pos', 'k-pos');
    var ps = mapped(B, 'pos_screen', el('div', 'pos-q', '<div class="gos" id="gos"></div>'), 1024, 640); if (ps) ps.id = 'k-posq';
    point(B, 'steam', 'steam', '<i></i><i></i><i></i>');
    if (crop) { var ob = el('button', 'hs k-cash-open'); ob.type = 'button'; ob.id = 'k-cash-open'; ob.hidden = true; ob.setAttribute('aria-label', 'The open cash drawer');
      ob.dataset.tip = 'The cash drawer'; pct(ob, [crop[0], (crop[1] + crop[3]) / 2, crop[2], crop[3]]); B.ov.appendChild(ob); }
    var dr = spot(B, 'drawer', 'k-drawer'); if (dr) { var dn = el('i', 'hs-count'); dn.id = 'k-drawer-n'; dr.appendChild(dn); }
    spot(B, 'bowl', 'k-bowl');
  }
  var walk = el('button', 'sc-walk-btn', '↳ Behind the counter'); walk.type = 'button';
  walk.onclick = function () {
    var behind = B && B.wrap.hidden;
    if (!B) return;
    document.body.classList.toggle('behind', behind);
    F.wrap.hidden = behind; B.wrap.hidden = !behind; reset(F); reset(B);
    walk.textContent = behind ? '↰ Back out front' : '↳ Behind the counter';
    if (window.kioskSfx) window.kioskSfx.drawer(); layout();
  };
  document.body.appendChild(walk);
  var home = el('button', 'sc-home', ''); home.type = 'button'; home.setAttribute('aria-label', 'Back to the whole stand');
  home.innerHTML = (document.getElementById('tpl-seal') || {}).innerHTML || '⌂'; home.hidden = true;
  home.onclick = function () {   // zoomed in: step back; already at arm's length behind the counter: walk back out front
    var any = Object.keys(views).some(function (k) { return views[k].s > 1; });
    if (!any && document.body.classList.contains('behind')) walk.onclick(); else Object.keys(views).forEach(function (k) { reset(views[k]); }); };
  document.body.appendChild(home);
  var tour = el('button', 'sc-tour', '💡 Show me around'); tour.type = 'button';
  tour.onclick = function () { document.body.classList.toggle('touring'); tour.textContent = document.body.classList.contains('touring') ? '✕ Hide the labels' : '💡 Show me around'; };
  document.body.appendChild(tour);
  var hint = el('div', 'sc-hint', phone ? 'Tap anywhere to take a closer look · tap the stand to step back' : 'Click a prop or paper · click the stand to zoom in and out');
  root.appendChild(hint);
  document.body.classList.add(night ? 't-night' : 't-day', phone ? 'sc-phone' : 'sc-desk');

  // ---------------------------------------------------------------- zoom & pan
  function apply(v, anim) {
    v.stage.style.transition = anim ? 'transform .45s cubic-bezier(.2,.8,.2,1)' : 'none';
    v.stage.style.transform = v.s === 1 ? '' : 'translate(' + v.tx + 'px,' + v.ty + 'px) scale(' + v.s + ')';
    var any = Object.keys(views).some(function (k) { return views[k].s > 1; });
    home.hidden = !any && !document.body.classList.contains('behind'); document.body.classList.toggle('zoomed', any);
  }
  function clamp(v) { var W = v.stage.clientWidth, H = v.stage.clientHeight; v.tx = Math.min(0, Math.max(W - W * v.s, v.tx)); v.ty = Math.min(0, Math.max(H - H * v.s, v.ty)); }
  function zoomTo(v, x, y) { var W = v.stage.clientWidth, H = v.stage.clientHeight; v.s = phone ? 3 : 2.2; v.tx = W / 2 - x * v.s; v.ty = H / 2 - y * v.s; clamp(v); apply(v, true); }
  function reset(v) { if (!v) return; v.s = 1; v.tx = v.ty = 0; apply(v, true); }
  window.sceneReset = function () { Object.keys(views).forEach(function (k) { reset(views[k]); }); };
  var INTERACTIVE = '.hs, .slot, .zine-q, .ns-extra, .k-punch, .fl-tab, .rd-panel, .tv-q, .pos-q';
  window.sceneZoomQuad = function (view, quad, fill) {   // fill the frame with one mapped surface (the computer screen)
    var v = views[view], q = v && v.anch.quads[quad]; if (!q) return false;
    var W = v.stage.clientWidth, H = v.stage.clientHeight, fw = v.frame.clientWidth || W, fh = v.frame.clientHeight || H;
    var xs = q.map(function (c) { return c[0] * W; }), ys = q.map(function (c) { return c[1] * H; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    v.s = Math.min(fw * (fill || 0.94) / (x1 - x0), fh * (fill || 0.94) / (y1 - y0));
    v.tx = fw / 2 - (x0 + x1) / 2 * v.s; v.ty = fh / 2 - (y0 + y1) / 2 * v.s; apply(v, true); return true;
  };
  window.sceneFocus = function (view, rect) {   // zoom a view to one of its props (the register terminal uses it)
    var v = views[view], r = v && v.anch.rects[rect]; if (!r || !v.stage.clientWidth) return;
    zoomTo(v, (r[0] + r[2]) / 2 * v.stage.clientWidth, (r[1] + r[3]) / 2 * v.stage.clientHeight);
  };
  function zoomable(v) {
    var down = null, moved = false;
    v.frame.addEventListener('pointerdown', function (e) {
      if (document.body.classList.contains('in-pc') || (e.target.closest && e.target.closest('.pos-q, .rd-panel'))) { down = null; return; }   // the computer and the radio panel keep their drags
      down = { x: e.clientX, y: e.clientY, tx: v.tx, ty: v.ty }; moved = false; });
    v.frame.addEventListener('pointermove', function (e) {
      if (!down || v.s === 1) return;
      var dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 8) return;
      moved = true; v.tx = down.tx + dx; v.ty = down.ty + dy; clamp(v); apply(v, false);
    });
    addEventListener('pointerup', function () { down = null; });
    v.frame.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; return; }
      var hit = e.target.closest && e.target.closest(INTERACTIVE);
      var rect = v.stage.getBoundingClientRect(), x = (e.clientX - rect.left) / v.s, y = (e.clientY - rect.top) / v.s;
      if (document.body.classList.contains('in-pc')) {   // at the computer: anything off the screen steps back from it
        if (!(e.target.closest && e.target.closest('.pos-q'))) { e.preventDefault(); e.stopPropagation(); if (window.gardenOS) window.gardenOS.leave(); }
        return;
      }
      if (v.s === 1 && !hit) { e.preventDefault(); e.stopPropagation(); zoomTo(v, x, y); return; }   // an empty spot: take a closer look (props just work)
      if (v.s > 1 && !hit) { e.preventDefault(); e.stopPropagation(); reset(v); }                   // the stand itself: step back
    }, true);
    v.frame.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && Math.abs(e.deltaY) < 20) return;
      var rect = v.stage.getBoundingClientRect(), x = (e.clientX - rect.left) / v.s, y = (e.clientY - rect.top) / v.s;
      if (e.deltaY < 0 && v.s === 1) { e.preventDefault(); zoomTo(v, x, y); } else if (e.deltaY > 0 && v.s > 1) { e.preventDefault(); reset(v); }
    }, { passive: false });
  }

  // ---------------------------------------------------------------- live bits
  fetch('/double-wide/latest.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (l) {
    var c = document.getElementById('cb-head'); if (c && l.title) c.textContent = l.title; }).catch(function () {});
  fetch('/zines/latest.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (zz) {
    (zz.zines || []).slice(0, 5).forEach(function (x, i) { var q = document.getElementById('zine-q-' + i); if (!q) return; q.hidden = false; q.href = '/zines/' + x.url; q.title = x.title;
      q.innerHTML = '<img src="/zines/' + x.cover + '" alt=""><b>' + (x.agent || '') + '</b>'; });
  }).catch(function () {});
  layout();
  addEventListener('resize', function () { Object.keys(views).forEach(function (k) { views[k].s = 1; views[k].tx = views[k].ty = 0; apply(views[k], false); }); layout(); });
  addEventListener('load', layout);
  window.sceneLayout = layout;
})();
