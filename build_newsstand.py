#!/usr/bin/env python3
"""Build the Newsstand — the Garden's one home-screen app: every paper laid out as a rolling-paper pack (listed in papers.json).
The page fills in each paper's latest issue live (<path>latest.json), shows a red badge with the number of issues you haven't
read on each pack, and keeps the app icon's badge in step. Room for more papers: add them to papers.json."""
import html, json, os

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(ROOT, "site")
e = lambda s: html.escape(str(s or ""))

JS = r"""<script>
(function () {
  var store = { get: function (k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } },
                set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  var read = store.get('ns-read'), now = new Date(), total = 0, pending = 0;
  document.getElementById('ns-hi').textContent = (now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening') + ', CAK3D';
  document.getElementById('ns-date').textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  function nice(d) { var p = d.split('-'); return new Date(+p[0], p[1] - 1, +p[2]).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }
  function badge() { if (navigator.setAppBadge) { (total ? navigator.setAppBadge(total) : navigator.clearAppBadge()).catch(function () {}); } }
  var packs = document.querySelectorAll('.pk[data-id]'); pending = packs.length;
  Array.prototype.forEach.call(packs, function (a) {
    var id = a.dataset.id, path = a.getAttribute('href');
    fetch(path + 'latest.json', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (l) {
      a.querySelector('.pk-head').textContent = l.title || '';
      a.querySelector('.pk-when').textContent = l.date ? (l.url === '' && !(l.issues || []).length ? 'Updated ' : '') + nice(l.date) : '';
      a.dataset.issue = l.date || '';
      var issues = l.issues || (l.url ? [l.date] : []), last = read[id] || '';
      var n = issues.filter(function (d) { return d > last; }).length;
      if (n) { a.classList.add('new'); a.querySelector('.pk-badge').textContent = n > 9 ? '9+' : n; total += n; }
      if (id === 'double-wide') fetch(path + 'data/weather-' + l.date + '.json').then(function (r) { return r.json(); }).then(function (w) {
        var t = w.now || {}; if (t.temp_f) document.getElementById('ns-wx').textContent = t.temp_f + '° · ' + (t.text || '') + ' · Lewiston';
      }).catch(function () {});
    }).catch(function () { a.querySelector('.pk-head').textContent = 'First issue coming soon'; })
      .then(function () { if (--pending === 0) badge(); });
    a.addEventListener('click', function () {
      if (a.dataset.issue) { read[id] = a.dataset.issue; store.set('ns-read', read); }
      if (navigator.serviceWorker) navigator.serviceWorker.ready.then(function (reg) {   // clear that paper's notices
        return reg.getNotifications({ tag: id }).then(function (ns) { ns.forEach(function (x) { x.close(); }); });
      }).catch(function () {});
    });
  });
})();
</script>"""


def pack(p):
    img = "/double-wide/img/%s.png" % p.get("mascot") if p.get("mascot") else ""
    words = e(p["name"]).replace("The ", "The&nbsp;", 1)
    return ('<a class="pk pk-%s pk-%s" data-id="%s" href="%s"><span class="pk-badge" aria-label="new issues"></span>'
            '<span class="pk-label">%s</span><span class="pk-oval">%s</span>'
            '<span class="pk-body"><span class="pk-name">%s</span><span class="pk-tag">%s</span>'
            '<span class="pk-head">%s</span><span class="pk-when"></span></span><span class="pk-by">%s · by %s</span></a>'
            % (e(p["pack"]), e(p["shape"]), e(p["id"]), e(p["path"]), e(p.get("label")),
               ('<img src="%s" alt="">' % e(img)) if img else "", words, e(p.get("tag")), e(p.get("blurb")), e(p["when"]), e(p["by"])))


def main():
    cfg = json.load(open(os.path.join(ROOT, "papers.json")))
    css = open(os.path.join(ROOT, "newsstand.css")).read()
    packs = "".join(pack(p) for p in cfg["papers"])
    packs += ('<div class="pk pk-holo pk-wide pk-slot"><span class="pk-label">ULTRA THIN</span><span class="pk-oval"></span>'
              '<span class="pk-body"><span class="pk-name">Your Paper Here</span><span class="pk-tag">OPEN SLOT ON THE RACK</span></span></div>') * int(cfg.get("open_slots", 1))
    body = ('<div class="ns"><header class="ns-top"><div class="ns-sign">THE NEWSSTAND</div><div class="ns-hi" id="ns-hi">Good morning, CAK3D</div>'
            '<div class="ns-date" id="ns-date"></div><div class="ns-wx" id="ns-wx"></div></header>'
            '<div class="ns-rack">%s</div><footer class="ns-foot">%s</footer></div>'
            % (packs, " · ".join("%s — %s" % (e(p["name"]), e(p["when"])) for p in cfg["papers"])))
    doc = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
           '<title>The Newsstand</title><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#d9893a">'
           '<link rel="icon" href="/icons/icon-192.png"><link rel="apple-touch-icon" href="/icons/icon-192.png">'
           '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes">'
           '<link href="https://fonts.googleapis.com/css2?family=Rye&family=Abril+Fatface&family=Bangers&family=Oswald:wght@400;600;700'
           '&family=Old+Standard+TT:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">'
           '<style>%s</style><script src="/app.js" defer></script></head><body class="ns-page">%s%s</body></html>' % (css, body, JS))
    os.makedirs(SITE, exist_ok=True)
    open(os.path.join(SITE, "index.html"), "w").write(doc)
    print("newsstand built: %d papers" % len(cfg["papers"]))


if __name__ == "__main__":
    main()
