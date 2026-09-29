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
    if (t === 'zippo') { K().sfx.flick(); setTimeout(K().sfx.puff, 150); return zippo(v); }
    if (t === 'papers') { K().sfx.drawer(); var i = (K().store.get('leaf', -1) + 1) % LEAVES.length; K().store.set('leaf', i); var L = LEAVES[i];
      return out(v, '<div class="leaf-sheet"><div class="leaf-h">Leaf ' + (i + 1) + ' of ' + LEAVES.length + ' · ' + esc(L[0]) + '</div><dl>' +
        L[1].map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl><small>Tap the booklet again for the next leaf.</small></div>'); }
    if (t === 'grinder') { K().sfx.drawer(); setTimeout(K().sfx.drawer, 300); return grinder(v); }
    if (t === 'keys') { K().sfx.click(); setTimeout(K().sfx.click, 90); setTimeout(K().sfx.click, 170);
      var by = {}; (KEYS.keys || []).forEach(function (k) { (by[k.device || 'Other'] = by[k.device || 'Other'] || []).push(k); });
      return out(v, '<div class="keys-out">' + (Object.keys(by).map(function (d) { return '<div class="key-grp"><h4>🔑 ' + esc(d) + '</h4>' + by[d].map(function (k) {
        return '<a class="key-link" href="' + esc(k.url) + '" target="_blank" rel="noopener">' + esc(k.name) + '</a>'; }).join('') + '</div>'; }).join('') ||
        '<p>The keyring is empty — listings with a web address in The Green Thumb show up here.</p>') + '</div>'); }
  }
  function zippo(v) {
    var packs = ((K().catalog() || {}).packs) || [], seeds = [];
    packs.forEach(function (p) { (p.seeds || []).forEach(function (s) { seeds.push([p, s]); }); });
    if (!seeds.length) return out(v, '<p>The flint\'s wet — the seed catalog isn\'t loaded yet.</p>');
    var pick = seeds[Math.floor(Math.random() * seeds.length)];
    out(v, '<div class="spark-out"><div class="spark-h">🔥 A spark of an idea</div><h3>' + esc(pick[1].name) + '</h3><p>' + esc(pick[1].what) + '</p><small>' +
      esc([pick[1].level, pick[1].time, pick[1].cost].filter(Boolean).join(' · ')) + '</small><p><a class="kv-btn" href="/seed-catalog/#pack-' + esc(pick[0].id) + '">It\'s in the "' + esc(pick[0].name) + '" pack ›</a></p></div>');
  }
  function grinder(v) {
    var st = K().state(), sc = st.scores || {}, won = 0; Object.keys(sc).forEach(function (g) { won += sc[g].won || 0; });
    var grown = 0; ((st.stash || {}).packs || []).forEach(function (p) { Object.keys(p.seeds || {}).forEach(function (k) { if (p.seeds[k].status === 'grown') grown++; }); });
    var o = out(v, '<div class="grind-out"><div class="spark-h">⚙ Ground fine: your week</div><div class="grind-grid">' +
      '<div><b>' + (st.punch.streak || 0) + '</b>day reading streak</div><div><b>' + st.wallet.balance + '</b>Garden Bucks</div><div><b>' + won + '</b>puzzles solved</div>' +
      '<div><b>' + (st.clips || []).length + '</b>clippings</div><div><b>' + grown + '</b>seeds grown</div><div><b id="gr-tok">…</b>tokens yesterday</div></div></div>');
    K().get('/double-wide/latest.json').then(function (l) { return K().get('/double-wide/data/usage-' + l.date + '.json'); }).then(function (u) {
      var n = u.total || 0; o.querySelector('#gr-tok').textContent = n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : Math.round(n / 1e3) + 'k'; }).catch(function () { o.querySelector('#gr-tok').textContent = '—'; });
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
