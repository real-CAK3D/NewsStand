/* The register terminal behind the counter: a monitor, keyboard and mouse over a cash drawer. Tap the keyboard (or the screen) and type —
   what you type shows up on the monitor. OPEN (or NO SALE) pops the drawer; tap the open drawer to count the Garden Bucks inside.
   HELP lists the rest. On a phone, tapping the keyboard brings up your own keyboard. Uses window.kiosk (kiosk.js) and sceneFocus (scene.js). */
(function () {
  'use strict';
  var scr = document.getElementById('pos-scr'); if (!scr) return;
  var K = function () { return window.kiosk; };
  var drawerImg = document.getElementById('k-drawer-open'), drawerBtn = document.getElementById('k-cash-open');
  var inp = document.createElement('input');
  inp.className = 'pos-input'; inp.type = 'text'; inp.autocomplete = 'off'; inp.autocapitalize = 'characters'; inp.spellcheck = false;
  inp.setAttribute('aria-label', 'Type at the register terminal'); inp.enterKeyHint = 'go';
  document.body.appendChild(inp);
  var lines = [], buf = '', awake = false, isOpen = false;
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function paint() {
    if (!awake) { scr.innerHTML = '<div class="pos-idle"><b>GARDEN POS</b><span>tap the keyboard to log in</span></div>'; return; }
    scr.innerHTML = lines.slice(-8).map(function (l) { return '<div class="pos-l' + (l[0] === '!' ? ' hi' : '') + '">' + esc(l[0] === '!' ? l.slice(1) : l) + '</div>'; }).join('') +
      '<div class="pos-l pos-prompt">&gt; ' + esc(buf) + '<i class="pos-cur"></i></div>';
  }
  function say() { for (var i = 0; i < arguments.length; i++) lines.push(arguments[i]); paint(); }
  function clock() { var d = new Date(); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase() + ' ' + d.toTimeString().slice(0, 5); }
  function wake() {
    // focus first, inside the tap itself, or phones won't raise the keyboard
    try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); }
    document.body.classList.add('pos-typing');
    login();
    if (window.sceneFocus) window.sceneFocus('behind', 'pos');
  }
  function login() { if (!awake) { awake = true; lines = ['!THE CORNER CHRONICLE  POS 3.0', 'CLERK CAK3D · ' + clock(), 'TYPE HELP AND PRESS ENTER']; K().sfx.click(); paint(); } }
  function kaching() { K().sfx.bell(); setTimeout(K().sfx.drawer, 140); setTimeout(K().sfx.thwack, 330); }
  function openDrawer() {
    if (isOpen) return say('DRAWER IS ALREADY OPEN');
    isOpen = true; kaching();
    if (drawerImg) drawerImg.classList.add('open'); if (drawerBtn) drawerBtn.hidden = false;
    document.body.classList.add('drawer-open');
    say('!*** NO SALE ***', 'DRAWER OPEN · TAP IT TO COUNT');
  }
  function closeDrawer() {
    if (!isOpen) return say('DRAWER IS ALREADY SHUT');
    isOpen = false; K().sfx.thwack();
    if (drawerImg) drawerImg.classList.remove('open'); if (drawerBtn) drawerBtn.hidden = true;
    document.body.classList.remove('drawer-open'); say('DRAWER CLOSED');
  }
  function bills(n) {   // how the balance sits in the drawer, largest notes first
    var out = [], left = Math.max(0, Math.floor(n));
    [50, 20, 10, 5, 1].forEach(function (d) { var c = Math.floor(left / d); if (c) { out.push([d, c]); left -= c * d; } });
    return out;
  }
  function ledger(n) { var st = K().state() || {}; return ((st.wallet && st.wallet.ledger) || []).slice(-n).reverse(); }
  var CMDS = {
    HELP: function () { say('OPEN   OPEN THE CASH DRAWER', 'CLOSE  SHUT IT', 'BAL    GARDEN BUCKS ON HAND', 'LEDGER LAST RECEIPTS', 'CLS    CLEAR THE SCREEN'); },
    OPEN: openDrawer, 'NO SALE': openDrawer, NS: openDrawer, NOSALE: openDrawer,
    CLOSE: closeDrawer, SHUT: closeDrawer,
    BAL: function () { K().loadState().then(function (st) { say('!ON HAND: ' + st.wallet.balance + ' GB', bills(st.wallet.balance).map(function (b) { return b[1] + '×' + b[0]; }).join(' ')); }); },
    LEDGER: function () { K().loadState().then(function () { var l = ledger(5); if (!l.length) return say('NO RECEIPTS YET');
      l.forEach(function (x) { say((x.delta > 0 ? '+' : '') + x.delta + ' ' + String(x.note || '').toUpperCase().slice(0, 24)); }); }); },
    CLS: function () { lines = []; paint(); },
    CLYDE: function () { say('!WOOF.', '(HE WANTS A TREAT)'); K().sfx.thwack(); },
    LOGOUT: function () { awake = false; inp.blur(); paint(); }
  };
  CMDS.BALANCE = CMDS.BAL; CMDS.RECEIPTS = CMDS.LEDGER; CMDS.CLEAR = CMDS.CLS; CMDS.EXIT = CMDS.LOGOUT;
  function run(cmd) {
    say('> ' + cmd); if (!cmd) return;
    var f = CMDS[cmd] || CMDS[cmd.split(' ')[0]];
    if (f) f(); else { say('?? ' + cmd.slice(0, 18) + ' — TRY HELP'); K().sfx.lid(); }
  }
  inp.addEventListener('input', function () { login(); buf = inp.value.toUpperCase().slice(0, 26); inp.value = buf; K().sfx.click(); paint(); });
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); var c = buf.trim(); buf = ''; inp.value = ''; run(c); }
    else if (e.key === 'Escape') inp.blur();
  });
  inp.addEventListener('blur', function () { document.body.classList.remove('pos-typing'); });

  function cashSheet() {
    K().sfx.drawer();
    K().loadState().then(function (st) {
      var bal = st.wallet.balance, b = bills(bal);
      var v = K().sheet('cash', 'Behind the counter', 'The Cash Drawer',
        '<img class="drawer-shot" alt="The open cash drawer: Garden Bucks under the clips, coins in the cups" src="/scene/drawer-day.jpg">' +
        '<div class="reg-bal"><small>Garden Bucks in the drawer</small><b>' + bal + '</b></div>' +
        '<div class="drawer-count">' + (b.map(function (x) { return '<span class="dc-bill dc-' + x[0] + '"><b>' + x[0] + '</b>× ' + x[1] + '</span>'; }).join('') || '<span>Empty. Read a paper to earn some.</span>') + '</div>' +
        '<p class="kv-p">Pretend money, shared with Dime Bags. You earn <b>10 a day</b> for reading a paper (bonuses at 7, 14 and 30-day streaks) plus whatever you win at the Dime Bags window; ' +
        'you spend it on seed packs and at the smoke shop.</p><h3 class="reg-h">Receipts</h3><ul class="kv-list reg-led">' +
        (ledger(40).map(function (x) {
          return '<li><small>' + esc(String(x.at).replace('T', ' ').slice(0, 16)) + '</small><b class="' + (x.delta < 0 ? 'neg' : 'pos') + '">' + (x.delta > 0 ? '+' : '') + x.delta +
            '</b> ' + esc(x.note) + ' <span class="led-bal">= ' + x.balance + '</span></li>'; }).join('') || '<li>No receipts yet.</li>') +
        '</ul><div class="kv-row"><button type="button" class="kv-btn" id="dr-shut">Shut the drawer</button><a class="kv-btn ghost" href="/dime-bags/">🏇 Dime Bags ›</a></div>', 'kv-register');
      v.querySelector('#dr-shut').onclick = function () { K().close(v); if (isOpen) closeDrawer(); };
    });
  }
  var pos = document.getElementById('k-pos'), q = document.getElementById('k-posq'), cash = document.getElementById('k-cash');
  if (pos) pos.addEventListener('click', wake);
  if (q) q.addEventListener('click', wake);
  if (drawerBtn) drawerBtn.addEventListener('click', cashSheet);
  if (cash) cash.addEventListener('click', function () {
    if (isOpen) return cashSheet();
    K().sfx.lid(); wake(); say('!DRAWER LOCKED', 'TYPE OPEN AND PRESS ENTER');
  });
  paint();
})();
