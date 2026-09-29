/* The counter radio. The dial (window.RADIO_STATIONS, from radio_stations.json) runs 88–108: the Garden's own three stations (WDWN news,
   WTLK talk, WLOL comedy — recorded fresh each morning by build_radio.py), five internet music stations relayed through the kiosk's server
   (old blues, classic rock, '90s–2000s rap, drum & bass, electronic) and five kinds of static between them. Everything is mixed through
   Web Audio so the volume works on phones. Garden shows play "live": tune in and you land where the show is right now.
   Tap the radio for its controls card (on/off, tune ◀ ▶, volume − +); the dial on the radio shows the station. */
(function () {
  'use strict';
  var R = document.getElementById('k-radio'); if (!R) return;
  var DIAL = (window.RADIO_STATIONS || []).filter(function (s) { return !s.hidden; });
  if (!DIAL.length) return;
  var store = { get: function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
                set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  var st = store.get('ns-radio2', { pos: 1, vol: 0.7 }), on = false, SHOWS = {}, ctx = null, master = null, statNode = null, statGain = null, audios = {};
  if (st.pos >= DIAL.length) st.pos = 1;
  var needle = document.querySelector('.rd-needle-h'), label = document.querySelector('.rd-dial .rd-station'), now = document.getElementById('rd-now');
  fetch('/radio/today.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (t) {
    (t.stations || []).forEach(function (s) { SHOWS[s.id] = s; }); paint(); }).catch(function () {});

  function station() { return DIAL[st.pos]; }
  function playable(d) { return d.kind === 'stream' || (d.kind === 'garden' && SHOWS[d.id]) || (d.kind === 'playlist' && d.items && d.items.length); }
  function onAir(d) {   // a playlist station has been on the air since midnight: which show, and how far in
    var total = d.items.reduce(function (a, c) { return a + c.secs; }, 0), t = new Date(), s = (t.getHours() * 3600 + t.getMinutes() * 60 + t.getSeconds()) % total, i = 0;
    while (s > d.items[i].secs) { s -= d.items[i].secs; i = (i + 1) % d.items.length; } return { i: i, t: s };
  }
  function paint() {
    var d = station();
    if (needle) needle.style.left = (6 + (d.freq - 88) / 20 * 88) + '%';
    if (label) label.textContent = !on ? 'OFF' : d.kind === 'static' ? d.freq.toFixed(1) + ' ~~~' : d.call + ' ' + d.freq.toFixed(1);
    var show = d.kind === 'garden' && SHOWS[d.id];
    if (now) now.textContent = !on ? 'Off — tap ⏻' : d.kind === 'static' ? '~ static ~ keep tuning ◀ ▶' :
      '📻 ' + d.call + ' ' + d.freq.toFixed(1) + ' · ' + (show ? show.show : d.name) + (d.kind === 'playlist' && audios[d.id] ? ' · ' + d.items[audios[d.id].cur].title : '') + (d.credit ? ' · via ' + d.credit : '');
    R.classList.toggle('on', on); document.body.classList.toggle('radio-on', on);
  }
  function context() {
    if (ctx) return ctx;
    ctx = (window.kioskAudio && window.kioskAudio()) || new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = st.vol; master.connect(ctx.destination);
    return ctx;
  }
  function noise(seconds, color) {
    var n = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate), d = n.getChannelData(0), b0 = 0, b1 = 0, b2 = 0;
    for (var i = 0; i < d.length; i++) { var w = Math.random() * 2 - 1;
      if (color === 'pink') { b0 = 0.997 * b0 + w * 0.029591; b1 = 0.985 * b1 + w * 0.032534; b2 = 0.95 * b2 + w * 0.048056; d[i] = (b0 + b1 + b2 + w * 0.05) * 1.6; }
      else d[i] = w * 0.5; }
    var s = ctx.createBufferSource(); s.buffer = n; s.loop = true; return s;
  }
  function makeStatic(kind) {   // five different statics
    var out = ctx.createGain(), nodes = [], src, f, o, g, lfo, lg;
    if (kind === 'hiss') { src = noise(3, 'white'); f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900; g = ctx.createGain(); g.gain.value = 0.35; src.connect(f); f.connect(g); g.connect(out); nodes.push(src); }
    if (kind === 'crackle') { src = noise(3, 'pink'); g = ctx.createGain(); g.gain.value = 0.25; src.connect(g); g.connect(out); nodes.push(src);
      var pops = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), pd = pops.getChannelData(0);
      for (var i = 0; i < pd.length; i++) pd[i] = Math.random() < 0.0009 ? (Math.random() * 2 - 1) * 0.9 : 0;
      var ps = ctx.createBufferSource(); ps.buffer = pops; ps.loop = true; ps.connect(out); nodes.push(ps); }
    if (kind === 'whistle') { src = noise(3, 'pink'); g = ctx.createGain(); g.gain.value = 0.2; src.connect(g); g.connect(out); nodes.push(src);
      o = ctx.createOscillator(); o.frequency.value = 1400; lfo = ctx.createOscillator(); lfo.frequency.value = 0.25; lg = ctx.createGain(); lg.gain.value = 500;
      lfo.connect(lg); lg.connect(o.frequency); var og = ctx.createGain(); og.gain.value = 0.05; o.connect(og); og.connect(out); nodes.push(o, lfo); }
    if (kind === 'ghost') { src = noise(3, 'pink'); f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 1.5; g = ctx.createGain(); g.gain.value = 0.5;
      lfo = ctx.createOscillator(); lfo.frequency.value = 3.3; lg = ctx.createGain(); lg.gain.value = 0.35; lfo.connect(lg); lg.connect(g.gain);
      src.connect(f); f.connect(g); g.connect(out); var hum = ctx.createOscillator(); hum.frequency.value = 60; var hg = ctx.createGain(); hg.gain.value = 0.04; hum.connect(hg); hg.connect(out); nodes.push(src, lfo, hum); }
    if (kind === 'morse') { src = noise(3, 'white'); f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2600; g = ctx.createGain(); g.gain.value = 0.18; src.connect(f); f.connect(g); g.connect(out); nodes.push(src);
      o = ctx.createOscillator(); o.frequency.value = 760; var mg = ctx.createGain(); mg.gain.value = 0; o.connect(mg); mg.connect(out); nodes.push(o);
      var t = ctx.currentTime + 0.3, code = '.-- -.. .-- -.   --. .- .-. -.. . -.   ';
      for (var r = 0; r < 12; r++) for (var c = 0; c < code.length; c++) { var ch = code[c], len = ch === '.' ? 0.08 : ch === '-' ? 0.24 : 0;
        if (len) { mg.gain.setValueAtTime(0.09, t); mg.gain.setValueAtTime(0, t + len); } t += (len || 0.16) + 0.08; } }
    nodes.forEach(function (n) { n.start(); }); out.stopAll = function () { nodes.forEach(function (n) { try { n.stop(); } catch (e) {} }); };
    return out;
  }
  function stopStatic() { if (statNode) { var s = statNode, g = statGain; g.gain.setTargetAtTime(0, ctx.currentTime, 0.08); setTimeout(function () { s.stopAll(); g.disconnect(); }, 400); statNode = statGain = null; } }
  function audioFor(d) {
    if (audios[d.id]) return audios[d.id];
    var at = d.kind === 'playlist' ? onAir(d) : null;
    var src = d.kind === 'stream' ? '/api/stream/' + d.id : d.kind === 'playlist' ? d.items[at.i].url : '/radio/' + SHOWS[d.id].file;
    var a = new Audio(src); a.preload = 'none'; a.loop = d.kind === 'garden'; a.crossOrigin = 'anonymous';
    var n = ctx.createMediaElementSource(a), g = ctx.createGain(); g.gain.value = 0; n.connect(g); g.connect(master);
    audios[d.id] = { el: a, gain: g, tuned: false, kind: d.kind, cur: at ? at.i : 0, off: at ? at.t : 0 };
    if (d.kind === 'playlist') a.addEventListener('ended', function () { var x = audios[d.id]; if (!x) return; x.cur = (x.cur + 1) % d.items.length; a.src = d.items[x.cur].url; a.play().catch(function () {}); paint(); });
    return audios[d.id];
  }
  function hush(except) {
    Object.keys(audios).forEach(function (k) { if (k === except) return; var x = audios[k]; x.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      setTimeout(function () { x.el.pause(); if (x.kind === 'stream' || x.kind === 'playlist') { x.el.removeAttribute('src'); x.el.load(); delete audios[k]; } }, 350); });
  }
  function tune() {
    if (!on) return paint();
    context(); var d = station();
    hush(d.id); stopStatic();
    if (playable(d)) {
      var a = audioFor(d);
      if (d.kind === 'playlist' && !a.tuned) {   // join the show already in progress
        var jump = function () { try { a.el.currentTime = a.off; } catch (e) {} };
        if (a.el.readyState >= 1) jump(); else a.el.addEventListener('loadedmetadata', jump, { once: true }); a.tuned = true;
      }
      if (d.kind === 'garden' && !a.tuned) {
        var live = function () { var dur = a.el.duration || SHOWS[d.id].dur || 600, t = new Date(); a.el.currentTime = ((t.getHours() * 3600 + t.getMinutes() * 60 + t.getSeconds()) % dur); };
        if (a.el.readyState >= 1) live(); else a.el.addEventListener('loadedmetadata', live, { once: true }); a.tuned = true;
      }
      a.el.play().catch(function () {}); a.gain.gain.setTargetAtTime(1, ctx.currentTime + (d.kind === 'garden' ? 0 : 0.4), 0.2);
      statGain = ctx.createGain(); statGain.gain.value = 0.28; statNode = makeStatic('hiss'); statNode.connect(statGain); statGain.connect(master);
      statGain.gain.setTargetAtTime(0, ctx.currentTime + (d.kind === 'stream' ? 1.2 : 0.3), 0.3);   // hiss while it locks on
    } else {
      statGain = ctx.createGain(); statGain.gain.value = 0; statNode = makeStatic(d.noise || 'hiss'); statNode.connect(statGain); statGain.connect(master);
      statGain.gain.setTargetAtTime(1, ctx.currentTime, 0.1);
    }
    paint();
  }
  function power() {
    on = !on; context();
    if (on) { ctx.resume(); tune(); } else { stopStatic(); hush(null); Object.keys(audios).forEach(function (k) { audios[k].tuned = false; }); paint(); }
    if (window.kioskSfx) window.kioskSfx.click();
  }
  function step(dir) { st.pos = (st.pos + dir + DIAL.length) % DIAL.length; store.set('ns-radio2', st); if (window.kioskSfx) window.kioskSfx.click(); tune(); }
  function vol(dir) { st.vol = Math.max(0, Math.min(1, Math.round((st.vol + dir * 0.1) * 10) / 10)); store.set('ns-radio2', st); if (master) master.gain.setTargetAtTime(st.vol, ctx.currentTime, 0.05); paint();
    if (window.kioskToast) window.kioskToast('🔊 Volume ' + Math.round(st.vol * 10)); }
  window.gardenRadio = { off: function () { if (on) power(); } };
  R.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-r]'), k = e.target.closest && e.target.closest('.rd-knob');
    if (b) { e.stopPropagation(); ({ power: power, up: function () { step(1); }, down: function () { step(-1); }, vup: function () { vol(1); }, vdown: function () { vol(-1); } })[b.dataset.r](); return; }
    if (k) { e.stopPropagation(); var box = k.getBoundingClientRect(), right = e.clientX > box.left + box.width / 2;
      if (k.dataset.k === 'tune') { if (!on) power(); else step(right ? 1 : -1); } else vol(right ? 1 : -1); return; }
    if (e.target.closest && e.target.closest('.rd-panel')) return;
    var pn = R.querySelector('.rd-panel'); if (pn) { pn.hidden = !pn.hidden; if (!pn.hidden && !on) power(); }
  });
  paint();
})();
