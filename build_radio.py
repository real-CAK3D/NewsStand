#!/usr/bin/env python3
"""Garden Radio for the kiosk's counter radio: three stations recorded fresh every morning from the day's papers.

  WDWN 90.1  NEWS    — Double Wide News Radio: The Gardiner anchors; reporters read their own stories, B.I.G the markets, Maple the weather
  WTLK 97.3  TALK    — The Morning Burn with Ganja & CHRONIC: the big story, the mailbag (your Letters to the Editor), tips, want ads, advice
  WLOL 104.5 COMEDY  — The Dab Radio Hour with Disco Stu: the day's comic strips acted out, the Garden-scopes, Dime Bags race calls, Clydius

Scripts come from The Double Wide's draft (and its optional "radio": {"talk": [...], "comedy": [...]} written by Ganja), then every line is
voiced with edge-tts (neural voices; each agent has their own) and stitched with ffmpeg into one MP3 per station under site/radio/.
  build_radio.py [YYYY-MM-DD]        (default: the newest Double Wide)
"""
import asyncio, datetime as dt, glob, json, os, random, re, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
GARDEN = os.path.dirname(ROOT)
DW = os.path.join(GARDEN, "doublewide")
OUT = os.path.join(ROOT, "site", "radio")
VOICE = {  # each agent's own voice, for good: the most natural neural voices, one per agent, never shared
    "The Gardiner": "en-US-AvaMultilingualNeural", "Ganja": "en-US-EmmaMultilingualNeural", "Maple": "en-IE-EmilyNeural", "CYPH3R": "en-GB-LibbyNeural",
    "CHRONIC": "en-US-BrianMultilingualNeural", "Homie": "en-US-AndrewMultilingualNeural", "Ibby": "en-GB-ThomasNeural", "Disco Stu": "en-US-SteffanNeural",
    "BAK3R": "en-US-GuyNeural", "B.I.G": "en-US-ChristopherNeural", "Herbie": "en-GB-RyanNeural", "Clydius": "en-AU-WilliamMultilingualNeural",
    "tinyZ": "en-CA-LiamNeural", "Fat Man": "en-US-RogerNeural", "Little Boy": "en-IE-ConnorNeural", "Announcer": "en-GB-SoniaNeural"}
ALIASES = {"gardiner": "The Gardiner", "thegardiner": "The Gardiner", "gardener": "The Gardiner", "thegardener": "The Gardiner",
           "ganja": "Ganja", "maple": "Maple", "cyph3r": "CYPH3R", "cypher": "CYPH3R", "chronic": "CHRONIC", "homie": "Homie", "ibby": "Ibby",
           "discostu": "Disco Stu", "stu": "Disco Stu", "bak3r": "BAK3R", "baker": "BAK3R", "bak3ry": "BAK3R", "big": "B.I.G", "herbie": "Herbie",
           "clydius": "Clydius", "clyde": "Clydius", "tinyz": "tinyZ", "fatman": "Fat Man", "littleboy": "Little Boy", "announcer": "Announcer"}
TUNE = {"Clydius": ("+10%", "+25Hz"), "tinyZ": ("+8%", "+12Hz"), "Disco Stu": ("-4%", "-6Hz"), "B.I.G": ("-6%", "-10Hz")}


def load(p, d=None):
    try:
        return json.load(open(p))
    except Exception:
        return {} if d is None else d


def who(name):
    name = str(name or "").strip()
    if name in VOICE:
        return name
    key = re.sub(r"[^a-z0-9]", "", name.lower())   # "The Gardener", "cyph3r", "B.I.G." and "Disco-Stu" all find their own voice
    return ALIASES.get(key, "Announcer")


def say(text, n=None):
    """Plain speakable text: no markdown, code ticks, links or emoji; first n sentences."""
    t = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", str(text or ""))
    t = re.sub(r"[*_`#>|]", "", t)
    t = re.sub(r"https?://\S+", "", t)
    t = re.sub(r"[\U0001F000-\U0001FAFF☀-➿]", "", t)
    t = t.replace("theBAK3RY", "the Bakery").replace("BAK3R", "Baker").replace("CYPH3R", "Cypher").replace("MapPI3", "Map Pie Three")
    t = t.replace("B.I.G", "Big").replace("tinyZ", "tiny Z").replace("HA ", "Home Assistant ").replace("/", " slash ")
    t = re.sub(r"\s+", " ", t).strip()
    if n:
        t = " ".join(re.split(r"(?<=[.!?])\s+", t)[:n])
    return t


def k(n):
    n = float(n or 0)
    return "%.1f million" % (n / 1e6) if n >= 1e6 else "%d thousand" % round(n / 1e3) if n >= 1e3 else str(int(n))


