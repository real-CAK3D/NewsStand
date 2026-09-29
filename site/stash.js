/* The stash box (behind the counter). Inside: your seed packs (open one to plant seeds), what you've bought at the register (spark a pre-roll
   for a fortune), and five things that work: the pocket knife (tips for Hermes / Claude Code / Codex / Ollama), a Zippo (flick it: a spark of
   an idea from the seed catalog), a booklet of rolling papers (pull a leaf: a cheat sheet), a grinder (twist it: your week in numbers) and a
   keyring (a key for every Garden dashboard). Uses the helpers kiosk.js exposes as window.kiosk. */
(function () {
  'use strict';
  var btn = document.getElementById('k-stash'); if (!btn || !document.querySelector('.sc-behind')) return;
  var K = function () { return window.kiosk; };
  function esc(t) { return K().esc(t); }
  var TOOLS = null, KEYS = null;
  var LEAVES = [
    ['SSH', [['ssh -L 8123:localhost:8123 thebak3ry', 'Tunnel a remote dashboard to your own localhost.'], ['ssh-copy-id user@host', 'Stop typing passwords — install your key.'], ['~/.ssh/config', 'Host shortcuts: give every machine a one-word name.']]],
    ['Tailscale', [['tailscale status', 'Every machine on the tailnet and whether it\'s online.'], ['tailscale serve --bg 8080', 'Share a local port as HTTPS on your tailnet.'], ['tailscale ping <host>', 'Is it reachable — direct or via a relay?']]],
    ['systemd', [['systemctl --user list-timers', 'Every scheduled job and when it runs next.'], ['journalctl -u <unit> -f', 'Follow a service\'s log live.'], ['systemctl --user restart <unit>', 'Restart one thing (one at a time on the small VM!).']]],
    ['Docker', [['docker ps --format "{{.Names}}\\t{{.Status}}"', 'What\'s running, tidy.'], ['docker compose logs -f --tail 50', 'Follow the last 50 lines of a stack.'], ['docker system df', 'How much disk the images are eating.']]],
    ['Git', [['git switch -c idea', 'A safe branch before you try something.'], ['git stash && git pull && git stash pop', 'Update without losing your edits.'], ['git log --oneline -15', 'The last 15 changes at a glance.']]],
    ['Disk & memory', [['df -h / && free -m', 'Space and memory in one breath.'], ['du -sh * | sort -h | tail', 'The biggest things in this folder.'], ['sudo journalctl --vacuum-size=200M', 'Shrink runaway logs.']]],
    ['Raspberry Pi', [['vcgencmd measure_temp', 'How hot the Pi is running.'], ['dmesg | grep -i mmc', 'SD card errors (theBAK3RY\'s old nemesis).'], ['sudo rpi-clone sda', 'Clone the SD card to a USB SSD before it dies.']]],
    ['Home Assistant', [['ha core check', 'Validate the config before a restart.'], ['ha backups new --name before-change', 'Snapshot first. Always.'], ['Developer tools → Template', 'Test any template live in the browser.']]],
    ['cron', [['*/15 * * * *', 'Every 15 minutes.'], ['30 21 * * *', 'Every night at 9:30.'], ['0 7 * * 0', 'Sundays at 7 AM (Sunday Smoke time).']]],
    ['curl & jq', [['curl -s URL | jq .', 'Pretty-print any JSON API.'], ['curl -sI URL', 'Just the headers — is it up?'], ['jq -r ".items[].title"', 'Pull one field out of every item.']]],
    ['tmux', [['tmux new -s garden', 'A session that survives disconnects.'], ['Ctrl-b d  /  tmux a', 'Detach and come back later.'], ['Ctrl-b %  /  Ctrl-b "', 'Split the screen side-by-side / top-bottom.']]],
    ['ffmpeg', [['ffmpeg -i in.mov -vf scale=1280:-2 out.mp4', 'Shrink a video.'], ['ffmpeg -i in.mp4 -vn out.mp3', 'Rip the audio.'], ['ffmpeg -framerate 12 -i %04d.jpg lapse.mp4', 'Photos → a time-lapse.']]]];

  function open() {
    K().sfx.lid();
    Promise.all([K().loadState(), TOOLS ? TOOLS : K().get('/stash-tools.json').catch(function () { return { tools: {} }; }),
                 KEYS ? KEYS : K().get('/keyring.json').catch(function () { return { keys: [] }; })]).then(function (r) {
      TOOLS = r[1]; KEYS = r[2]; var st = K().state(), packs = (st.stash && st.stash.packs) || [], goods = (st.stash && st.stash.goods) || [];
      var count = {}; goods.forEach(function (g) { count[g.item] = (count[g.item] || 0) + 1; });
      var v = K().sheet('stash', 'Under the counter · your stash box', 'The Stash',
        '<div class="sb-in">' +
        '<div class="sb-row-h">Seed packs · ' + st.wallet.balance + ' Garden Bucks in your pocket</div><div class="sb-packs">' +
        (packs.map(function (p, i) { var n = Object.keys(p.seeds || {}).length, g = Object.keys(p.seeds || {}).filter(function (s) { return p.seeds[s].status === 'grown'; }).length;
          return '<button type="button" class="sb-pack" data-i="' + i + '" style="--c:' + esc(p.color || '#e2584c') + ';--r:' + ((i % 3) - 1) * 3 + 'deg"><b>' + esc(p.name) + '</b><small>' + n + ' seeds · ' + g + ' grown</small></button>'; }).join('') ||
         '<p class="sb-empty">No seed packs yet — pick some up in <a href="/seed-catalog/">The Seed Catalog</a>.</p>') + '</div>' +
        '<div class="sb-row-h">From the register</div><div class="sb-goods">' +
        (['preroll', 'papers', 'pipe', 'bong'].filter(function (k) { return count[k]; }).map(function (k) {
          return '<div class="sb-good sb-' + k + '"><span></span><b>' + ({ preroll: 'Pre-rolls', papers: 'Papers packs', pipe: 'Glass pipes', bong: 'Bongs' })[k] + ' × ' + count[k] + '</b>' +
            (k === 'preroll' ? '<button type="button" class="kv-btn" id="sb-spark">🔥 Spark one</button>' : '') + '</div>'; }).join('') ||
         '<p class="sb-empty">Nothing yet — the smoke shop sells papers, pre-rolls, pipes and bongs.</p>') + '</div>' +
        '<div class="sb-row-h">Tools</div><div class="sb-tools">' +
        '<button type="button" class="sb-tool" data-t="knife"><span class="ico-knife"></span><b>Pocket knife</b><small>tips & tricks</small></button>' +
        '<button type="button" class="sb-tool" data-t="zippo"><span class="ico-zippo"><i class="lid"></i><i class="flame"></i></span><b>Zippo</b><small>spark an idea</small></button>' +
        '<button type="button" class="sb-tool" data-t="papers"><span class="ico-papers"><i class="leaf"></i></span><b>Rolling papers</b><small>pull a cheat sheet</small></button>' +
        '<button type="button" class="sb-tool" data-t="grinder"><span class="ico-grinder"><i class="top"></i></span><b>Grinder</b><small>grind your week</small></button>' +
        '<button type="button" class="sb-tool" data-t="keys"><span class="ico-keys"></span><b>Keyring</b><small>every dashboard</small></button></div>' +
        '<div class="sb-out" id="sb-out"></div></div>', 'kv-stash');
      v.onclosed = function () { btn.classList.remove('open'); };
      Array.prototype.forEach.call(v.querySelectorAll('.sb-pack'), function (b) { b.addEventListener('click', function () { openPack(packs[+b.dataset.i]); }); });
      Array.prototype.forEach.call(v.querySelectorAll('.sb-tool'), function (b) { b.addEventListener('click', function () { use(v, b); }); });
      var sp = v.querySelector('#sb-spark'); if (sp) sp.onclick = function () { spark(v, sp); };
    });
  }
  function out(v, html) { var o = v.querySelector('#sb-out'); o.innerHTML = html; o.classList.add('on'); o.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return o; }
  function use(v, b) {
    var t = b.dataset.t; Array.prototype.forEach.call(v.querySelectorAll('.sb-tool'), function (x) { x.classList.toggle('active', x === b); });
    b.classList.remove('go'); void b.offsetWidth; b.classList.add('go');
    if (t === 'knife') return knife(v);
    if (t === 'zippo') return zippo(v);
    if (t === 'papers') return papers(v);
    if (t === 'grinder') return grinder(v);
    if (t === 'keys') return keyring(v);
  }
  function hint(o, t) { var h = o.querySelector('.tl-hint'); if (h) h.textContent = t; }

  // ---------- the Zippo, after the old iPhone Zippo app: swipe the lid open (clink), swipe the wheel (sparks, and it catches), a live flame
  // that stays upright when you tilt your phone and leans when you wave the pointer across it; tap the lid to snap it shut (clack)
  var ZAC = null;
  function zac() { if (!ZAC) { try { ZAC = (window.kioskAudio && window.kioskAudio()) || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (ZAC && ZAC.state === 'suspended') ZAC.resume(); return ZAC; }
  function zsnd(kind) {
    var c = zac(); if (!c) return null; var t = c.currentTime, out = c.createGain(); out.gain.value = 0.6; out.connect(c.destination);
    function ping(f, d, v, at) { var o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(v, t + (at || 0)); g.gain.exponentialRampToValueAtTime(0.0001, t + (at || 0) + d); o.connect(g); g.connect(out); o.start(t + (at || 0)); o.stop(t + (at || 0) + d); }
    function noise(d, f, q, v, at, type) { var n = c.createBuffer(1, Math.ceil(c.sampleRate * d), c.sampleRate), x = n.getChannelData(0); for (var i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 2);
      var s = c.createBufferSource(), b = c.createBiquadFilter(), g = c.createGain(); s.buffer = n; b.type = type || 'bandpass'; b.frequency.value = f; b.Q.value = q; g.gain.value = v; s.connect(b); b.connect(g); g.connect(out); s.start(t + (at || 0)); }
    if (kind === 'open') { noise(0.03, 5000, 1, 0.9); ping(2350, 0.5, 0.35, 0.005); ping(3720, 0.35, 0.2, 0.005); ping(5230, 0.2, 0.1, 0.01); noise(0.05, 3000, 2, 0.4, 0.06); }   // the Zippo clink
    if (kind === 'close') { noise(0.05, 1200, 1, 1.0); ping(980, 0.12, 0.3); ping(2100, 0.08, 0.15); }                                                                     // the clack
    if (kind === 'strike') { noise(0.14, 3600, 0.8, 1.0); noise(0.1, 7000, 1.5, 0.5, 0.03); }                                                                              // flint on the wheel
    if (kind === 'light') { noise(0.5, 260, 0.7, 1.2, 0, 'lowpass'); }                                                                                                     // the wick catching
    if (kind === 'burn') {   // the soft roar of the flame, looped
      var n = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), x = n.getChannelData(0); for (var i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * 0.5;
      var s = c.createBufferSource(), b = c.createBiquadFilter(), g = c.createGain(); s.buffer = n; s.loop = true; b.type = 'lowpass'; b.frequency.value = 420; g.gain.value = 0.12; s.connect(b); b.connect(g); g.connect(out); s.start();
      return function () { try { g.gain.setTargetAtTime(0, c.currentTime, 0.08); s.stop(c.currentTime + 0.4); } catch (e) {} };
    }
    return null;
  }
  function zippo() {
    var v = K().sheet('zippo', 'From the stash box', 'The Zippo', '<div class="zz" id="zz"><canvas class="zz-glow"></canvas><div class="zz-stage">' +
      '<svg class="zz-svg" viewBox="0 0 260 420" aria-hidden="true"><defs>' +
      '<linearGradient id="zzc" x1="0" x2="1"><stop offset="0" stop-color="#6d747a"/><stop offset=".18" stop-color="#e9edf0"/><stop offset=".32" stop-color="#b7bec4"/><stop offset=".55" stop-color="#f6f8f9"/><stop offset=".78" stop-color="#9aa2a8"/><stop offset="1" stop-color="#5a6167"/></linearGradient>' +
      '<linearGradient id="zzi" x1="0" x2="1"><stop offset="0" stop-color="#8c9398"/><stop offset=".5" stop-color="#dfe3e6"/><stop offset="1" stop-color="#7a8187"/></linearGradient>' +
      '<filter id="zzb" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9 0.012" numOctaves="2" seed="4"/><feColorMatrix type="saturate" values="0"/>' +
      '<feComponentTransfer><feFuncA type="table" tableValues="0 0.16"/></feComponentTransfer><feComposite in2="SourceGraphic" operator="in"/></filter></defs>' +
      '<g class="zz-insert"><rect x="70" y="122" width="120" height="96" rx="6" fill="url(#zzi)" stroke="#50575c"/>' +
      [0, 1, 2, 3].map(function (r) { return [0, 1, 2, 3].map(function (k) { return '<circle cx="' + (86 + k * 20) + '" cy="' + (146 + r * 18) + '" r="5.5" fill="#2e3336"/>'; }).join(''); }).join('') +
      '<rect x="118" y="104" width="14" height="22" rx="6" fill="#efe4c8"/><rect x="118" y="104" width="14" height="6" rx="3" fill="#3a2c20"/>' +
      '<rect x="148" y="112" width="30" height="10" fill="#5a6167"/><g class="zz-wheel"><circle cx="163" cy="112" r="17" fill="#6b7278"/><circle cx="163" cy="112" r="17" fill="none" stroke="#2c3033" stroke-width="5" stroke-dasharray="2.5 2"/>' +
      '<circle cx="163" cy="112" r="4" fill="#2c3033"/></g></g>' +
      '<g class="zz-case"><rect x="56" y="214" width="148" height="196" rx="14" fill="url(#zzc)"/><rect x="56" y="214" width="148" height="196" rx="14" fill="#fff" filter="url(#zzb)"/>' +
      '<rect x="56" y="214" width="148" height="8" fill="#8a9297"/><rect x="198" y="200" width="12" height="30" rx="3" fill="#8a9297"/>' +
      '<g opacity=".55" fill="none" stroke="#4a5156" stroke-width="2"><path d="M130 262 c-14 12 -14 34 0 48 c14 -14 14 -36 0 -48 z M130 262 v60 M130 300 l-16 -10 M130 290 l14 -10"/></g>' +
      '<text x="130" y="352" text-anchor="middle" font-family="Rye, serif" font-size="20" fill="#566" opacity=".75">GARDEN</text></g>' +
      '<g class="zz-lid"><rect x="56" y="118" width="148" height="100" rx="14" fill="url(#zzc)"/><rect x="56" y="118" width="148" height="100" rx="14" fill="#fff" filter="url(#zzb)"/>' +
      '<rect x="56" y="208" width="148" height="8" fill="#8a9297"/></g></svg><canvas class="zz-fire"></canvas></div>' +
      '<div class="zz-hint">Swipe up on the lid to flip it open</div><div class="zz-idea tl-out" id="zz-idea"></div></div>', 'kv-zippo');
    var box = v.querySelector('#zz'), stage = box.querySelector('.zz-stage'), fire = box.querySelector('.zz-fire'), glow = box.querySelector('.zz-glow'), fx = fire.getContext('2d'), gx = glow.getContext('2d');
    var state = 'shut', lean = 0, wind = 0, tilt = 0, burn = null, sparks = [], run = true, lastX = null, gy = null;
    function hint(t) { box.querySelector('.zz-hint').textContent = t; }
    function size() { var r = stage.getBoundingClientRect(); fire.width = r.width * 2; fire.height = r.height * 2; glow.width = box.clientWidth; glow.height = box.clientHeight; }
    size(); addEventListener('resize', size);
    function openLid() { if (state !== 'shut') return; state = 'open'; box.classList.add('open'); zsnd('open'); hint('Swipe down across the wheel to strike it'); }
    function shut() { if (state === 'shut') return; if (burn) { burn(); burn = null; } state = 'shut'; box.classList.remove('open', 'lit'); zsnd('close'); box.querySelector('#zz-idea').classList.remove('on'); hint('Swipe up on the lid to flip it open'); }
    function strike() {
      if (state === 'shut') return openLid();
      box.classList.remove('spin'); void box.offsetWidth; box.classList.add('spin'); zsnd('strike');
      var W = fire.width, H = fire.height; for (var i = 0; i < 26; i++) sparks.push({ x: W * 0.627, y: H * 0.267, vx: (Math.random() - 0.7) * 9, vy: -Math.random() * 10 - 2, l: 1 });
      if (state === 'lit') return idea();
      if (Math.random() < 0.8) setTimeout(function () { state = 'lit'; box.classList.add('lit'); zsnd('light'); burn = zsnd('burn'); hint('Tilt your phone or wave across the flame · tap the lid to snap it shut'); idea(); }, 120);
      else hint('Didn\'t catch. Strike it again.');
    }
    function idea() {
      var packs = ((K().catalog() || {}).packs) || [], seeds = []; packs.forEach(function (p) { (p.seeds || []).forEach(function (s) { seeds.push([p, s]); }); });
      var p = seeds[Math.floor(Math.random() * seeds.length)], o = box.querySelector('#zz-idea'); if (!p) return;
      o.innerHTML = '<div class="spark-h">🔥 By the light of the flame</div><h3>' + esc(p[1].name) + '</h3><p>' + esc(p[1].what) + '</p><p><a class="kv-btn" href="/seed-catalog/#pack-' + esc(p[0].id) + '">In the "' + esc(p[0].name) + '" pack ›</a></p>';
      o.classList.add('on');
    }
    // gestures: swipe up on the lid, swipe down on the wheel, taps work too
    stage.addEventListener('pointerdown', function (e) { gy = { y: e.clientY, x: e.clientX, t: e.target }; if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission && !zippo.asked) { zippo.asked = true; DeviceOrientationEvent.requestPermission().catch(function () {}); } zac(); });
    stage.addEventListener('pointerup', function (e) {
      if (!gy) return; var dy = e.clientY - gy.y, onLid = gy.t.closest && gy.t.closest('.zz-lid'), r = stage.getBoundingClientRect(), fy = (gy.y - r.top) / r.height; gy = null;
      if (state === 'shut') return openLid();
      if (onLid || (dy < -30)) return shut();
      if (dy > 20 || fy < 0.45) return strike();
      if (state === 'lit') idea();
    });
    stage.addEventListener('pointermove', function (e) { if (lastX != null) wind += (e.clientX - lastX) * 0.04; lastX = e.clientX; });
    function orient(e) { if (e.gamma != null) tilt = Math.max(-60, Math.min(60, e.gamma)); }
    addEventListener('deviceorientation', orient);
    (function frame(t) {
      if (!run || !document.body.contains(box)) { run = false; if (burn) burn(); removeEventListener('deviceorientation', orient); return; }
      var W = fire.width, H = fire.height; fx.clearRect(0, 0, W, H);
      box.style.setProperty('--tilt', (tilt * 0.5) + 'deg');
      wind *= 0.92; lean += ((-tilt * 0.9 + wind * 20) - lean) * 0.08;
      if (state === 'lit') {
        var bx = W * 0.463, by = H * 0.25, fl = 1 + Math.sin(t / 70) * 0.04 + Math.sin(t / 23) * 0.03 + (Math.random() - 0.5) * 0.04, h = H * 0.3 * fl, w = W * 0.09 * (1 + Math.sin(t / 110) * 0.05);
        var a = (lean * Math.PI / 180), tipx = bx + Math.sin(a) * h + Math.sin(t / 90) * w * 0.25, tipy = by - Math.cos(a) * h;
        fx.globalCompositeOperation = 'lighter';
        [[1.6, 'rgba(255,120,20,0.10)'], [1.25, 'rgba(255,140,30,0.35)'], [1.0, 'rgba(255,190,70,0.75)'], [0.62, 'rgba(255,240,190,0.9)']].forEach(function (L) {
          var s = L[0]; fx.beginPath(); fx.moveTo(bx - w * s, by);
          fx.bezierCurveTo(bx - w * s * 1.2, by - h * 0.35 * s, tipx - w * 0.2 * s, tipy + h * 0.25 * (2 - s), tipx, by - (by - tipy) * Math.min(1, s * 0.9 + 0.1));
          fx.bezierCurveTo(tipx + w * 0.2 * s, tipy + h * 0.25 * (2 - s), bx + w * s * 1.2, by - h * 0.35 * s, bx + w * s, by);
          fx.closePath(); var g = fx.createLinearGradient(bx, by, tipx, tipy); g.addColorStop(0, L[1]); g.addColorStop(1, 'rgba(255,90,0,0)'); fx.fillStyle = g; fx.fill(); });
        var bl = fx.createRadialGradient(bx, by - 4, 1, bx, by - 4, w * 0.9); bl.addColorStop(0, 'rgba(80,140,255,.8)'); bl.addColorStop(1, 'rgba(40,80,255,0)'); fx.fillStyle = bl; fx.beginPath(); fx.arc(bx, by - 4, w, 0, 7); fx.fill();
        fx.globalCompositeOperation = 'source-over';
        var GW = glow.width, GH = glow.height, sr = stage.getBoundingClientRect(), br = box.getBoundingClientRect(), gxx = sr.left - br.left + bx / 2, gyy = sr.top - br.top + by / 2 - h / 4;
        gx.clearRect(0, 0, GW, GH); var gg = gx.createRadialGradient(gxx, gyy, 10, gxx, gyy, Math.max(GW, GH) * 0.7 * fl);
        gg.addColorStop(0, 'rgba(255,170,60,.42)'); gg.addColorStop(0.35, 'rgba(255,120,30,.14)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); gx.fillStyle = gg; gx.fillRect(0, 0, GW, GH);
      } else gx.clearRect(0, 0, glow.width, glow.height);
      sparks = sparks.filter(function (p) { p.x += p.vx; p.y += p.vy; p.vy += 0.5; p.l -= 0.045; if (p.l <= 0) return false;
        fx.fillStyle = 'rgba(255,' + (200 + 55 * p.l | 0) + ',120,' + p.l + ')'; fx.fillRect(p.x, p.y, 3, 3); return true; });
      requestAnimationFrame(frame);
    })(0);
  }


  // ---------- the rolling papers: pull a leaf out of the booklet (drag it up, or tap), read it, roll it up
  function papers(v) {
    var o = out(v, '<div class="tl rp" id="rp"><div class="rp-stage"><div class="rp-leaf" id="rp-leaf"><span>pull ↑</span></div>' +
      '<div class="rp-book"><b>GARDEN</b><i>PAPERS</i><small>KING SIZE · 32 LEAVES</small></div>' +
      '<div class="rp-sheet" id="rp-sheet"></div><div class="rp-joint" id="rp-joint"><svg viewBox="0 0 300 80" aria-hidden="true"><defs>' +
      '<linearGradient id="rpj" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fffdf6"/><stop offset=".45" stop-color="#f4ecd6"/><stop offset="1" stop-color="#c9bb96"/></linearGradient></defs>' +
      '<path d="M22 32 L246 16 Q256 40 246 64 L22 48 Z" fill="url(#rpj)" stroke="#a8966c" stroke-width="1.5"/>' +
      '<path d="M246 16 Q286 26 292 40 Q286 54 246 64 Q256 40 246 16 Z" fill="#efe4c4" stroke="#a8966c" stroke-width="1.5"/>' +
      '<path d="M258 30 q14 6 26 10 M258 50 q14 -6 26 -10" stroke="#b9a77c" stroke-width="1.2" fill="none"/><circle cx="249" cy="40" r="5" fill="#6f8f3a" opacity=".8"/>' +
      '<rect x="12" y="31" width="40" height="18" rx="4" fill="#d9b77a" stroke="#a8864a"/><path d="M18 36 h28 M18 40 h28 M18 44 h28" stroke="#b99254" stroke-width="1"/>' +
      '<path d="M70 32 L236 20" stroke="#fff" stroke-width="2.5" opacity=".7"/><path d="M80 46 L230 56" stroke="#b8a77f" stroke-width="1" opacity=".6"/></svg></div></div>' +
      '<div class="tl-hint">Drag the paper up out of the booklet (or tap it)</div><div class="kv-row rp-ctl"><button type="button" class="kv-btn" id="rp-roll" hidden>🌀 Roll it up</button>' +
      '<button type="button" class="kv-btn ghost" id="rp-next" hidden>Pull another</button></div></div>');
    var rp = o.querySelector('#rp'), leaf = o.querySelector('#rp-leaf'), sheet = o.querySelector('#rp-sheet'), roll = o.querySelector('#rp-roll'), next = o.querySelector('#rp-next');
    var y0 = null;
    function pull() {
      if (rp.classList.contains('pulled')) return;
      var i = (K().store.get('leaf', -1) + 1) % LEAVES.length; K().store.set('leaf', i); var L = LEAVES[i];
      sheet.innerHTML = '<div class="leaf-h">Leaf ' + (i + 1) + ' of ' + LEAVES.length + ' · ' + esc(L[0]) + '</div><dl>' +
        L[1].map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl>';
      sheet.dataset.topic = L[0];
      rp.classList.remove('rolled', 'rolling'); rp.classList.add('pulled'); leaf.style.transform = ''; K().sfx.drawer();
      roll.hidden = false; next.hidden = true; hint(o, 'A cheat sheet on every leaf · roll it up when you\'ve got it');
    }
    leaf.addEventListener('pointerdown', function (e) { y0 = e.clientY; try { leaf.setPointerCapture(e.pointerId); } catch (x) {} });
    leaf.addEventListener('pointermove', function (e) { if (y0 == null) return; var d = Math.min(0, e.clientY - y0); leaf.style.transform = 'translateY(' + d + 'px)'; if (d < -45) { y0 = null; pull(); } });
    leaf.addEventListener('pointerup', function () { if (y0 != null) { y0 = null; pull(); } });
    leaf.addEventListener('click', function () { if (y0 == null && !rp.classList.contains('pulled')) pull(); });
    o.querySelector('.rp-book').addEventListener('click', function () { if (!rp.classList.contains('pulled') || rp.classList.contains('rolled')) { rp.classList.remove('pulled', 'rolled'); pull(); } });
    roll.onclick = function () {
      roll.hidden = true; rp.classList.add('rolling'); K().sfx.drawer(); setTimeout(K().sfx.puff, 500);
      setTimeout(function () {
        rp.classList.remove('rolling'); rp.classList.add('rolled'); var n = K().store.get('rolled', 0) + 1; K().store.set('rolled', n);
        hint(o, 'Rolled a ' + sheet.dataset.topic + ' joint · that\'s ' + n + ' rolled so far'); next.hidden = false;
      }, 900);
    };
    next.onclick = function () { rp.classList.remove('pulled', 'rolled'); next.hidden = true; setTimeout(pull, 50); };
  }

  // ---------- the grinder: lid off, drop a bud in, twist (drag round and round, or tap Twist), open it up: your week, ground fine
  function grinder(v) {
    var teeth = '', flakes = '', bud = '', knurl = '';
    [[40, 8], [72, 14], [98, 20]].forEach(function (ring) { for (var k = 0; k < ring[1]; k++) { var a = k / ring[1] * Math.PI * 2 + ring[0], x = 150 + Math.cos(a) * ring[0], y = 150 + Math.sin(a) * ring[0];
      teeth += '<path d="M' + x.toFixed(1) + ' ' + (y - 7).toFixed(1) + ' l6 7 -6 7 -6 -7 Z" fill="#c9d0d6" stroke="#6f777d" stroke-width="1"/>'; } });
    for (var f = 0; f < 420; f++) { var a2 = f * 2.39996, r2 = 100 * Math.sqrt((f + 0.5) / 420) + (f % 7) - 3, fx = 150 + Math.cos(a2) * r2, fy = 150 + Math.sin(a2) * r2, sz = 4 + f % 5;
      flakes += '<path d="M' + fx.toFixed(1) + ' ' + fy.toFixed(1) + ' l' + sz + ' ' + (f % 3 - 1) + ' l' + (-(f % 4) - 1) + ' ' + (sz - 1) + ' l' + (-(sz - 2)) + ' ' + (-(f % 2) - 2) + ' Z" fill="' +
        ['#7a9a3a', '#93b04a', '#5d7d2c', '#b5c46a', '#6f8f3a', '#d0873a', '#a9bb5c'][f % 7] + '" transform="rotate(' + (f * 47 % 360) + ' ' + fx.toFixed(1) + ' ' + fy.toFixed(1) + ')"/>'; }
    for (var fz = 0; fz < 60; fz++) { var a4 = fz * 1.7, r4 = 95 * Math.sqrt((fz + 0.5) / 60); flakes += '<circle cx="' + (150 + Math.cos(a4) * r4).toFixed(1) + '" cy="' + (150 + Math.sin(a4) * r4).toFixed(1) + '" r="1.3" fill="#f2f0dc" opacity=".8"/>'; }   // trichomes
    for (var b2 = 0; b2 < 26; b2++) { var a3 = b2 * 2.39, r3 = (b2 % 5) * 5; bud += '<circle cx="' + (150 + Math.cos(a3) * r3).toFixed(1) + '" cy="' + (150 + Math.sin(a3) * r3 * 1.3).toFixed(1) + '" r="' + (7 + b2 % 3) + '" fill="' + ['#6f8f3a', '#86a64a', '#5a7a30'][b2 % 3] + '" stroke="#3f5a22" stroke-width=".8"/>'; }
    for (var h = 0; h < 10; h++) bud += '<path d="M' + (140 + h * 2) + ' ' + (140 + (h % 4) * 6) + ' q6 -4 10 2" stroke="#d9772b" stroke-width="1.4" fill="none"/>';
    for (var n = 0; n < 72; n++) knurl += '<rect x="148.5" y="20" width="3" height="10" fill="#7a8187" transform="rotate(' + (n * 5) + ' 150 150)"/>';
    var o = out(v, '<div class="tl gr" id="gr"><svg class="tl-svg gr-svg" viewBox="0 0 300 300" aria-hidden="true"><defs>' +
      '<radialGradient id="grm" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#eef1f3"/><stop offset=".5" stop-color="#aab2b8"/><stop offset="1" stop-color="#5c646a"/></radialGradient></defs>' +
      '<circle cx="150" cy="150" r="130" fill="url(#grm)" stroke="#4a5156" stroke-width="3"/><circle cx="150" cy="150" r="112" fill="#2a2e32"/>' + teeth +
      '<g class="gr-ground">' + flakes + '</g><g class="gr-bud">' + bud + '</g>' +
      '<g class="gr-lid"><circle cx="150" cy="150" r="132" fill="url(#grm)" stroke="#4a5156" stroke-width="3"/>' + knurl +
      '<circle cx="150" cy="150" r="96" fill="none" stroke="#8d959b" stroke-width="2"/><text x="150" y="146" text-anchor="middle" font-family="Rye, serif" font-size="22" fill="#6a7278">GARDEN</text>' +
      '<text x="150" y="170" text-anchor="middle" font-family="Oswald, sans-serif" font-size="11" letter-spacing="4" fill="#6a7278">4-PIECE · 63MM</text></g>' +
      '<circle class="gr-prog" cx="150" cy="150" r="143" fill="none" stroke="#f3d58a" stroke-width="5" stroke-linecap="round" transform="rotate(-90 150 150)" pathLength="100" stroke-dasharray="0 100"/></svg>' +
      '<div class="tl-hint">Tap to twist the lid off</div><div class="kv-row gr-ctl"><button type="button" class="kv-btn" id="gr-twist" hidden>↻ Twist</button></div><div class="tl-out" id="gr-out"></div></div>');
    var g = o.querySelector('#gr'), svg = g.querySelector('.gr-svg'), lid = g.querySelector('.gr-lid'), prog = g.querySelector('.gr-prog'), tw = g.querySelector('#gr-twist');
    var stage = 0, rot = 0, done = 0, GOAL = 1080, last = null, tick = 0;
    function setRot() { lid.style.setProperty('--rot', rot + 'deg'); prog.setAttribute('stroke-dasharray', Math.min(100, done / GOAL * 100).toFixed(1) + ' 100'); }
    function turn(d) {
      if (stage !== 2) return; rot += d; done += Math.abs(d); setRot();
      if (Math.floor(done / 45) > tick) { tick = Math.floor(done / 45); K().sfx.click(); if (tick % 2) setTimeout(K().sfx.drawer, 30); }
      if (done >= GOAL) finish();
    }
    function finish() {
      stage = 3; tw.hidden = true; g.classList.add('ground'); g.classList.remove('lidon'); g.classList.add('lidoff'); K().sfx.lid(); hint(o, 'Ground fine. Tap to load another bud.');
      var st = K().state(), sc = st.scores || {}, won = 0; Object.keys(sc).forEach(function (k) { won += sc[k].won || 0; });
      var grown = 0; ((st.stash || {}).packs || []).forEach(function (p) { Object.keys(p.seeds || {}).forEach(function (k) { if (p.seeds[k].status === 'grown') grown++; }); });
      var box = o.querySelector('#gr-out');
      box.innerHTML = '<div class="spark-h">⚙ Ground fine: your week</div><div class="grind-grid">' +
        '<div><b>' + ((st.punch || {}).streak || 0) + '</b>day reading streak</div><div><b>' + st.wallet.balance + '</b>Garden Bucks</div><div><b>' + won + '</b>puzzles solved</div>' +
        '<div><b>' + (st.clips || []).length + '</b>clippings</div><div><b>' + grown + '</b>seeds grown</div><div><b id="gr-tok">…</b>tokens yesterday (the kief)</div></div>';
      box.classList.add('on');
      K().get('/double-wide/latest.json').then(function (l) { return K().get('/double-wide/data/usage-' + l.date + '.json'); }).then(function (u) {
        var t = u.total || 0; box.querySelector('#gr-tok').textContent = t >= 1e6 ? (t / 1e6).toFixed(1) + 'M' : Math.round(t / 1e3) + 'k'; }).catch(function () { box.querySelector('#gr-tok').textContent = '—'; });
    }
    g.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.gr-ctl')) return;
      if (stage === 0 || stage === 3) {   // lid off (and empty it, the second time round)
        stage = 1; g.classList.remove('ground', 'budin', 'lidon'); g.classList.add('lidoff'); rot = 0; done = 0; tick = 0; setRot(); K().sfx.lid();
        o.querySelector('#gr-out').classList.remove('on'); return hint(o, 'Tap to drop a bud in');
      }
      if (stage === 1) {
        stage = 1.5; g.classList.add('budin'); K().sfx.thwack();
        setTimeout(function () { g.classList.remove('lidoff'); g.classList.add('lidon'); stage = 2; tw.hidden = false; K().sfx.lid();
          hint(o, 'Twist it! Drag round and round on the lid, or tap Twist'); }, 700);
      }
    });
    tw.onclick = function () { turn(90); };
    function ang(e) { var r = svg.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; }
    svg.addEventListener('pointerdown', function (e) { if (stage !== 2) return; last = ang(e); try { svg.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
    svg.addEventListener('pointermove', function (e) { if (last == null || stage !== 2) return; var a = ang(e), d = a - last; if (d > 180) d -= 360; if (d < -180) d += 360; last = a; turn(d); });
    svg.addEventListener('pointerup', function () { last = null; });
  }

  // ---------- the keyring: a jumble of real keys, brass and nickel, big and small, every one cut differently; tap one for its machine
  function keyring(v) {
    var by = {}, names = []; (KEYS.keys || []).forEach(function (k) { var d = k.device || 'Other'; if (!by[d]) { by[d] = []; names.push(d); } by[d].push(k); });
    if (!names.length) return out(v, '<p>The keyring is empty — listings with a web address in The Green Thumb show up here.</p>');
    function rnd(seed) { var x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); }
    var METALS = [['#f6dc8c', '#c9993a', '#8a6420', '#e9c46a'], ['#f4f6f7', '#a9b0b5', '#6d7479', '#dfe3e6'], ['#f0cf78', '#b88a30', '#7d5a1a', '#dcb35a'], ['#eef0f1', '#9aa1a6', '#5f666b', '#d5dadd']];
    var n = names.length, keys = names.map(function (d, i) {
      var r = function (k) { return rnd(i * 17 + k + d.length); }, m = METALS[(i + (r(1) > 0.5 ? 1 : 0)) % METALS.length], sc = 0.78 + r(2) * 0.42, head = Math.floor(r(3) * 4);
      var a = n === 1 ? 0 : -60 + i * (120 / (n - 1)) + (r(4) - 0.5) * 10, L = 88 + r(5) * 26, gid = 'kg' + i;
      // the bow (head): round, rounded-square, Schlage-ish, or a little padlock key
      var bow = head === 0 ? '<circle cx="0" cy="24" r="22"/>' : head === 1 ? '<rect x="-20" y="4" width="40" height="38" rx="10"/>' :
                head === 2 ? '<path d="M0 2 C16 2 24 12 22 26 C20 40 10 44 0 44 C-10 44 -20 40 -22 26 C-24 12 -16 2 0 2 Z"/>' : '<path d="M-16 8 h32 l6 18 l-6 18 h-32 l-6 -18 z"/>';
      // the blade: shoulder, then a V-cut for every pin at its own depth, and the tip
      var pins = 5 + Math.floor(r(6) * 2), p = 'M-7 44 L-7 ' + (44 + L) + ' L0 ' + (50 + L) + ' L7 ' + (44 + L - 4);
      for (var k = pins - 1; k >= 0; k--) { var y = 58 + k * ((L - 18) / pins), dep = 3 + Math.round(r(10 + k) * 6); p += ' L' + (7 + dep) + ' ' + (y + 5).toFixed(1) + ' L7 ' + y.toFixed(1); }
      p += ' L7 50 L12 48 L12 44 Z';
      return '<g class="kr-key" data-i="' + i + '" style="--a:' + a.toFixed(1) + 'deg;--sd:' + (i * 0.11).toFixed(2) + 's"><g transform="translate(180 96) scale(' + sc.toFixed(2) + ')">' +
        '<defs><linearGradient id="' + gid + '" x1="0" x2="1"><stop offset="0" stop-color="' + m[2] + '"/><stop offset=".3" stop-color="' + m[0] + '"/><stop offset=".6" stop-color="' + m[3] + '"/><stop offset="1" stop-color="' + m[1] + '"/></linearGradient></defs>' +
        '<g fill="url(#' + gid + ')" stroke="' + m[2] + '" stroke-width="1.4">' + bow + '<path d="' + p + '"/></g>' +
        '<circle cx="0" cy="12" r="5.5" fill="#1b1510" opacity=".85"/>' +
        '<path d="M-2 56 L-2 ' + (40 + L) + '" stroke="' + m[2] + '" stroke-width="2.4" opacity=".65"/><path d="M1.5 56 L1.5 ' + (38 + L) + '" stroke="' + m[0] + '" stroke-width="1" opacity=".8"/>' +
        '<text x="0" y="31" text-anchor="middle" font-family="Oswald, sans-serif" font-weight="700" font-size="7" letter-spacing=".5" fill="' + m[2] + '" opacity=".8">' + esc(d.replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().slice(0, 9)) + '</text>' +
        '</g></g>';
    }).join('');
    var o = out(v, '<div class="tl kr" id="kr"><svg class="tl-svg kr-svg" viewBox="0 0 360 300" aria-hidden="true"><defs><linearGradient id="krr" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#f4f6f7"/><stop offset=".5" stop-color="#8d949a"/><stop offset="1" stop-color="#dfe3e6"/></linearGradient></defs>' +
      keys + '<g class="kr-ring"><circle cx="180" cy="60" r="38" fill="none" stroke="url(#krr)" stroke-width="6"/><circle cx="182" cy="62" r="38" fill="none" stroke="#9aa1a6" stroke-width="2.5" stroke-dasharray="200 40"/>' +
      '<circle cx="180" cy="60" r="46" fill="transparent"/></g></svg><div class="tl-hint">Tap a key to see what it opens · tap the ring to give it a jingle</div><div class="tl-out" id="kr-out"></div></div>');
    var kr = o.querySelector('#kr'), box = o.querySelector('#kr-out');
    function jingle() { kr.classList.remove('jingle'); void kr.offsetWidth; kr.classList.add('jingle'); [0, 60, 130, 210, 300].forEach(function (t) { setTimeout(K().sfx.click, t); }); }
    jingle();
    o.querySelector('.kr-ring').addEventListener('click', jingle);
    Array.prototype.forEach.call(o.querySelectorAll('.kr-key'), function (k) {
      k.addEventListener('click', function () {
        var i = +k.dataset.i, d = names[i], was = k.classList.contains('sel');
        if (!was) k.parentNode.insertBefore(k, o.querySelector('.kr-ring'));   // the chosen key comes to the front
        Array.prototype.forEach.call(o.querySelectorAll('.kr-key'), function (x) { x.classList.toggle('sel', !was && x === k); x.classList.toggle('dim', !was && x !== k); });
        K().sfx.click(); setTimeout(K().sfx.click, 80);
        if (was) { box.classList.remove('on'); return hint(o, 'Tap a key to see what it opens · tap the ring to give it a jingle'); }
        box.innerHTML = '<div class="key-grp"><h4>🔑 ' + esc(d) + '</h4>' + by[d].map(function (x) { return '<a class="key-link" href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.name) + '</a>'; }).join('') + '</div>';
        box.classList.add('on'); hint(o, 'The ' + d + ' key · tap it again to let it hang');
      });
    });
  }

  function knife(v) {
    var o = out(v, '<div class="kn-wrap" id="kn-wrap">' + document.getElementById('tpl-knife').innerHTML + '</div><div class="kn-hint" id="kn-hint">Tap the knife to flick it open · then tap a blade</div><div class="kn-tips" id="kn-tips"></div>');
    var kn = o.querySelector('#kn-wrap');
    kn.addEventListener('click', function (e) {
      var bl = e.target.closest && e.target.closest('.kn-blade');
      if (!kn.classList.contains('open')) { kn.classList.add('open'); for (var i = 0; i < 6; i++) setTimeout(K().sfx.flick, i * 90); o.querySelector('#kn-hint').textContent = 'Tap a blade · tap the handle to fold it'; return; }
      if (bl) { K().sfx.click(); tool(o, bl.dataset.tool); return; }
      kn.classList.remove('open'); K().sfx.flick(); o.querySelector('#kn-tips').classList.remove('on');
    });
  }
  function tool(o, id) {
    var t = (TOOLS.tools || {})[id] || {}, box = o.querySelector('#kn-tips');
    var secs = (t.sections || []).map(function (s) { return '<div class="kn-sec">' + esc(s.name) + '</div><dl>' + (s.items || []).map(function (it) { return '<dt>' + esc(it.cmd) + '</dt><dd>' + esc(it.what) + '</dd>'; }).join('') + '</dl>'; }).join('');
    if (id === 'fresh') secs = (TOOLS.fresh || []).map(function (f) { return '<div class="kn-sec">' + esc(f.for || 'Fresh find') + '</div><dl><dt>' + esc(f.title) + '</dt><dd>' + esc(f.what) +
      (f.url ? ' <a href="' + esc(f.url) + '" target="_blank" rel="noopener">link ›</a>' : '') + '</dd></dl>'; }).join('') || '<p>B.I.G drops fresh finds in here every Wednesday.</p>';
    box.innerHTML = '<h3>' + esc(t.title || (id === 'fresh' ? 'Fresh Finds' : id)) + '</h3><p>' + esc(t.blurb || '') + '</p>' + secs; box.classList.add('on');
  }
  function spark(v, b) {
    b.disabled = true; K().sfx.flick();
    K().post('/api/spark', {}).then(function (r) {
      if (!r.ok) { K().toast(r.message || 'No pre-rolls.'); b.disabled = false; return; }
      K().sfx.puff(); out(v, '<div class="spark-out smoky"><div class="spark-h">💨 The smoke says…</div><h3>' + esc(r.fortune) + '</h3></div>'); setTimeout(open, 3500);
    }).catch(function () { b.disabled = false; });
  }
  function openPack(p) {
    if (!p) return; var cat = (((K().catalog() || {}).packs) || []).filter(function (x) { return x.id === p.pack; })[0] || { seeds: [] };
    var v = K().sheet('pack', 'Seed pack', p.name, '<p class="kv-p"><i>' + esc(cat.theme || p.theme || '') + '</i></p><ul class="sd-seeds">' + (cat.seeds || []).map(function (s) {
      var st = (p.seeds || {})[s.id] || {}, b2 = st.status === 'grown' ? '<a class="kv-btn" href="' + esc(st.url) + '">📖 Grow guide</a>' :
        st.status === 'planting' ? '<button class="kv-btn ghost" disabled>🌱 Growing…</button>' : '<button type="button" class="kv-btn" data-seed="' + esc(s.id) + '">🌱 Plant it</button>';
      return '<li><div style="flex:1"><b>' + esc(s.name) + '</b><p>' + esc(s.what || '') + '</p><small class="kv-kick" style="letter-spacing:.08em">' + esc([s.level, s.time, s.cost].filter(Boolean).join(' · ')) + '</small></div>' + b2 + '</li>'; }).join('') +
      '</ul><div class="kv-msg"></div><p class="kv-p" style="font-size:13px">Planting a seed has CHRONIC write a full grow guide for your gear — parts, steps, code and where it runs. You get a notice when it sprouts.</p>');
    Array.prototype.forEach.call(v.querySelectorAll('[data-seed]'), function (b) { b.addEventListener('click', function () { b.disabled = true; v.querySelector('.kv-msg').textContent = 'Planting…';
      K().post('/api/plant', { pack: p.pack, seed: b.dataset.seed }).then(function (r) { v.querySelector('.kv-msg').textContent = r.message || ''; if (r.ok) b.textContent = '🌱 Growing…'; else b.disabled = false; })
        .catch(function () { v.querySelector('.kv-msg').textContent = 'Couldn\'t reach the kiosk.'; b.disabled = false; }); }); });
  }
  btn.addEventListener('click', function (e) { e.stopPropagation(); btn.classList.add('open'); open(); });
})();
