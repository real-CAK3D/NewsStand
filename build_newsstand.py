#!/usr/bin/env python3
"""Build The Corner Chronicle — the Garden's one home-screen app, drawn as a street-corner newsstand kiosk (after a Bryant Park kiosk):
a green awning with the sign, the open service window with the counter (radio, ashtray, register with the ticker tape, the punch card,
the tip-line payphone), the back shelf of mason jars (the Garden's best moments) and seed packets, the mail slot, the Scrapbook drawer,
the stash box in the lower right — and every paper's front cover in the racks across the front and up both sides.
papers.json says which paper goes where (side: front | left | right). Live bits (dates, badges, radio, counter) come from kiosk.js.
Room for more papers: add them to papers.json."""
import datetime as dt, glob, html, json, os, sys

import kiosk_art as art
import kiosk_data

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(ROOT, "site")
e = lambda s: html.escape(str(s or ""))
SEAL = ('<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" stroke-width="5"/>'
        '<path d="M24 78h72v-22l-36-18-36 18z" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>'
        '<rect x="36" y="60" width="14" height="18" fill="currentColor"/><rect x="62" y="60" width="20" height="10" fill="currentColor"/>'
        '<path d="M74 38c4-8 12-8 10-16M82 36c6-6 12-4 12-12" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>')
JARS = [("First Light Haze", "#7fb24a", "#c9e39a"), ("Big Fix OG", "#4f8a3a", "#a8d27a"), ("Crash Cart Kush", "#6a4a8a", "#b99bd8"),
        ("Front Page Purple", "#7a3a8a", "#d09be0"), ("Belly Laugh Blue", "#3a6a8a", "#9bc8e0"), ("Payday Punch", "#8a7a2a", "#e0d27a"),
        ("Keeper's Reserve", "#2f6b4f", "#8fd1b0")]


def magazine(p):
    """A small copy of the paper's own front cover, standing in the rack (with a ☆ to choose whether it rings this phone)."""
    name = e(p["name"])
    if name.startswith("The "):
        name = '<small>The</small>' + name[4:]
    return ('<div class="mag-slot"><a class="mag mg-%s" data-id="%s" href="%s"><span class="mg-badge" aria-label="new issues"></span><span class="mg-cover">'
            '<span class="mg-gum">%s</span>'
            '<span class="mg-top"><span class="mg-seal">%s</span><span class="mg-ear"><span class="mg-dow"></span><b class="mg-md"></b></span></span>'
            '<span class="mg-flag">%s</span><span class="mg-motto">%s</span><span class="mg-art"></span>'
            '<span class="mg-band">%s</span><span class="mg-head"></span><span class="mg-lines"></span>'
            '<span class="mg-foot"><span>%s</span><span>%s</span></span></span></a>'
            '<button type="button" class="mag-star" data-id="%s" aria-label="Notices for %s" title="Ring my phone for %s">★</button></div>'
            % (e(p["look"]), e(p["id"]), e(p["path"]), e(p.get("gum")), SEAL, name, e(p.get("motto")),
               "".join("<i>%s</i>" % e(b) for b in p.get("band") or []), e(p["when"]), "PRICE: " + e(p.get("price")), e(p["id"]), e(p["name"]), e(p["name"])))


def rack(papers, sign, cls):
    return ('<div class="k-rack %s"><div class="k-rack-sign">%s</div><div class="k-rack-grid">%s</div></div>'
            % (cls, e(sign), "".join(magazine(p) for p in papers)))


