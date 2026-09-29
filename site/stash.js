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
        (['preroll', 'papers', 'pipe'].filter(function (k) { return count[k]; }).map(function (k) {
          return '<div class="sb-good sb-' + k + '"><span></span><b>' + ({ preroll: 'Pre-rolls', papers: 'Papers packs', pipe: 'Glass pipes' })[k] + ' × ' + count[k] + '</b>' +
            (k === 'preroll' ? '<button type="button" class="kv-btn" id="sb-spark">🔥 Spark one</button>' : '') + '</div>'; }).join('') ||
         '<p class="sb-empty">Nothing yet — the register sells papers, pre-rolls and glass.</p>') + '</div>' +
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

  // ---------- the Zippo: flip the lid, strike the wheel, read the idea by the light of the flame; tap the case to snap it shut
  function idea() {
    var packs = ((K().catalog() || {}).packs) || [], seeds = [];
    packs.forEach(function (p) { (p.seeds || []).forEach(function (s) { seeds.push([p, s]); }); });
    return seeds.length ? seeds[Math.floor(Math.random() * seeds.length)] : null;
  }
  function zippo(v) {
    var holes = '', sparks = '';
    for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) holes += '<circle cx="' + (80 + c * 20) + '" cy="' + (110 + r * 14) + '" r="4.2" fill="#3a3f43"/>';
    for (var k = 0; k < 9; k++) sparks += '<circle class="zp-spark" r="2.2" cx="140" cy="94" style="--dx:' + (Math.cos(k * 0.7 - 2.2) * 60).toFixed(0) + 'px;--dy:' + (Math.sin(k * 0.7 - 2.2) * 50 - 20).toFixed(0) + 'px;--d:' + (k * 25) + 'ms"/>';
    var o = out(v, '<div class="tl zp" id="zp"><svg class="tl-svg" viewBox="0 -60 320 380" aria-hidden="true"><defs>' +
      '<linearGradient id="zpc" x1="0" x2="1"><stop offset="0" stop-color="#7d858b"/><stop offset=".3" stop-color="#f4f6f7"/><stop offset=".55" stop-color="#b9c0c5"/><stop offset="1" stop-color="#5f676d"/></linearGradient>' +
      '<radialGradient id="zpf" cx=".5" cy=".78" r=".62"><stop offset="0" stop-color="#fffbe0"/><stop offset=".3" stop-color="#ffd24a"/><stop offset=".62" stop-color="#ff7a00" stop-opacity=".9"/><stop offset="1" stop-color="#ff3d00" stop-opacity="0"/></radialGradient></defs>' +
      '<g class="zp-insert"><rect x="66" y="88" width="94" height="66" rx="5" fill="url(#zpc)" stroke="#555c61"/>' + holes +
      '<rect x="104" y="76" width="10" height="16" rx="4" fill="#efe4c8"/><g class="zp-wheel"><circle cx="140" cy="94" r="13" fill="#6b7278" stroke="#2c3033" stroke-width="4" stroke-dasharray="3 2.4"/><circle cx="140" cy="94" r="3" fill="#2c3033"/></g></g>' +
      '<g class="zp-flame"><path d="M109 80 C 70 30, 104 -10, 106 -48 C 118 -8, 150 30, 109 80 Z" fill="url(#zpf)"/><path d="M109 78 C 98 58, 104 40, 108 22 C 112 40, 120 58, 109 78 Z" fill="#fff8d6" opacity=".85"/><ellipse cx="109" cy="78" rx="6" ry="4" fill="#4aa3ff" opacity=".7"/></g>' +
      '<g class="zp-sparks">' + sparks + '</g>' +
      '<g class="zp-case"><rect x="58" y="150" width="112" height="160" rx="12" fill="url(#zpc)" stroke="#555c61"/><rect x="58" y="150" width="112" height="7" fill="#8a9297"/>' +
      '<text x="114" y="236" text-anchor="middle" font-family="Rye, serif" font-size="17" fill="#6f777c">GARDEN</text><text x="114" y="256" text-anchor="middle" font-family="Oswald, sans-serif" font-size="10" letter-spacing="3" fill="#6f777c">WINDPROOF</text>' +
      '<rect x="166" y="140" width="10" height="22" rx="3" fill="#8a9297"/></g>' +
      '<g class="zp-lid"><rect x="58" y="86" width="112" height="70" rx="12" fill="url(#zpc)" stroke="#555c61"/><rect x="58" y="146" width="112" height="7" fill="#8a9297"/></g></svg>' +
      '<div class="tl-hint">Tap to flip the lid</div><div class="tl-out" id="zp-out"></div></div>');
    var z = o.querySelector('#zp');
    z.addEventListener('click', function (e) {
      if (!z.classList.contains('open')) { z.classList.add('open'); K().sfx.flick(); setTimeout(K().sfx.click, 90); return hint(o, 'Strike the wheel'); }
      if (z.classList.contains('lit') && e.target.closest && e.target.closest('.zp-case')) {   // snap it shut
        z.classList.remove('lit', 'open'); K().sfx.lid(); o.querySelector('#zp-out').classList.remove('on'); return hint(o, 'Tap to flip the lid');
      }
      z.classList.remove('strike'); void z.offsetWidth; z.classList.add('strike'); K().sfx.flick(); K().sfx.click();
      setTimeout(function () {
        var first = !z.classList.contains('lit'); z.classList.add('lit'); if (first) K().sfx.puff();
        z.classList.remove('flare'); void z.offsetWidth; z.classList.add('flare');
        var p = idea(), box = o.querySelector('#zp-out');
        box.innerHTML = p ? '<div class="spark-h">🔥 By the light of the flame</div><h3>' + esc(p[1].name) + '</h3><p>' + esc(p[1].what) + '</p><small>' +
          esc([p[1].level, p[1].time, p[1].cost].filter(Boolean).join(' · ')) + '</small><p><a class="kv-btn" href="/seed-catalog/#pack-' + esc(p[0].id) + '">It\'s in the "' + esc(p[0].name) + '" pack ›</a></p>'
          : '<p>The flint\'s wet — the seed catalog isn\'t loaded yet.</p>';
        box.classList.add('on'); hint(o, 'Strike again for another idea · tap the case to snap it shut');
      }, 260);
    });
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

  // ---------- the keyring: a key for every machine; tap one and it swings up with that machine's dashboards; tap the ring to jingle
  function keyring(v) {
    var by = {}, names = []; (KEYS.keys || []).forEach(function (k) { var d = k.device || 'Other'; if (!by[d]) { by[d] = []; names.push(d); } by[d].push(k); });
    if (!names.length) return out(v, '<p>The keyring is empty — listings with a web address in The Green Thumb show up here.</p>');
    var COLORS = ['#c0392b', '#2e86c1', '#27ae60', '#d4ac0d', '#8e44ad', '#e67e22', '#16a085', '#7f8c8d'];
    var n = names.length, keys = names.map(function (d, i) {
      var a = n === 1 ? 0 : -55 + i * (110 / (n - 1)), c = COLORS[i % COLORS.length], brass = i % 3 === 1 ? '#c9d0d6' : '#d6ad52', dark = i % 3 === 1 ? '#7d858b' : '#8a6a24';
      return '<g class="kr-key" data-i="' + i + '" style="--a:' + a.toFixed(1) + 'deg;--sd:' + (i * 0.13).toFixed(2) + 's"><g transform="translate(180 92)">' +
        '<rect x="-3" y="-4" width="6" height="16" rx="3" fill="' + dark + '"/>' +
        '<circle cx="0" cy="30" r="21" fill="' + c + '" stroke="rgba(0,0,0,.35)" stroke-width="2"/><circle cx="0" cy="30" r="15" fill="' + brass + '" opacity=".35"/><circle cx="0" cy="18" r="5" fill="#f4ecd8"/>' +
        '<text x="0" y="37" text-anchor="middle" font-family="Oswald, sans-serif" font-weight="700" font-size="13" fill="#fff">' + esc(d.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase()) + '</text>' +
        '<rect x="-6" y="50" width="12" height="96" rx="2" fill="' + brass + '" stroke="' + dark + '"/><path d="M-2 56 v84" stroke="' + dark + '" stroke-width="1.5"/>' +
        '<path d="M6 108 l8 5 -8 5 l8 6 -8 4 l8 6 -8 5 Z" fill="' + brass + '" stroke="' + dark + '"/><path d="M-6 146 l6 8 6 -8 Z" fill="' + brass + '" stroke="' + dark + '"/>' +
        '<g class="kr-tag"><path d="M0 146 q-14 26 -30 34" stroke="#b9a37a" stroke-width="1.5" fill="none"/><rect x="-86" y="174" width="72" height="24" rx="4" fill="#f5eedb" stroke="#b9a37a"/>' +
        '<text x="-50" y="190" text-anchor="middle" font-family="Oswald, sans-serif" font-size="11" fill="#1b1510">' + esc(d.slice(0, 13)) + '</text></g></g></g>';
    }).join('');
    var o = out(v, '<div class="tl kr" id="kr"><svg class="tl-svg kr-svg" viewBox="0 0 360 330" aria-hidden="true"><defs><linearGradient id="krr" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#f4f6f7"/><stop offset=".5" stop-color="#8d949a"/><stop offset="1" stop-color="#dfe3e6"/></linearGradient></defs>' +
      keys + '<g class="kr-ring"><circle cx="180" cy="58" r="36" fill="none" stroke="url(#krr)" stroke-width="7"/><circle cx="182" cy="60" r="36" fill="none" stroke="#9aa1a6" stroke-width="2" stroke-dasharray="190 40"/>' +
      '<circle cx="180" cy="58" r="44" fill="transparent"/></g></svg><div class="tl-hint">Tap a key to see what it opens · tap the ring to give it a jingle</div><div class="tl-out" id="kr-out"></div></div>');
    var kr = o.querySelector('#kr'), box = o.querySelector('#kr-out');
    function jingle() { kr.classList.remove('jingle'); void kr.offsetWidth; kr.classList.add('jingle'); [0, 70, 150, 240].forEach(function (t) { setTimeout(K().sfx.click, t); }); }
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
