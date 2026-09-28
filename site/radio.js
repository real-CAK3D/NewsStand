/* The counter radio. Eight spots on the dial: three stations (WDWN News, WTLK Talk, WLOL Comedy — shows recorded fresh each morning by
   build_radio.py from the day's papers) and five kinds of static between them, all mixed through Web Audio so the volume knob works on
   phones too. It plays "live": tune in and you land where the show is right now. */
(function () {
  'use strict';
  var R = document.getElementById('k-radio'); if (!R) return;
  var DIAL = [
    { f: 88.7, s: 'hiss' }, { f: 90.1, id: 'news', call: 'WDWN', kind: 'NEWS' }, { f: 92.9, s: 'crackle' }, { f: 95.3, s: 'whistle' },
    { f: 97.3, id: 'talk', call: 'WTLK', kind: 'TALK' }, { f: 100.7, s: 'ghost' }, { f: 104.5, id: 'comedy', call: 'WLOL', kind: 'COMEDY' }, { f: 107.1, s: 'morse' }];
  var store = { get: function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
                set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  var st = store.get('ns-radio', { pos: 1, vol: 0.7 }), on = false, SHOWS = {}, ctx = null, master = null, statNode = null, statGain = null, audios = {}, cur = null;
  var needle = R.querySelector('.rd-needle'), label = R.querySelector('.rd-station'), now = document.getElementById('rd-now');
  fetch('/radio/today.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (t) {
    (t.stations || []).forEach(function (s) { SHOWS[s.id] = s; }); paint(); }).catch(function () {});

  function paint() {
    var d = DIAL[st.pos], x = 140 + (d.f - 88) / 20 * 74;   // dial window: 88 MHz at x=140 … 108 at x=214
    needle.setAttribute('transform', 'translate(' + (x - 140).toFixed(1) + ' 0)');
    R.querySelector('.rd-tune').style.transform = 'rotate(' + (st.pos * 45 - 150) + 'deg)';
    R.querySelector('.rd-vol').style.transform = 'rotate(' + (st.vol * 270 - 135) + 'deg)';
    label.textContent = on ? (d.id ? d.call + ' ' + d.f.toFixed(1) : d.f.toFixed(1) + ' ~~~') : 'OFF';
    var show = d.id && SHOWS[d.id];
    now.textContent = !on ? 'Tap ⏻ for the radio' : d.id ? (show ? '📻 ' + d.call + ' ' + d.kind + ' · ' + show.show : d.call + ' ' + d.kind + ' · on the air soon') : '~ static ~ keep tuning ◀ ▶';
    R.classList.toggle('on', on);
  }
  function context() {
    if (ctx) return ctx;
    ctx = (window.kioskAudio && window.kioskAudio()) || new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = st.vol; master.connect(ctx.destination);
    return ctx;
  }
  // ---- five different statics
  function noise(seconds, color) {
    var n = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate), d = n.getChannelData(0), b0 = 0, b1 = 0, b2 = 0;
    for (var i = 0; i < d.length; i++) { var w = Math.random() * 2 - 1;
      if (color === 'pink') { b0 = 0.997 * b0 + w * 0.029591; b1 = 0.985 * b1 + w * 0.032534; b2 = 0.95 * b2 + w * 0.048056; d[i] = (b0 + b1 + b2 + w * 0.05) * 1.6; }
      else d[i] = w * 0.5; }
    var s = ctx.createBufferSource(); s.buffer = n; s.loop = true; return s;
  }
  function makeStatic(kind) {
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
      var t = ctx.currentTime + 0.3, code = '.-- -.. .-- -.   --. .- .-. -.. . -.   ';   // "WDWN GARDEN"
      for (var r = 0; r < 12; r++) for (var c = 0; c < code.length; c++) { var ch = code[c], len = ch === '.' ? 0.08 : ch === '-' ? 0.24 : 0;
        if (len) { mg.gain.setValueAtTime(0.09, t); mg.gain.setValueAtTime(0, t + len); } t += (len || 0.16) + 0.08; } }
    nodes.forEach(function (n) { n.start(); }); out.stopAll = function () { nodes.forEach(function (n) { try { n.stop(); } catch (e) {} }); };
    return out;
  }
  function stopStatic() { if (statNode) { var s = statNode, g = statGain; g.gain.setTargetAtTime(0, ctx.currentTime, 0.08); setTimeout(function () { s.stopAll(); g.disconnect(); }, 400); statNode = statGain = null; } }
  function audioFor(id) {
    if (audios[id]) return audios[id];
    var show = SHOWS[id]; if (!show) return null;
    var a = new Audio('/radio/' + show.file); a.preload = 'auto'; a.loop = true; a.crossOrigin = 'anonymous';
    var srcN = ctx.createMediaElementSource(a), g = ctx.createGain(); g.gain.value = 0; srcN.connect(g); g.connect(master);
    audios[id] = { el: a, gain: g, tuned: false }; return audios[id];
  }
  function tune() {
    if (!on) return paint();
    context(); var d = DIAL[st.pos];
    Object.keys(audios).forEach(function (k) { if (k !== d.id) { var x = audios[k]; x.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.1); setTimeout(function () { x.el.pause(); }, 300); } });
    stopStatic();
    if (d.id && SHOWS[d.id]) {
      var a = audioFor(d.id); cur = a;
      var live = function () { var dur = a.el.duration || SHOWS[d.id].dur || 600, t = new Date(); a.el.currentTime = ((t.getHours() * 3600 + t.getMinutes() * 60 + t.getSeconds()) % dur); };
      if (!a.tuned) { if (a.el.readyState >= 1) live(); else a.el.addEventListener('loadedmetadata', live, { once: true }); a.tuned = true; }
      a.el.play().catch(function () {}); a.gain.gain.setTargetAtTime(1, ctx.currentTime, 0.15);
      statGain = ctx.createGain(); statGain.gain.value = 0.25; statNode = makeStatic('hiss'); statNode.connect(statGain); statGain.connect(master);
      statGain.gain.setTargetAtTime(0, ctx.currentTime + 0.3, 0.25);   // a little hiss as it locks on
    } else {
      statGain = ctx.createGain(); statGain.gain.value = 0; statNode = makeStatic(d.s || 'hiss'); statNode.connect(statGain); statGain.connect(master);
      statGain.gain.setTargetAtTime(1, ctx.currentTime, 0.1);
    }
    paint();
  }
  function power() {
    on = !on; context();
    if (on) { ctx.resume(); tune(); } else { stopStatic(); Object.keys(audios).forEach(function (k) { audios[k].el.pause(); audios[k].tuned = false; }); paint(); }
    if (window.kioskSfx) window.kioskSfx.click();
  }
  function step(dir) { st.pos = (st.pos + dir + DIAL.length) % DIAL.length; store.set('ns-radio', st); if (window.kioskSfx) window.kioskSfx.click(); tune(); }
  function vol(dir) { st.vol = Math.max(0, Math.min(1, Math.round((st.vol + dir * 0.1) * 10) / 10)); store.set('ns-radio', st); if (master) master.gain.setTargetAtTime(st.vol, ctx.currentTime, 0.05); paint();
    if (window.kioskToast) window.kioskToast('🔊 Volume ' + Math.round(st.vol * 10)); }
  R.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-r]'), k = e.target.closest && e.target.closest('.rd-knob');
    if (b) { ({ power: power, up: function () { step(1); }, down: function () { step(-1); }, vup: function () { vol(1); }, vdown: function () { vol(-1); } })[b.dataset.r](); return; }
    if (k) { var box = k.getBoundingClientRect(), right = e.clientX > box.left + box.width / 2;   // knobs: tap the right half to turn up, left half down
      if (k.dataset.k === 'tune') { if (!on) power(); else step(right ? 1 : -1); } else vol(right ? 1 : -1); }
  });
  paint();
})();