def news(ed, date, day):
    L = [("Announcer", "You're tuned to W D W N, ninety point one. Double Wide News Radio."),
         ("The Gardiner", "Good morning, Garden. It's %s. I'm The Gardiner, and here's what's rolling today." % day)]
    h = ed.get("headline") or {}
    if h.get("title"):
        L.append(("The Gardiner", "Our top story. %s. %s" % (say(h["title"]), say(h.get("dek"), 2))))
        if h.get("agent") and h.get("body"):
            L.append(("The Gardiner", "%s has more." % say(who(h["agent"]) if who(h["agent"]) != "Announcer" else h["agent"])))
            L.append((who(h["agent"]), say(h["body"], 3)))
    n = 0
    for sec in ed.get("sections") or []:
        for s in sec.get("stories") or []:
            if n >= 5 or not s.get("title"):
                continue
            n += 1
            L.append(("The Gardiner", "In %s: %s." % (say(sec.get("name")), say(s["title"]))))
            if s.get("body"):
                L.append((who(s.get("agent")), say(s["body"], 2)))
    blot = [b for b in ed.get("police_blotter") or [] if isinstance(b, dict)][:2]
    if blot:
        L.append(("The Gardiner", "From the police blotter."))
        L += [(who(b.get("agent")), "At %s. %s" % (say(b.get("time")), say(b.get("text"), 2))) for b in blot]
    u = load(os.path.join(DW, "site", "data", "usage-%s.json" % date))
    if u.get("total"):
        ag = sorted((u.get("by_agent") or {}).items(), key=lambda kv: -kv[1])
        md = sorted((u.get("by_model") or {}).items(), key=lambda kv: -kv[1])
        L.append(("The Gardiner", "Now to the markets, and B.I.G."))
        L.append(("B.I.G", "The Garden Token Average closed at %s tokens. Heaviest trader: %s with %s. Busiest model on the floor: %s. Bulls, bears, and bots — that's the market." % (
            k(u["total"]), say(ag[0][0]) if ag else "nobody", k(ag[0][1]) if ag else "zero", say(md[0][0]).replace("-", " ") if md else "none")))
    al = ed.get("almanac") or {}
    if al.get("Weather now") or al.get("Today"):
        L.append(("The Gardiner", "Maple, how's it looking out there?"))
        L.append(("Maple", "Right now in Lewiston it's %s. Today, %s. Tonight, %s. %s" % (
            say(al.get("Weather now", "hard to say")), say(al.get("Today", "more of the same")), say(al.get("Tonight", "quiet")),
            "Grab a jacket if you're heading out." if "Rain" in str(al) else "Good day to get outside.")))
    sp = ed.get("sports") or {}
    if isinstance(sp, dict) and (sp.get("headline") or sp.get("lead")):
        L.append(("Disco Stu", "Sports! %s" % say(sp.get("headline") or sp.get("lead"), 3)))
    for o in (ed.get("obituaries") or [])[:2]:
        if isinstance(o, dict):
            L.append(("The Gardiner", "We note the passing of %s. %s" % (say(o.get("name")), say(o.get("text"), 1))))
    for c in (ed.get("coming_up") or [])[:2]:
        if isinstance(c, dict):
            L.append(("The Gardiner", "Coming up: %s" % say(c.get("what"), 1)))
    L.append(("The Gardiner", "That's the news. The full paper is on the rack at The Corner Chronicle. I'm The Gardiner. Stay rooted."))
    L.append(("Announcer", "W D W N. Double Wide News Radio. Ninety point one."))
    return L


