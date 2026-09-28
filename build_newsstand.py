#!/usr/bin/env python3
"""Build The Corner Chronicle — the Garden's one home-screen app: a magazine rack with every paper (listed in papers.json) standing on
the shelves, each showing its own front cover. The page fills in each cover's latest date and headline live (<path>latest.json),
shows a red badge with the number of issues you haven't read, and keeps the app icon's badge in step.
Room for more papers: add them to papers.json."""
import html, json, os

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(ROOT, "site")
e = lambda s: html.escape(str(s or ""))
SEAL = ('<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" stroke-width="5"/>'
        '<path d="M24 78h72v-22l-36-18-36 18z" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>'
        '<rect x="36" y="60" width="14" height="18" fill="currentColor"/><rect x="62" y="60" width="20" height="10" fill="currentColor"/>'
        '<path d="M74 38c4-8 12-8 10-16M82 36c6-6 12-4 12-12" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>')

JS = r"""<script>
(function () {
  var store = { get: function (k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } },
                set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  var read = store.get('ns-read'), now = new Date(), total = 0, pending = 0;
  document.getElementById('ns-hi').textContent = (now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening') + ', CAK3D';
  document.getElementById('ns-date').textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  function parts(d) { var p = d.split('-'); return new Date(+p[0], p[1] - 1, +p[2]); }
  function badge() { if (navigator.setAppBadge) { (total ? navigator.setAppBadge(total) : navigator.clearAppBadge()).catch(function () {}); } }
  var mags = document.querySelectorAll('.mag[data-id]'); pending = mags.length;
  var ex = document.getElementById('ns-extra');
  if (ex) fetch(ex.getAttribute('href') + 'latest.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (l) {
    if (l.active) { ex.querySelector('.ns-extra-head').textContent = l.title || ''; ex.hidden = false;
      if (read['extra-extra'] !== (l.issues || [])[0]) ex.classList.add('new');
      ex.addEventListener('click', function () { read['extra-extra'] = (l.issues || [])[0]; store.set('ns-read', read); }); }
  }).catch(function () {});
  Array.prototype.forEach.call(mags, function (a) {
    var id = a.dataset.id, path = a.getAttribute('href');
    fetch(path + 'latest.json', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (l) {
      a.querySelector('.mg-head').textContent = l.title || '';
      var ln = a.querySelector('.mg-lines');
      (l.lines || []).forEach(function (t) { var i = document.createElement('i'); i.textContent = t; ln.appendChild(i); });
      if ((l.lines || []).length) a.classList.add('has-lines');
      if (l.date) {
        var d = parts(l.date);
        a.querySelector('.mg-dow').textContent = d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
        a.querySelector('.mg-md').textContent = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();
      }
      a.dataset.issue = l.date || '';
      if (l.cover) { var c = a.querySelector(a.classList.contains('mg-pr') ? '.mg-art' : '.mg-cover'); c.style.backgroundImage = 'url(' + path + l.cover + ')'; a.classList.add('has-img'); }
      var issues = l.issues || (l.url ? [l.date] : []), last = read[id] || '';
      var n = issues.filter(function (x) { return x > last; }).length;
      if (n) { a.classList.add('new'); a.querySelector('.mg-badge').textContent = n > 9 ? '9+' : n; total += n; }
      if (id === 'double-wide') fetch(path + 'data/weather-' + l.date + '.json').then(function (r) { return r.json(); }).then(function (w) {
        var t = w.now || {}; if (t.temp_f) document.getElementById('ns-wx').textContent = t.temp_f + '° · ' + (t.text || '') + ' · Lewiston';
      }).catch(function () {});
    }).catch(function () { a.querySelector('.mg-head').textContent = 'First issue coming soon'; })
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


def magazine(p):
    """A small copy of the paper's own front cover, standing on the rack."""
    name = e(p["name"])
    if name.startswith("The "):
        name = '<small>The</small>' + name[4:]
    return ('<a class="mag mg-%s" data-id="%s" href="%s"><span class="mg-badge" aria-label="new issues"></span><span class="mg-cover">'
            '<span class="mg-gum">%s</span>'
            '<span class="mg-top"><span class="mg-seal">%s</span><span class="mg-ear"><span class="mg-dow"></span><b class="mg-md"></b></span></span>'
            '<span class="mg-flag">%s</span><span class="mg-motto">%s</span><span class="mg-art"></span>'
            '<span class="mg-band">%s</span><span class="mg-head"></span><span class="mg-lines"></span>'
            '<span class="mg-foot"><span>%s</span><span>%s</span></span></span></a>'
            % (e(p["look"]), e(p["id"]), e(p["path"]), e(p.get("gum")), SEAL, name, e(p.get("motto")),
               "".join("<i>%s</i>" % e(b) for b in p.get("band") or []), e(p["when"]), "PRICE: " + e(p.get("price"))))


def main():
    cfg = json.load(open(os.path.join(ROOT, "papers.json")))
    css = open(os.path.join(ROOT, "newsstand.css")).read()
    shelves = []
    for i, sh in enumerate(cfg.get("shelves") or ["The Rack"]):
        mags = [magazine(p) for p in cfg["papers"] if p.get("shelf", "The Rack") == sh]
        if i == len(cfg.get("shelves") or [1]) - 1:
            mags += ['<div class="mag mg-empty"><span class="mg-cover"><span class="mg-sold">SOLD OUT</span><small>Room on the rack for the next paper</small></span></div>'] * int(cfg.get("open_slots", 1))
        if mags:
            shelves.append('<section class="ns-shelf"><h2 class="ns-shelf-sign">%s</h2><div class="ns-rack">%s</div></section>' % (e(sh), "".join(mags)))
    x = cfg.get("extra") or {}
    extra = ('<a class="ns-extra" id="ns-extra" href="%s" hidden><b>EXTRA! EXTRA!</b><span class="ns-extra-head"></span><i>Read all about it ›</i></a>' % e(x.get("path", "/extra-extra/"))) if x else ""
    body = ('<div class="ns"><header class="ns-top"><div class="ns-sign"><span>NEWS</span><b>★ THE CORNER CHRONICLE ★</b><span>DAILY</span></div>'
            '<div class="ns-hi" id="ns-hi">Good morning, CAK3D</div><div class="ns-date" id="ns-date"></div><div class="ns-wx" id="ns-wx"></div></header>'
            '%s%s<footer class="ns-foot">%s</footer></div>'
            % (extra, "".join(shelves), " · ".join("%s — %s" % (e(p["name"]), e(p["when"])) for p in cfg["papers"])))
    doc = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
           '<title>The Corner Chronicle</title><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#3a2415">'
           '<link rel="icon" href="/icons/icon-192.png"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">'
           '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes">'
           '<link href="https://fonts.googleapis.com/css2?family=Rye&family=Abril+Fatface&family=Playfair+Display:wght@400;700&family=Josefin+Sans:wght@300;600&family=Bangers&family=Oswald:wght@400;600;700'
           '&family=Old+Standard+TT:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">'
           '<style>%s</style><script src="/app.js" defer></script></head><body class="ns-page">%s%s</body></html>' % (css, body, JS))
    os.makedirs(SITE, exist_ok=True)
    open(os.path.join(SITE, "index.html"), "w").write(doc)
    print("newsstand built: %d papers" % len(cfg["papers"]))


if __name__ == "__main__":
    main()
