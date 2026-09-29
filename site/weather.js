/* Weather and seasons on the kiosk, live: the latest observation at Auburn-Lewiston (KLEW, weather.gov) decides whether it's raining,
   snowing or foggy right now; the month decides the season. Rain falls in streaks and wets the street; snow falls and piles up on the
   sidewalk and the awning; autumn leaves drift down and settle on the ground (they stay put while you're here). All of it lives on the
   front render (#k-wx for weather, #k-fx for the season) so it zooms with the scene. */
(function () {
  'use strict';
  var wx = document.getElementById('k-wx'), fx = document.getElementById('k-fx'); if (!wx || !fx) return;
  var m = new Date().getMonth(), season = m === 11 || m < 2 ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'autumn';
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sign = (window.SCENE && window.SCENE.desk && window.SCENE.desk.quads.sign) || null;
  var awningY = sign ? Math.min(sign[0][1], sign[1][1]) * 100 : 14;
  function add(parent, cls, css) { var e = document.createElement('i'); e.className = cls; if (css) e.style.cssText = css; parent.appendChild(e); return e; }
  function ground() { return 80 + Math.random() * 18; }   // the sidewalk band of the render (% from the top)

  function rain(heavy) {
    document.body.classList.add('wx-rain');
    for (var i = 0; i < (heavy ? 90 : 55); i++) add(wx, 'drop', 'left:' + (Math.random() * 100) + '%;animation-duration:' + (0.45 + Math.random() * 0.35) + 's;animation-delay:' + (-Math.random() * 1) + 's');
    add(wx, 'wet');
    for (var k = 0; k < 14; k++) add(wx, 'splash', 'left:' + (Math.random() * 100) + '%;top:' + ground() + '%;animation-delay:' + (-Math.random() * 1.2) + 's');
  }
  function snow() {
    document.body.classList.add('wx-snow');
    var pile = add(wx, 'snowpile'), cap = add(wx, 'snowcap', 'top:' + (awningY - 1.2) + '%');
    for (var i = 0; i < 60; i++) add(wx, 'flake', 'left:' + (Math.random() * 100) + '%;font-size:' + (6 + Math.random() * 9) + 'px;animation-duration:' + (6 + Math.random() * 8) + 's;animation-delay:' + (-Math.random() * 12) + 's');
    var depth = 0; setInterval(function () { depth = Math.min(1, depth + 0.02); pile.style.opacity = 0.35 + depth * 0.6; pile.style.height = (5 + depth * 6) + '%'; cap.style.opacity = 0.4 + depth * 0.6; }, 3000);
  }
  function fog() { document.body.classList.add('wx-fog'); add(wx, 'fogbank'); add(wx, 'fogbank f2'); }
  function season_() {
    if (calm) return;
    if (season === 'autumn' || season === 'spring') {   // leaves / petals that land and stay
      var kinds = season === 'autumn' ? null : ['🌸', '🌼', '🌸'], landed = 0, nleaf = 0;
      // one leaf at a time, drawn: maple, oak and birch shapes in fall colours (with a midrib and veins), never a bunch
      var SHAPES = ['M0,-46 L8,-24 L22,-32 L18,-12 L40,-18 L30,0 L44,6 L22,14 L26,28 L6,20 L3,44 L-3,44 L-6,20 L-26,28 L-22,14 L-44,6 L-30,0 L-40,-18 L-18,-12 L-22,-32 L-8,-24 Z',
        'M0,-46 C10,-44 8,-34 16,-32 C26,-30 22,-18 30,-14 C40,-10 32,0 26,4 C36,10 30,22 20,20 C24,30 12,36 4,32 L2,46 L-2,46 L-4,32 C-12,36 -24,30 -20,20 C-30,22 -36,10 -26,4 C-32,0 -40,-10 -30,-14 C-22,-18 -26,-30 -16,-32 C-8,-34 -10,-44 0,-46 Z',
        'M0,-46 C20,-30 26,-4 16,18 C10,32 4,38 0,44 C-4,38 -10,32 -16,18 C-26,-4 -20,-30 0,-46 Z'];
      var VEINS = ['M0,50 L0,-38 M0,10 L30,-12 M0,10 L-30,-12 M0,24 L20,20 M0,24 L-20,20', 'M0,50 L0,-40 M0,-20 L20,-14 M0,-20 L-20,-14 M0,0 L24,4 M0,0 L-24,4 M0,18 L16,22 M0,18 L-16,22',
                   'M0,50 L0,-40 M0,-24 L12,-30 M0,-24 L-12,-30 M0,-6 L16,-12 M0,-6 L-16,-12 M0,12 L14,6 M0,12 L-14,6'];
      var FALL = ['#c0392b', '#d35400', '#e67e22', '#e5a50a', '#b5651d', '#8e3b1c', '#a93226', '#cf8a1b', '#7b3f00', '#9c5a1a'];
      function leafSVG() {
        var k = Math.floor(Math.random() * SHAPES.length), c = FALL[Math.floor(Math.random() * FALL.length)], c2 = FALL[Math.floor(Math.random() * FALL.length)], id = 'lg' + (nleaf++);
        return '<svg class="lf" viewBox="-50 -50 100 110" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs>' +
          '<path d="' + SHAPES[k] + '" fill="url(#' + id + ')" stroke="rgba(60,25,5,.55)" stroke-width="1.5"/><path d="' + VEINS[k] + '" stroke="rgba(70,30,5,.45)" stroke-width="2" fill="none"/>' +
          '<path d="M0,44 L0,58" stroke="#5a3a1a" stroke-width="3"/></svg>';
      }
      var drop = function () {
        // the front view is hidden while you're behind the counter (and the tab may be in the background): hold the leaves, or they all
        // queue up and come down at once when you walk back out front
        if (document.hidden || document.body.classList.contains('behind')) return;
        var leaf = document.createElement('i'); leaf.className = 'leaf';
        if (kinds) leaf.textContent = kinds[Math.floor(Math.random() * kinds.length)]; else { leaf.innerHTML = leafSVG(); leaf.style.width = (12 + Math.random() * 14) + 'px';
          leaf.style.setProperty('--tum', (1.2 + Math.random() * 1.6).toFixed(2) + 's'); }
        var x = Math.random() * 100, y = ground(); leaf.style.left = x + '%'; leaf.style.setProperty('--y', y + 'vh');
        leaf.style.setProperty('--land', y + '%'); leaf.style.fontSize = (10 + Math.random() * 10) + 'px'; leaf.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
        fx.appendChild(leaf);
        leaf.addEventListener('animationend', function () { leaf.classList.add('landed'); leaf.style.top = y + '%'; landed++;
          if (landed > 70) { var old = fx.querySelector('.leaf.landed'); if (old) old.remove(); landed--; } });
      };
      for (var i = 0; i < 18; i++) setTimeout(drop, i * 400);
      setInterval(drop, 2600);
    }
    if (season === 'summer' && document.body.classList.contains('t-night'))
      for (var f = 0; f < 12; f++) add(fx, 'fly', 'left:' + (Math.random() * 100) + '%;top:' + (60 + Math.random() * 30) + '%;animation-delay:' + (-Math.random() * 6) + 's');
  }
  function apply(text, tempF) {
    var t = (text || '').toLowerCase();
    if (/snow|flurr|sleet|ice pellets/.test(t)) snow(); else if (/rain|drizzle|shower|thunder/.test(t)) rain(/heavy|thunder/.test(t));
    if (/fog|mist|haze/.test(t)) fog();
    if (season === 'winter' && !/snow/.test(t) && tempF != null && tempF < 33) { var p = add(wx, 'snowpile'); p.style.opacity = 0.55; add(wx, 'snowcap', 'top:' + (awningY - 1.2) + '%;opacity:.7'); }
    var el = document.getElementById('ns-wx'); if (el && text) el.textContent = (tempF != null ? tempF + '° ' : '') + text + ' · Lewiston';
    if (/thunder/.test(t)) setInterval(function () { document.body.classList.add('flash'); setTimeout(function () { document.body.classList.remove('flash'); }, 140); }, 9000 + Math.random() * 9000);
  }
  season_();
  var cached = null; try { cached = JSON.parse(sessionStorage.getItem('kl-wx') || 'null'); } catch (e) {}
  if (cached && Date.now() - cached.at < 15 * 60e3) apply(cached.text, cached.f);
  else fetch('https://api.weather.gov/stations/KLEW/observations/latest').then(function (r) { return r.json(); }).then(function (o) {
    var p = o.properties || {}, c = p.temperature && p.temperature.value, f = c == null ? null : Math.round(c * 9 / 5 + 32);
    try { sessionStorage.setItem('kl-wx', JSON.stringify({ at: Date.now(), text: p.textDescription || '', f: f })); } catch (e) {}
    apply(p.textDescription || '', f);
  }).catch(function () {});
})();