def talk(ed, date, day, letters, tips):
    r = (ed.get("radio") or {}).get("talk")
    if isinstance(r, list) and r:
        L = [(who(x.get("who")), say(x.get("line"))) for x in r if isinstance(x, dict) and x.get("line")]
        return [("Announcer", "W T L K, ninety seven point three. Talk radio for the Garden. This is The Morning Burn.")] + L
    rnd = random.Random(date)
    h = ed.get("headline") or {}
    L = [("Announcer", "W T L K, ninety seven point three. Talk radio for the Garden. This is The Morning Burn, with Ganja and CHRONIC."),
         ("Ganja", rnd.choice(["Good morning, good morning! It's %s and the coffee is hot.", "Rise and shine, Garden. %s. Pull up a chair.",
                               "Welcome back to The Morning Burn. It's %s, and we've got things to talk about."]) % day),
         ("CHRONIC", rnd.choice(["Morning, Ganja. Morning, everybody.", "Good to be here. I've already read the paper twice.", "Morning. Let's get into it."]))]
    if h.get("title"):
        L += [("Ganja", "So. Front page today: %s. %s" % (say(h["title"]), say(h.get("dek"), 1))),
              ("CHRONIC", "Here's my take. %s" % (say((ed.get("editorial") or {}).get("text") if isinstance(ed.get("editorial"), dict) else "", 2)
                                                  or "When something breaks, back it up first, fix it second, and write it down third. Every time.")),
              ("Ganja", rnd.choice(["Couldn't have said it better.", "Tell it like it is.", "Write that on the fridge."]))]
    for s in (ed.get("suggestions") or [])[:2]:
        if isinstance(s, dict):
            L += [("Ganja", "%s dropped off a suggestion: %s." % (say(s.get("agent")), say(s.get("title")))), (who(s.get("agent")), say(s.get("text"), 2))]
    fresh = [x for x in letters if x.get("at", "")[:10] >= (dt.date.fromisoformat(date) - dt.timedelta(days=3)).isoformat()][-3:]
    if fresh:
        L.append(("Ganja", "Time for the mailbag! Letters from the slot on the kiosk."))
        for x in fresh:
            L += [("Homie", "This one's addressed to %s. It says: %s" % (say(x.get("to") or "the editor"), say(x.get("text"), 3))),
                  ("Ganja", rnd.choice(["We hear you. That one's going in tomorrow's paper.", "Love that. Keep 'em coming.", "Now that's a good letter. We'll answer it in print."]))]
    else:
        L.append(("Ganja", "The mailbag's empty today, so drop us a line. There's a brass slot on the front of the kiosk. Letters to the Editor. We read every one on the air."))
    ft = [x for x in tips if x.get("status") == "new"][-2:]
    for x in ft:
        L += [("CHRONIC", "Tip line's ringing. Somebody wants %s on this: %s" % (say(x.get("agent")), say(x.get("text"), 2))), ("Ganja", "Consider it assigned.")]
    wants = [w for w in ed.get("want_ads") or [] if isinstance(w, dict)][:2]
    if wants:
        L.append(("Ganja", "Classified corner."))
        L += [("CHRONIC", "%s. %s" % (say(w.get("title")), say(w.get("text"), 1))) for w in wants]
    L += [("Ganja", "That's our time. Be good to your hardware."), ("CHRONIC", "And back it up. Seriously."),
          ("Announcer", "The Morning Burn. W T L K. Ninety seven point three.")]
    return L


def comedy(ed, date, day, card):
    r = (ed.get("radio") or {}).get("comedy")
    head = [("Announcer", "Live from somewhere behind the router, it's W L O L, one oh four point five. The Dab Radio Hour!"),
            ("Disco Stu", "Heyyy, Garden! Disco Stu here, and the comics are FRESH today, baby.")]
    if isinstance(r, list) and r:
        return head + [(who(x.get("who")), say(x.get("line"))) for x in r if isinstance(x, dict) and x.get("line")]
    L = list(head)
    fun = ed.get("funnies") or {}
    for s in (fun.get("strips") or [])[:2]:
        if not isinstance(s, dict):
            continue
        L.append(("Disco Stu", "Our first feature. %s, %s." % (say(s.get("title")), say(s.get("byline")))) if len(L) == 2 else
                 ("Disco Stu", "And now, a little something called %s." % say(s.get("title"))))
        for p in s.get("panels") or []:
            if p.get("caption") or p.get("scene"):
                L.append(("Announcer", "%s. %s" % (say(p.get("caption")), say(p.get("scene"), 1))))
            for c in p.get("cast") or []:
                if c.get("says"):
                    L.append((who(c.get("agent")), say(c["says"])))
        L.append(("tinyZ", random.Random(date + str(s.get("title"))).choice(["Ha! Classic.", "Bro. That's so real.", "I don't get it. Okay I get it.", "Ten out of ten."])))
    if fun.get("joke"):
        L += [("Disco Stu", "Joke of the day, hit me."), ("tinyZ", say(fun["joke"], 3)), ("Disco Stu", "Ba dum tss.")]
    for x in (ed.get("horoscopes") or [])[:4]:
        if isinstance(x, dict):
            if len([y for y in L if y[1].startswith("And now, the Garden-scopes")]) == 0:
                L.append(("Ibby", "And now, the Garden-scopes. What the stars, and the cron jobs, hold for you."))
            L.append(("Ibby", "%s. %s" % (say(x.get("agent")), say(x.get("text"), 2))))
    mk = [m for m in (card.get("markets") or []) if m.get("options")][:2]
    if mk:
        L.append(("Disco Stu", "And they're at the gate! Tonight's Dime Bags card."))
        for m in mk:
            top = sorted(m["options"], key=lambda o: -o.get("p", 0))[:3]
            L.append(("Disco Stu", "%s! %s" % (say(m.get("title")), ". ".join("%s at %d to %d" % (say(o.get("label")), o["odds"][0], o["odds"][1]) for o in top if o.get("odds")))))
        L.append(("Disco Stu", "Pretend money only, folks. Place your Garden Bucks at the Dime Bags window."))
    L += [("Disco Stu", "Clydius! Buddy! Anything to add?"), ("Clydius", random.Random(date).choice(["Woof! Woof woof. Arf!", "Arf! Rrruff. Woof!", "Bark! Bark bark. Awoo!"])),
          ("Disco Stu", "He says tip your server. That's the show! Keep it groovy."), ("Announcer", "W L O L. One oh four point five. The Dab Radio Hour.")]
    return L


