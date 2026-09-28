/* The Corner Chronicle, the 3D kiosk: lays the live layer onto the Blender renders. window.SCENE (inlined by build_newsstand.py) holds, for
   each camera view, the render size and where every rack slot, sign and prop landed in the image (normalized). Covers, the sign, the
   chalkboard, the punch card, the radio dial, the register screen and tape, the zines and the EXTRA poster are real HTML mapped onto
   those spots with a perspective transform (matrix3d); every prop gets an invisible button over it. Desktop uses the wide "desk" view;
   phones walk around the kiosk: front, left door, right door (the side views carry only their racks, the zine line and the poster).
   Runs before kiosk.js and radio.js, which then find the same ids. */
(function () {
  'use strict';
  var SC = window.SCENE, PAPERS = window.SCENE_PAPERS || {};
  if (!SC) return;
  var phone = matchMedia('(max-width: 899px)').matches;
  var hr = new Date().getHours(), night = hr < 6 || hr >= 19;
  var VIEWS = phone ? [['phone_front', ''], ['phone_counter', 'Step up to the counter'], ['phone_left', 'Around the left side · Monthlies & the zine line'],
                       ['phone_right', 'Around the right side · Books']] : [['desk', '']];
  var AT_COUNTER = /^(radio|radio_vol|radio_tune|radio_dial|ashtray|ember|bell|register|register_screen|ticker|jar_\d|seeds)$/;   // on phones these live in the close-up
  var LABELS = { radio: 'Radio — tap to switch on/off', radio_vol: 'Volume (left half: down · right half: up)', radio_tune: 'Tuning (left half: back · right half: forward)',
                 ashtray: 'Ashtray', bell: 'Ring the bell — search every paper', register: 'The register', phone: 'Tip line', mail: 'Letters to the Editor',
                 drawer: 'Your Scrapbook', stash: 'Your stash box', seeds: 'Fresh seeds — The Seed Catalog' };
  var JARS = ['First Light Haze', 'Big Fix OG', 'Crash Cart Kush', 'Front Page Purple', 'Belly Laugh Blue', 'Payday Punch', "Keeper's Reserve"];

  // ---- the math: a w×h box onto four corners (TL, TR, BR, BL) with a CSS matrix3d
  function adj(m) { return [m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4], m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6],
                             m[2] * m[3] - m[0] * m[5], m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3]]; }
  function mm(a, b) { var c = []; for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) { var s = 0; for (var k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j]; c[3 * i + j] = s; } return c; }
  function mv(m, v) { return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]]; }
  function basis(p) { var m = [p[0][0], p[1][0], p[2][0], p[0][1], p[1][1], p[2][1], 1, 1, 1], v = mv(adj(m), [p[3][0], p[3][1], 1]); return mm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]); }
  function matrix3d(w, h, q) {   // q = [[x,y] TL, TR, BR, BL] in pixels
    var t = mm(basis([q[0], q[1], q[3], q[2]]), adj(basis([[0, 0], [w, 0], [0, h], [w, h]])));
    for (var i = 0; i < 9; i++) t[i] = t[i] / t[8];
    return 'matrix3d(' + [t[0], t[3], 0, t[6], t[1], t[4], 0, t[7], 0, 0, 1, 0, t[2], t[5], 0, t[8]].join(',') + ')';
  }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  var root = document.getElementById('k-scenes'), placed = [];
  function mapped(sc, name, node, w, h) {   // put node (w×h px) onto quad `name` of this view
    var q = sc.v.quads[name]; if (!q) return null;
    node.style.width = w + 'px'; node.style.height = h + 'px'; node.classList.add('q');
    sc.ov.appendChild(node); placed.push({ sc: sc, node: node, q: q, w: w, h: h }); return node;
  }
  function pct(node, r) { node.style.left = (r[0] * 100) + '%'; node.style.top = (r[1] * 100) + '%'; node.style.width = ((r[2] - r[0]) * 100) + '%'; node.style.height = ((r[3] - r[1]) * 100) + '%'; }
  function spot(sc, name, id, tag, cls) {   // an invisible button over a prop
    var r = sc.v.rects[name]; if (!r) return null;
    var b = el(tag || 'button', 'hs ' + (cls || ''));
    if (id) b.id = id;
    if (b.tagName === 'BUTTON') b.type = 'button';
    pct(b, r); b.setAttribute('aria-label', LABELS[name] || name); b.dataset.tip = LABELS[name] || '';
    sc.ov.appendChild(b); return b;
  }
  function layout() {
    placed.forEach(function (p) {
      var W = p.sc.box.clientWidth, H = p.sc.box.clientHeight;
      p.node.style.transform = matrix3d(p.w, p.h, p.q.map(function (c) { return [c[0] * W, c[1] * H]; }));
    });
  }

  // ---- build each view: the render, then the covers in its racks
  var scenes = [];
  VIEWS.forEach(function (vw, idx) {
    var v = SC[vw[0]]; if (!v) return;
    if (vw[1]) root.appendChild(el('div', 'sc-walk', '<span>↓</span> ' + vw[1]));
    var box = el('div', 'sc sc-' + vw[0]); box.style.aspectRatio = v.size[0] + ' / ' + v.size[1];
    box.innerHTML = '<img class="sc-img" alt="" src="/scene/' + vw[0] + '-' + (night ? 'night' : 'day') + '.jpg"' + (idx ? ' loading="lazy"' : ' fetchpriority="high"') + '>';
    var ov = el('div', 'sc-ov'); box.appendChild(ov); root.appendChild(box);
    var sc = { box: box, ov: ov, v: v }; scenes.push(sc);
    ['front', 'left', 'right'].forEach(function (side) {
      (PAPERS[side] || []).forEach(function (id, i) {
        var t = document.getElementById('tpl-mag-' + id); if (!t || !v.quads[side + '_' + i]) return;
        var n = el('div', 'slot'); n.innerHTML = t.innerHTML; mapped(sc, side + '_' + i, n, 200, 266);
      });
    });
    for (var z = 0; z < 5; z++) { if (!v.quads['zine_' + z] || document.getElementById('zine-q-' + z)) continue;
      var zn = el('a', 'zine-q'); zn.id = 'zine-q-' + z; zn.hidden = true; mapped(sc, 'zine_' + z, zn, 120, 180); }
    var ex = document.getElementById('ns-extra-tpl');
    if (ex && v.quads.extra_poster && !document.getElementById('ns-extra')) {
      var e2 = el('a', 'ns-extra'); e2.innerHTML = ex.innerHTML; e2.id = 'ns-extra'; e2.href = ex.dataset.href; e2.hidden = true; mapped(sc, 'extra_poster', e2, 560, 170); }
  });

  // ---- the props: on the desk view, or on phones the front view and the counter close-up
  var byName = {}; scenes.forEach(function (sc, i) { byName[VIEWS[i][0]] = sc; });
  function home(name) { return (phone && AT_COUNTER.test(name) && byName.phone_counter) || scenes[0]; }
  var F = scenes[0];
  if (F) {
    var fx = el('div', 'k-fx'); fx.id = 'k-fx'; F.box.appendChild(fx);
    mapped(home('sign'), 'sign', el('div', 'sg', '★ The Corner Chronicle ★'), 960, 80);
    mapped(home('marquee'), 'marquee', el('div', 'mq', '<span id="ns-hi">Good morning, CAK3D</span> · <span id="ns-date"></span>'), 600, 40);
    mapped(home('chalkboard'), 'chalkboard', el('div', 'cb', '<b>TODAY</b><p id="cb-head">Fresh papers on the rack</p><i id="ns-wx"></i><s>📻 WDWN 90.1 · WTLK 97.3 · WLOL 104.5</s>'), 290, 420);
    var pc = mapped(home('punch'), 'punch', el('div', 'k-punch', '<div class="k-punch-h">REGULAR\'S CARD</div><div class="k-punch-holes" id="k-punch-holes"></div><div class="k-punch-f" id="k-punch-f"></div>'), 150, 120);
    if (pc) { pc.id = 'k-punch'; pc.setAttribute('role', 'button'); pc.tabIndex = 0; }
    var rd = mapped(home('register_screen'), 'register_screen', el('div', 'rg-disp', 'OPEN'), 130, 45); if (rd) rd.id = 'rg-disp';
    mapped(home('ticker'), 'ticker', el('div', 'rg-tape', '<div class="rg-tape-in" id="rg-tape">THE GARDEN TOKEN AVERAGE · loading…</div>'), 900, 50);
    mapped(home('radio_dial'), 'radio_dial', el('div', 'rd-dial', '<div class="rd-scale"><span>88</span><span>92</span><span>96</span><span>100</span><span>104</span><span>108</span></div>' +
      '<div class="rd-needle-h"></div><div class="rd-station">OFF</div>'), 280, 110);
    var radio = spot(home('radio'), 'radio', 'k-radio', 'div', 'k-radio');
    if (radio) {
      var RS = home('radio'), r = RS.v.rects.radio, W_ = r[2] - r[0], H_ = r[3] - r[1];
      [['radio_vol', 'vol'], ['radio_tune', 'tune']].forEach(function (p) { var q = RS.v.rects[p[0]]; if (!q) return;
        var k = el('button', 'hs rd-knob'); k.type = 'button'; k.dataset.k = p[1]; k.setAttribute('aria-label', LABELS[p[0]]); k.dataset.tip = LABELS[p[0]];
        pct(k, [(q[0] - r[0]) / W_, (q[1] - r[1]) / H_, (q[2] - r[0]) / W_, (q[3] - r[1]) / H_]); radio.appendChild(k); });
      var pw = el('button', 'rd-pow', '⏻'); pw.type = 'button'; pw.dataset.r = 'power'; pw.setAttribute('aria-label', 'Radio on or off'); radio.appendChild(pw);
      var panel = el('div', 'rd-panel', '<div class="rd-panel-h">GARDEN-TONE RADIO</div><div class="rd-panel-row"><button type="button" data-r="power" class="rd-big">⏻</button>' +
        '<button type="button" data-r="down" aria-label="Tune down">◀</button><button type="button" data-r="up" aria-label="Tune up">▶</button>' +
        '<button type="button" data-r="vdown" aria-label="Volume down">−</button><button type="button" data-r="vup" aria-label="Volume up">+</button></div><div class="rd-panel-now" id="rd-now"></div>');
      panel.hidden = true; radio.appendChild(panel);
    }
    spot(home('ashtray'), 'ashtray', 'k-ash', 'button', 'k-ash');
    var ES = home('ember'); if (ES.v.points.ember) { var sm = el('div', 'smoke', '<i></i><i></i><i></i><b class="glow"></b>'); sm.style.left = (ES.v.points.ember[0] * 100) + '%'; sm.style.top = (ES.v.points.ember[1] * 100) + '%'; ES.ov.appendChild(sm); }
    spot(home('bell'), 'bell', 'k-search');
    spot(home('register'), 'register', 'k-register', 'div');
    spot(home('phone'), 'phone', 'k-phone', 'button', 'k-phone');
    spot(home('mail'), 'mail', 'k-mail');
    var dr = spot(home('drawer'), 'drawer', 'k-drawer'); if (dr) { var dn = el('i', 'hs-count'); dn.id = 'k-drawer-n'; dr.appendChild(dn); }
    spot(home('stash'), 'stash', 'k-stash', 'button', 'k-stash');
    var sd = spot(home('seeds'), 'seeds', 'k-seeds', 'a'); if (sd) sd.href = '/seed-catalog/';
    for (var j = 0; j < 7; j++) { var jb = spot(home('jar_'), 'jar_' + j, null, 'button', 'k-jar'); if (jb) { jb.dataset.jar = j; jb.setAttribute('aria-label', JARS[j] + ' jar'); jb.dataset.tip = JARS[j]; } }
  }
  document.body.classList.add(night ? 't-night' : 't-day', phone ? 'sc-phone' : 'sc-desk');

  // chalkboard: today's headline; zines on the line
  fetch('/double-wide/latest.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (l) {
    var c = document.getElementById('cb-head'); if (c && l.title) c.textContent = l.title; }).catch(function () {});
  fetch('/zines/latest.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (z) {
    (z.zines || []).slice(0, 5).forEach(function (x, i) { var q = document.getElementById('zine-q-' + i); if (!q) return; q.hidden = false; q.href = '/zines/' + x.url; q.title = x.title;
      q.innerHTML = '<img src="/zines/' + x.cover + '" alt=""><b>' + (x.agent || '') + '</b>'; });
  }).catch(function () {});
  // "show me around": light up and label every spot
  var tour = el('button', 'sc-tour', '💡 Show me around'); tour.type = 'button';
  tour.onclick = function () { document.body.classList.toggle('touring'); tour.textContent = document.body.classList.contains('touring') ? '✕ Hide the labels' : '💡 Show me around'; };
  root.insertBefore(tour, root.firstChild);
  layout();
  addEventListener('resize', function () { if (matchMedia('(max-width: 899px)').matches !== phone) location.reload(); else layout(); });
  addEventListener('load', layout);
  window.sceneLayout = layout;
})();