def main():
    cfg = json.load(open(os.path.join(ROOT, "papers.json")))
    css = open(os.path.join(ROOT, "newsstand.css")).read()
    side = lambda s: [p for p in cfg["papers"] if p.get("side", "front") == s]
    x = cfg.get("extra") or {}
    extra = ('<a class="ns-extra" id="ns-extra" href="%s" hidden><b>EXTRA! EXTRA!</b><span class="ns-extra-head"></span><i>Read all about it ›</i></a>'
             % e(x.get("path", "/extra-extra/"))) if x else ""
    jars = "".join('<button type="button" class="k-jar" data-jar="%d" aria-label="%s jar">%s<span class="k-jar-label">%s</span></button>'
                   % (i, e(n), art.jar(c, b, n, i), e(n).replace(" ", "<br>", 1)) for i, (n, c, b) in enumerate(JARS))
    sold = '<div class="mag-slot"><div class="mag mg-empty"><span class="mg-cover"><span class="mg-sold">SOLD OUT</span><small>Room on the rack for the next paper</small></span></div></div>'
    anchors = os.path.join(ROOT, "scene_anchors.json")
    if os.path.exists(anchors) and "--css-kiosk" not in sys.argv:   # the Blender-rendered kiosk (scene/*.jpg) with the live layer mapped on top
        tpls = "".join('<template id="tpl-mag-%s">%s</template>' % (e(p["id"]), magazine(p)) for p in cfg["papers"])
        papers = {s_: [p["id"] for p in side(s_)] for s_ in ("front", "left", "right")}
        body = ('<div class="k-scenes" id="k-scenes"></div>%s'
                '<template id="ns-extra-tpl" data-href="%s"><b>EXTRA! EXTRA!</b><span class="ns-extra-head"></span><i>Read all about it ›</i></template>'
                '<div class="k-newsroll" id="k-newsroll" aria-hidden="true">%s</div><div class="k-toast" id="k-toast" role="status" aria-live="polite"></div>'
                '<template id="tpl-knife">%s</template><template id="tpl-seal">%s</template>'
                '<script>window.SCENE=%s;window.SCENE_PAPERS=%s;window.RADIO_STATIONS=%s;</script>'
                % (tpls, e(x.get("path", "/extra-extra/")), art.NEWSROLL, art.KNIFE.replace("@@SEAL@@", SEAL), SEAL, open(anchors).read(), json.dumps(papers),
                   json.dumps(kiosk_data.stations())))
        ver = dt.datetime.now().strftime("%Y%m%d%H%M")   # a new build busts the browser's copy of every script
        scripts = ''.join('<script src="/%s?v=%s" defer></script>' % (f, ver) for f in ("app.js", "scene.js", "kiosk.js", "radio.js", "tv.js", "stash.js", "pos.js", "weather.js"))
    else:
        body = css_kiosk(cfg, side, extra, jars, sold)
        scripts = '<script src="/app.js" defer></script><script src="/kiosk.js" defer></script><script src="/radio.js" defer></script>'
    doc = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
           '<title>The Corner Chronicle</title><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#1f4d3a">'
           '<link rel="icon" href="/icons/house-192.png"><link rel="apple-touch-icon" href="/icons/house-180.png">'
           '<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes">'
           '<link href="https://fonts.googleapis.com/css2?family=Rye&family=Abril+Fatface&family=Playfair+Display:wght@400;700&family=Josefin+Sans:wght@300;600'
           '&family=Bangers&family=Oswald:wght@400;600;700&family=Special+Elite&family=Permanent+Marker&family=Old+Standard+TT:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">'
           '<style>%s</style>%s</head><body class="ns-page kiosk">%s</body></html>' % (css, scripts, body))
    os.makedirs(SITE, exist_ok=True)
    open(os.path.join(SITE, "index.html"), "w").write(doc)
    stash_tools()
    kiosk_data.write_all()
    print("newsstand built: %d papers on the kiosk" % len(cfg["papers"]))