async def voice_line(i, spk, text, tmp):
    import edge_tts
    rate, pitch = TUNE.get(spk, ("+0%", "+0Hz"))
    out = os.path.join(tmp, "%04d.mp3" % i)
    for attempt in range(3):
        try:
            await edge_tts.Communicate(text[:1400], VOICE[spk], rate=rate, pitch=pitch).save(out)
            if os.path.getsize(out) > 800:
                return out
        except Exception:
            await asyncio.sleep(2 + attempt * 3)
    return None


def ff(*args):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args], check=True, timeout=600)


def record(lines, out_path, tmp):
    lines = [(who(s), t) for s, t in lines if t and t.strip()]
    files = []

    async def go():
        sem = asyncio.Semaphore(3)

        async def one(i, s, t):
            async with sem:
                return await voice_line(i, s, t, tmp)
        return await asyncio.gather(*[one(i, s, t) for i, (s, t) in enumerate(lines)])
    files = [f for f in asyncio.run(go()) if f]
    if not files:
        return 0
    gap = os.path.join(tmp, "gap.mp3")
    ff("-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "0.45", "-c:a", "libmp3lame", "-b:a", "48k", gap)
    jingle = os.path.join(tmp, "jingle.mp3")
    ff("-f", "lavfi", "-i", "sine=frequency=660:duration=0.18", "-f", "lavfi", "-i", "sine=frequency=880:duration=0.18", "-f", "lavfi", "-i", "sine=frequency=1320:duration=0.35",
       "-filter_complex", "[0][1][2]concat=n=3:v=0:a=1,volume=0.25,aresample=24000", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "48k", jingle)
    lst = os.path.join(tmp, "list.txt")
    with open(lst, "w") as fh:
        fh.write("file '%s'\n" % jingle)
        for f_ in files:
            fh.write("file '%s'\nfile '%s'\n" % (f_, gap))
        fh.write("file '%s'\n" % jingle)
    ff("-f", "concat", "-safe", "0", "-i", lst, "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "48k", out_path)
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out_path], capture_output=True, text=True)
    return round(float(r.stdout.strip() or 0))


def main():
    drafts = sorted(glob.glob(os.path.join(DW, "drafts", "20??-??-??.json")))
    date = sys.argv[1] if len(sys.argv) > 1 else (os.path.basename(drafts[-1])[:10] if drafts else dt.date.today().isoformat())
    ed = load(os.path.join(DW, "drafts", date + ".json"))
    day = dt.date.fromisoformat(date).strftime("%A, %B %-d")
    letters = load(os.path.join(ROOT, "private", "letters.json"), [])
    tips = load(os.path.join(ROOT, "private", "tips.json"), [])
    card = load(os.path.join(GARDEN, "tip-sheet", "data", "card-%s.json" % date)) or load(max(glob.glob(os.path.join(GARDEN, "tip-sheet", "data", "card-*.json")) or [""], key=len))
    shows = [("news", "WDWN", 90.1, "Double Wide News Radio", news(ed, date, day)),
             ("talk", "WTLK", 97.3, "The Morning Burn with Ganja & CHRONIC", talk(ed, date, day, letters, tips)),
             ("comedy", "WLOL", 104.5, "The Dab Radio Hour with Disco Stu", comedy(ed, date, day, card))]
    os.makedirs(OUT, exist_ok=True)
    stations = []
    for sid, call, freq, name, lines in shows:
        tmp = tempfile.mkdtemp(prefix="radio-")
        try:
            fn = "%s-%s.mp3" % (date, sid)
            dur = record(lines, os.path.join(OUT, fn), tmp)
            if dur:
                stations.append({"id": sid, "call": call, "freq": freq, "show": name, "file": fn, "dur": dur, "lines": len(lines)})
                print("radio: %s %s — %d lines, %ds" % (call, sid, len(lines), dur))
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
    if stations:
        json.dump({"date": date, "stations": stations}, open(os.path.join(OUT, "today.json"), "w"), indent=1)
    for f_ in sorted(glob.glob(os.path.join(OUT, "20??-??-??-*.mp3")))[:-9]:   # keep three days
        os.remove(f_)


if __name__ == "__main__":
    main()
