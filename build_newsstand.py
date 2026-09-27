#!/usr/bin/env python3
"""Build the Newsstand — the Garden's one home-screen app. A rack with every paper listed in papers.json; the page fills in each
paper's latest issue live (from <path>latest.json) and shows a NEW ribbon until it's opened. Room for more papers: add them to papers.json."""
import html, json, os

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(ROOT, "site")
e = lambda s: html.escape(str(s or ""))

JS = r"""<script>
(function () {
  var store = { get: function (k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } },
                set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  var read = store.get('ns-read'), now = new Date();
  document.getElementById('ns-hi').textContent = (now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening') + ', CAK3D';
  document.getElementById('ns-date').textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  function nice(d) { var p = d.split('-'); return new Date(+p[0], p[1] - 1, +p[2]).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }
  Array.prototype.forEach.call(document.querySelectorAll('.ns-paper[data-id]'), function (a) {
    var id = a.dataset.id, path = a.getAttribute('href');
    fetch(path + 'latest.json', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (l) {
      a.querySelector('.ns-head').textContent = l.title || '';
      a.querySelector('.ns-when').textContent = (l.url ? nice(l.date) : 'Updated ' + nice(l.date));
      a.dataset.issue = l.date;
      if (l.url && read[id] !== l.date) a.classList.add('new');
      if (id === 'double-wide') fetch(path + 'data/weather-' + l.date + '.json').then(function (r) { return r.json(); }).then(function (w) {
        var n = w.now || {}; if (n.temp_f) document.getElementById('ns-wx').textContent = n.temp_f + '° · ' + (n.text || '') + ' · Lewiston';
      }).catch(function () {});
    }).catch(function () { a.querySelector('.ns-head').textContent = 'First issue coming soon'; });
    a.addEventListener('click', function () { if (a.dataset.issue) { read[id] = a.dataset.issue; store.set('ns-read', read); } });
  });
})();
</script>"""


def main():
    cfg = json.load(open(os.path.join(ROOT, "papers.json")))
    css = open(os.path.join(ROOT, "newsstand.css")).read()
    racks = "".join('<a class="ns-paper ns-%s" data-id="%s" href="%s"><span class="ns-new">NEW</span><div class="ns-name">%s</div>'
                    '<div class="ns-sub">%s · by %s</div><div class="ns-head">%s</div><div class="ns-when"></div></a>'
                    % (e(p["style"]), e(p["id"]), e(p["path"]), e(p["name"]), e(p["when"]), e(p["by"]), e(p["blurb"])) for p in cfg["papers"])
    racks += '<div class="ns-paper ns-slot"><div class="ns-name">Your paper here</div><div class="ns-sub">Open slot on the rack</div></div>' * int(cfg.get("open_slots", 1))
    body = ('<div class="ns"><header class="ns-top"><div class="ns-sign">THE NEWSSTAND</div><div class="ns-hi" id="ns-hi">Good morning, CAK3D</div>'
            '<div class="ns-date" id="ns-date"></div><div class="ns-wx" id="ns-wx"></div></header>'
            '<div class="ns-rack">%s</div><div class="ns-counter"><span>ALL THE GARDEN\'S PAPERS · DELIVERED DAILY</span></div>'
            '<footer class="ns-foot">%s</footer></div>'
            % (racks, " · ".join("%s — %s" % (e(p["name"]), e(p["when"])) for p in cfg["papers"])))
    doc = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
           '<title>The Newsstand</title><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#4a2f1a">'
           '<link rel="icon" href="/icons/icon-192.png"><link rel="apple-touch-icon" href="/icons/icon-192.png">'
           '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes">'
           '<link href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=UnifrakturMaguntia&family=Bangers&family=Oswald:wght@400;600;700'
           '&family=Old+Standard+TT:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">'
           '<style>%s</style><script src="/app.js" defer></script></head><body class="ns-page">%s%s</body></html>' % (css, body, JS))
    os.makedirs(SITE, exist_ok=True)
    open(os.path.join(SITE, "index.html"), "w").write(doc)
    print("newsstand built: %d papers" % len(cfg["papers"]))


if __name__ == "__main__":
    main()
