#!/usr/bin/env python3
"""The mason jars on the kiosk's back shelf: the Garden's best moments, cured nightly from everything the papers printed.

  First Light Haze   firsts — every paper's first issue, new machines/apps joining The Green Thumb, first seeds grown
  Big Fix OG         the fixes that worked (Baked Goods recipes)
  Crash Cart Kush    close calls — Extra! Extra! editions and machines that went dark
  Front Page Purple  every Double Wide front page
  Belly Laugh Blue   the comic strips and the day's joke
  Payday Punch       each day's Employee of the Day from Payroll
  Keeper's Reserve   moments Ganja marks as keepers ("jar_moments" in her draft) and the punch-card milestones
Writes site/jars.json for kiosk.js."""
import datetime as dt, glob, json, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
GARDEN = os.path.dirname(ROOT)
DW = os.path.join(GARDEN, "doublewide")
PATHS = {"doublewide": "/double-wide/", "tip-sheet": "/dime-bags/"}


def load(p, d=None):
    try:
        return json.load(open(p))
    except Exception:
        return {} if d is None else d


def nice(d):
    try:
        return dt.date.fromisoformat(d[:10]).strftime("%b %-d, %Y")
    except Exception:
        return d


def main():
    drafts = sorted(glob.glob(os.path.join(DW, "drafts", "20??-??-??.json")))
    eds = [(os.path.basename(f)[:10], load(f)) for f in drafts]
    jars = [
        {"name": "First Light Haze", "color": "#6a9a3a", "blurb": "Firsts: first issues, first boots, first sprouts. Bright, uplifting, a little nostalgic.", "moments": []},
        {"name": "Big Fix OG", "color": "#3f7a2e", "blurb": "The fixes that actually worked, cured slow in the Garden kitchen.", "moments": []},
        {"name": "Crash Cart Kush", "color": "#5a3a7a", "blurb": "Close calls and outages. Heavy hitter — handle with care.", "moments": []},
        {"name": "Front Page Purple", "color": "#6a2a7a", "blurb": "Every front page The Double Wide ever rolled.", "moments": []},
        {"name": "Belly Laugh Blue", "color": "#2a5a7a", "blurb": "The funnies. Giggly, creative, great with snacks.", "moments": []},
        {"name": "Payday Punch", "color": "#7a6a1a", "blurb": "Employee of the Day, every day. Energizing.", "moments": []},
        {"name": "Keeper's Reserve", "color": "#1f5a3f", "blurb": "The top shelf: moments Ganja marked as keepers.", "moments": []}]
    J = {j["name"]: j["moments"] for j in jars}
    # firsts: each paper's first issue
    for d in sorted(glob.glob(os.path.join(GARDEN, "*", "site", "latest.json"))):
        l = load(d)
        folder = d.split(os.sep)[-3]
        iss = sorted(l.get("issues") or [])
        if iss:
            J["First Light Haze"].append({"date": nice(iss[0]), "paper": l.get("paper"), "title": "The first %s hit the rack" % l.get("paper"),
                                          "url": PATHS.get(folder, "/%s/" % folder)})
    for f in sorted(glob.glob(os.path.join(DW, "site", "data", "obits-*.json"))):
        o, day = load(f), os.path.basename(f)[6:16]
        for x in o.get("born") or []:
            J["First Light Haze"].append({"date": nice(day), "paper": "The Green Thumb", "title": "Welcome, %s" % x.get("name"),
                                          "text": "Joined %s." % (x.get("device") or "the Garden"), "url": "/green-thumb/"})
        for x in o.get("passed") or []:
            J["Crash Cart Kush"].append({"date": nice(day), "paper": "The Double Wide", "title": "Farewell, %s" % x.get("name"), "url": "/double-wide/"})
    for f in glob.glob(os.path.join(GARDEN, "seed-catalog", "site", "grow", "*.html")):
        J["First Light Haze"].append({"date": nice(dt.date.fromtimestamp(os.path.getmtime(f)).isoformat()), "paper": "The Seed Catalog",
                                      "title": "A seed sprouted: %s" % os.path.basename(f)[:-5].replace("-", " "), "url": "/seed-catalog/grow/" + os.path.basename(f)})
    for f in sorted(glob.glob(os.path.join(GARDEN, "baked-goods", "recipes", "*.json"))):
        r = load(f)
        J["Big Fix OG"].append({"date": nice(r.get("date", "")), "paper": "Baked Goods", "title": r.get("title"), "text": r.get("fixes") or r.get("what") or "", "url": "/baked-goods/"})
    ex = load(os.path.join(GARDEN, "extra-extra", "site", "latest.json"))
    for i in ex.get("issues") or []:
        J["Crash Cart Kush"].append({"date": nice(i[:10]), "paper": "Extra! Extra!", "title": "EXTRA! special edition %s" % i[11:], "url": "/extra-extra/issues/%s.html" % i})
    if ex.get("title"):
        J["Crash Cart Kush"][-1:] = [dict(J["Crash Cart Kush"][-1], title="EXTRA! " + ex["title"])] if J["Crash Cart Kush"] else []
    for day, ed in eds:
        h = ed.get("headline") or {}
        if h.get("title"):
            J["Front Page Purple"].append({"date": nice(day), "paper": "The Double Wide", "title": h["title"], "text": h.get("dek", ""),
                                           "url": "/double-wide/editions/%s.html" % day})
        fun = ed.get("funnies") or {}
        for s in fun.get("strips") or []:
            if isinstance(s, dict):
                J["Belly Laugh Blue"].append({"date": nice(day), "paper": "The Funnies", "title": "%s %s" % (s.get("title", ""), s.get("byline", "")), "url": "/sunday-smoke/funnies.html"})
        if fun.get("joke"):
            J["Belly Laugh Blue"].append({"date": nice(day), "paper": "The Double Wide", "title": "Joke of the day", "text": fun["joke"]})
        for m in ed.get("jar_moments") or []:
            if isinstance(m, dict) and m.get("title"):
                J["Keeper's Reserve"].append({"date": nice(day), "paper": "Ganja's pick", "title": m["title"], "text": m.get("text", ""), "url": m.get("url") or "/double-wide/editions/%s.html" % day})
    for f in sorted(glob.glob(os.path.join(DW, "site", "data", "payroll-20*.json"))):
        rows = load(f).get("rows") or []
        if rows:
            top = max(rows, key=lambda r: r.get("today") or 0)
            J["Payday Punch"].append({"date": nice(os.path.basename(f)[8:18]), "paper": "Payroll", "title": "Employee of the Day: %s" % top.get("agent"),
                                      "text": "Grade %s · %s Garden Bucks" % (top.get("grade", "?"), top.get("today")), "url": "/double-wide/"})
    punch = load(os.path.join(ROOT, "private", "punch.json"))
    for r in punch.get("rewards") or []:
        n, day = r.split("-", 1)
        J["Keeper's Reserve"].append({"date": nice(day), "paper": "Regular's Card", "title": "CAK3D hit a %s-day reading streak" % n})
    for j in jars:
        j["moments"] = list(reversed(j["moments"]))[:60]
    json.dump({"built": dt.datetime.now().isoformat(timespec="seconds"), "jars": jars}, open(os.path.join(ROOT, "site", "jars.json"), "w"), ensure_ascii=False)
    print("jars cured:", ", ".join("%s %d" % (j["name"], len(j["moments"])) for j in jars))


if __name__ == "__main__":
    main()