def css_kiosk(cfg, side, extra, jars, sold):
    """The first kiosk, drawn in CSS/SVG (kept as the fallback: build_newsstand.py --css-kiosk)."""
    return f'''
<div class="k-sky" aria-hidden="true"><div class="k-sun"></div><div class="k-tower"></div><div class="k-tower t2"></div><div class="k-fx" id="k-fx"></div></div>
<div class="k">
 <header class="k-roof">
  <div class="k-awning-top"></div>
  <div class="k-fascia"><span class="k-fascia-side">NEWS</span><h1>★ The Corner Chronicle ★</h1><span class="k-fascia-side">DAILY</span></div>
  <div class="k-marquee"><span id="ns-hi">Good morning, CAK3D</span><span class="k-dot">·</span><span id="ns-date"></span><span class="k-dot">·</span><span id="ns-wx"></span></div>
  <div class="k-decor" id="k-decor" aria-hidden="true"></div>
 </header>
 {extra}
 <div class="k-body">
  <section class="k-side k-left" aria-label="Left side of the kiosk">
   <div class="k-line" id="k-zines" aria-label="Zines on the line"><span class="k-line-cord"></span></div>
   {rack(side("left"), "MONTHLIES", "rk-left")}
  </section>
  <section class="k-front" aria-label="The kiosk window">
   <div class="k-window">
    <div class="k-light" aria-hidden="true"></div>
    <div class="k-shelf k-shelf-jars"><div class="k-shelf-sign">THE GARDEN'S BEST · BY THE JAR</div><div class="k-jars">{jars}</div></div>
    <div class="k-shelf k-shelf-seeds"><div class="k-shelf-sign">FRESH SEEDS · SEE THE CATALOG</div><div class="k-seeds" id="k-seeds"><a class="k-seed-more" href="/seed-catalog/">The Seed Catalog ›</a></div></div>
    <div class="k-punch" id="k-punch" role="button" tabindex="0" aria-label="Your punch card"><div class="k-punch-h">REGULAR'S CARD</div><div class="k-punch-holes" id="k-punch-holes"></div><div class="k-punch-f" id="k-punch-f">Read a paper to get punched</div></div>
    <div class="k-counter">
     <div class="k-item k-radio" id="k-radio">{art.RADIO}
      <div class="rd-ctl"><button type="button" class="rd-b rd-pow" data-r="power" aria-label="Radio on or off">⏻</button><button type="button" class="rd-b" data-r="down" aria-label="Tune down">◀</button>
       <button type="button" class="rd-b" data-r="up" aria-label="Tune up">▶</button><button type="button" class="rd-b" data-r="vdown" aria-label="Volume down">−</button><button type="button" class="rd-b" data-r="vup" aria-label="Volume up">+</button></div>
      <div class="rd-now" id="rd-now">Tap ⏻ for the radio</div></div>
     <button type="button" class="k-item k-ash" id="k-ash" aria-label="The ashtray">{art.ASHTRAY}</button>
     <div class="k-item k-register" id="k-register"><div class="rg-disp" id="rg-disp">OPEN</div>{art.REGISTER}<div class="rg-tape"><div class="rg-tape-in" id="rg-tape">THE GARDEN TOKEN AVERAGE · loading…</div></div></div>
     <button type="button" class="k-item k-phone" id="k-phone" aria-label="The tip line">{art.PAYPHONE}</button>
    </div>
   </div>
   <div class="k-ledge"></div>
   <div class="k-under">
    <button type="button" class="k-drawer" id="k-drawer" aria-label="Your Scrapbook drawer"><span class="k-drawer-h"></span><b>SCRAPBOOK</b><i id="k-drawer-n"></i></button>
    <button type="button" class="k-mail" id="k-mail" aria-label="Letters to the Editor"><span class="k-mail-slot"></span><b>LETTERS TO THE EDITOR</b></button>
    <button type="button" class="k-search" id="k-search" aria-label="Search every paper">🔎 <b>Search every paper</b></button>
   </div>
   {rack(side("front"), "TODAY'S PAPERS", "rk-front")}
   <button type="button" class="k-stash" id="k-stash" aria-label="Your stash box">{art.STASHBOX}<span class="k-stash-tag">your stash</span></button>
  </section>
  <section class="k-side k-right" aria-label="Right side of the kiosk">
   {rack(side("right"), "BOOKS", "rk-right")}
   <div class="k-rack-grid k-sold">{sold * int(cfg.get("open_slots", 1))}</div>
  </section>
 </div>
 <div class="k-sidewalk"><div class="k-curb"></div></div>
</div>
<div class="k-newsroll" id="k-newsroll" aria-hidden="true">{art.NEWSROLL}</div>
<div class="k-toast" id="k-toast" role="status" aria-live="polite"></div>
<template id="tpl-knife">{art.KNIFE.replace("@@SEAL@@", SEAL)}</template>
'''


def stash_tools():
    """The pocket knife's blades (stash.seed.json) plus the last few weeks of B.I.G's Fresh Finds (drafts/stash-fresh-*.json)."""
    tools = json.load(open(os.path.join(ROOT, "stash.seed.json")))
    fresh = []
    for f in sorted(glob.glob(os.path.join(ROOT, "drafts", "stash-fresh-*.json")), reverse=True)[:4]:
        try:
            d = json.load(open(f))
        except Exception:
            continue
        fresh += [dict(x, date=d.get("date", "")) for x in d.get("finds") or [] if isinstance(x, dict) and x.get("title")]
    tools["fresh"] = fresh[:24]
    json.dump(tools, open(os.path.join(SITE, "stash-tools.json"), "w"), ensure_ascii=False)


if __name__ == "__main__":
    main()
