"""Data the kiosk's props read, built with the page: the radio dial (public part of radio_stations.json), today's tear-off flyer above the
payphone, the little TV's lineup, and the keyring in the stash box (web links from The Green Thumb — no passwords, never)."""
import datetime as dt, glob, json, os, random, subprocess

ROOT = os.path.dirname(os.path.abspath(__file__))
GARDEN = os.path.dirname(ROOT)
SITE = os.path.join(ROOT, "site")
VAULT_GT = "/home/ubuntu/CAK3D_Garden_Wiki/00_Command/The Green Thumb.json"
CARTOONS = [  # public-domain classics from the Internet Archive's classic_cartoons collection: (identifier, file, seconds, title)
    ("popeye_taxi-turvey", "popeye_taxi-turvey_512kb.mp4", 363, "Popeye: Taxi-Turvy (1954)"),
    ("Betty_Boop_for_President_1932", "Betty_Boop_for_President_1932_512kb.mp4", 390, "Betty Boop for President (1932)"),
    ("superman_the_mechanical_monsters", "superman_the_mechanical_monsters_512kb.mp4", 615, "Superman: The Mechanical Monsters (1941)"),
    ("woody_woodpecker_pantry_panic", "woody_woodpecker_pantry_panic_512kb.mp4", 411, "Woody Woodpecker: Pantry Panic (1941)"),
    ("felix_the_cat_the_goos_that_laid_the_golden_egg", "felix_the_cat_the_goos_that_laid_the_golden_egg_512kb.mp4", 429, "Felix the Cat: The Goose That Laid the Golden Egg (1936)"),
    ("popeye_i_dont_scare", "popeye_i_dont_scare_512kb.mp4", 366, "Popeye: I Don't Scare (1956)"),
    ("bb_minnie_the_moocher", "bb_minnie_the_moocher_512kb.mp4", 466, "Betty Boop: Minnie the Moocher (1932)"),
    ("mighty_mouse_wolf_wolf", "mighty_mouse_wolf_wolf_512kb.mp4", 372, "Mighty Mouse: Wolf! Wolf!"),
    ("popeye_private_eye_popeye", "popeye_private_eye_popeye_512kb.mp4", 393, "Private Eye Popeye (1954)"),
    ("noveltoon_the_stupidstitious_cat", "noveltoon_the_stupidstitious_cat_512kb.mp4", 380, "Noveltoon: The Stupidstitious Cat (1946)"),
    ("little_lulu_bargain_counter_attack", "little_lulu_bargain_counter_attack_512kb.mp4", 454, "Little Lulu: Bargain Counter Attack (1946)"),
    ("JackFrost_", "JackFrost_512kb.mp4", 511, "Jack Frost (1934)")]

MTV = [  # official uploads, embedded from YouTube (the artists' own channels): (video id, seconds, artist, title, album)
    ("2_iOA1_MXI4", 171, "Ghostemane", "Flesh", "ANTI-ICON (2020)"),
    ("PBwAxmrE194", 242, "Wu-Tang Clan", "C.R.E.A.M.", "Enter the Wu-Tang (36 Chambers) (1993)"),
    ("XSbZidsgMfw", 185, "Tyler, The Creator", "Yonkers", "Goblin (2011)"),
    ("ia8xqNWa0eY", 172, "Pouya & Ghostemane", "1000 Rounds", ""),
    ("R0IUR4gkPIE", 289, "Wu-Tang Clan", "Protect Ya Neck", "Enter the Wu-Tang (36 Chambers) (1993)"),
    ("HmAsUQEFYGI", 266, "Tyler, The Creator", "EARFQUAKE", "IGOR (2019)"),
    ("N3XbZvD3lRo", 176, "Ghostemane", "AI", "ANTI-ICON (2020)"),
    ("bITlCIwN9Zw", 210, "Pouya", "Suicidal Thoughts in the Back of the Cadillac", ""),
    ("cPRKsKwEdUQ", 377, "Wu-Tang Clan ft. Cappadonna", "Triumph", "Wu-Tang Forever (1997)"),
    ("TGgcC5xg9YI", 203, "Tyler, The Creator ft. Kali Uchis", "See You Again", "Flower Boy (2017)")]
ADS = [  # vintage commercials from the Internet Archive's classic_tv_commercials collection
    ("UNIVAC-AD-2", "UNIVAC2_512kb.mp4", 28, "UNIVAC Computer (1955)"), ("Coke_Commercial", "Coke_Commercial_512kb.mp4", 57, "Coca-Cola (1954)"),
    ("DeSoto5", "DeSoto5_512kb.mp4", 82, "1955 DeSoto"), ("Sugar_Crisps_Ad1", "Post_Sugar_Crisp_512kb.mp4", 100, "Post Sugar Crisp"),
    ("GE_Dish_Washer", "GE_Dish-Washer_512kb.mp4", 74, "GE Dish Washer (1950s)"), ("DuMont_Set_Commercial", "Television_Set_Commercial_512kb.mp4", 91, "Du Mont Television Sets"),
    ("Zarbon_Eats_Little_Children", "Coca-Cola_5_512kb.mp4", 110, "Coca-Cola (1955)"), ("deluxemeninspace", "toycomercial001_512kb.mp4", 50, "Men in Space toys (1960)"),
    ("Better_Than_The_Betty_Hutton_Show", "Sugar_Smacks_Cereal_512kb.mp4", 138, "Kellogg's Sugar Smacks"), ("DeSoto4", "DeSoto4_512kb.mp4", 88, "DeSoto"),
    ("lionel01", "toycommercial003_512kb.mp4", 60, "Astro Missile Firing Car (toy)"), ("Mokuba_Is_Cuddly_and_Loves_Classic_TV", "Coca-Cola_3_512kb.mp4", 103, "Coca-Cola (1953)")]
MOVIES = [  # public-domain features from the Internet Archive
    ("reefer_madness1938", "reefer_madness1938_512kb.mp4", 4098, "Reefer Madness (1936)"),
    ("his_girl_friday", "his_girl_friday_512kb.mp4", 5505, "His Girl Friday (1940)"),
    ("TheLittleShopOfHorrors1960", "The-Little-Shop-of-Horrors_512kb.mp4", 4353, "The Little Shop of Horrors (1960)"),
    ("house_on_haunted_hill_ipod", "house_on_haunted_hill_512kb.mp4", 4483, "House on Haunted Hill (1959)"),
    ("TheGeneral1926", "The_General_1926_720p_512kb.mp4", 4732, "The General (1926)")]


def load(p, d=None):
    try:
        return json.load(open(p))
    except Exception:
        return {} if d is None else d


def stations():
    return [{k: v for k, v in s.items() if k != "url"} for s in load(os.path.join(ROOT, "radio_stations.json"), {"stations": []})["stations"]]


def flyer():
    """Today's tear-off flyer: a real listing from the papers (a want ad, a Wish-Book idea or a seed), with phone-number tabs to tear."""
    today = dt.date.today().isoformat()
    rnd = random.Random(today)
    pool = []
    re_up = sorted(glob.glob(os.path.join(GARDEN, "re-up", "drafts", "20??-??-??.json")))
    for a in (load(re_up[-1]).get("want_ads") or [] if re_up else []):
        if isinstance(a, dict) and a.get("title"):
            kind = str(a["title"]).split(":")[0].strip().upper() if ":" in str(a["title"]) else "WANTED"
            pool.append({"kind": kind[:12], "title": str(a["title"]).split(":", 1)[-1].strip(), "text": a.get("text") or a.get("ask") or "", "url": "/re-up/", "who": a.get("agent")})
    for m in sorted(glob.glob(os.path.join(GARDEN, "doublewide", "site", "data", "market-*.json")))[-2:]:
        for it in load(m).get("items") or []:
            if isinstance(it, dict) and it.get("title"):
                pool.append({"kind": "SIDE HUSTLE", "title": it["title"], "text": it.get("desc") or it.get("text") or "", "url": "/roach-clips/catalog.html", "who": "B.I.G"})
    for p in load(os.path.join(GARDEN, "seed-catalog", "site", "catalog.json"), {"packs": []})["packs"]:
        for s in p.get("seeds") or []:
            pool.append({"kind": "SEED OF THE DAY", "title": s.get("name"), "text": s.get("what", ""), "url": "/seed-catalog/#pack-" + p["id"], "who": "B.I.G & CHRONIC"})
    f = rnd.choice(pool) if pool else {"kind": "NOTICE", "title": "Room for rent on this pillar", "text": "Your flyer here.", "url": "/", "who": "the newsie"}
    f["text"] = str(f.get("text") or "")[:220]
    f["tabs"] = ["555-%04d" % rnd.randint(100, 9999) for _ in range(7)]
    f["date"] = today
    return f


def tv():
    dw = os.path.join(GARDEN, "doublewide")
    drafts = sorted(glob.glob(os.path.join(dw, "drafts", "20??-??-??.json")))
    ed = load(drafts[-1]) if drafts else {}
    heads = [{"tag": (ed.get("headline") or {}).get("tag", ""), "title": (ed.get("headline") or {}).get("title", ""), "dek": (ed.get("headline") or {}).get("dek", "")}]
    heads += [{"tag": sec.get("name", ""), "title": st.get("title", ""), "dek": ""} for sec in ed.get("sections") or [] for st in sec.get("stories") or []][:8]
    usage = sorted(glob.glob(os.path.join(dw, "site", "data", "usage-*.json")))
    recipes = []
    for f in sorted(glob.glob(os.path.join(GARDEN, "baked-goods", "recipes", "*.json")))[-12:]:
        r = load(f)
        if r.get("title"):
            recipes.append({k: r.get(k) for k in ("title", "category", "intro", "serves", "prep", "difficulty", "ingredients", "steps", "tips", "agent")})
    return {"date": ed.get("date", ""), "headlines": [h for h in heads if h["title"]],
            "cartoons": [{"url": "https://archive.org/download/%s/%s" % (i, f), "secs": s, "title": t} for i, f, s, t in CARTOONS],
            "mtv": [{"id": i, "secs": s, "artist": a, "title": t, "album": al} for i, s, a, t, al in MTV],
            "ads": [{"url": "https://archive.org/download/%s/%s" % (i, f), "secs": s, "title": t} for i, f, s, t in ADS],
            "movies": [{"url": "https://archive.org/download/%s/%s" % (i, f), "secs": s, "title": t} for i, f, s, t in MOVIES],
            "recipes": recipes,
            "usage": ("/double-wide/data/" + os.path.basename(usage[-1])) if usage else ""}


def keyring():
    """Web links from The Green Thumb (the vault's directory) — names and URLs only."""
    try:
        r = subprocess.run(["ssh", "-n", "-o", "BatchMode=yes", "-o", "ConnectTimeout=8", "cak3d", "cat '%s'" % VAULT_GT], capture_output=True, text=True, timeout=30)
        entries = json.loads(r.stdout).get("entries") or []
    except Exception:
        return load(os.path.join(SITE, "keyring.json"), {"keys": []})
    keys = [{"name": e.get("name"), "url": e.get("url"), "device": e.get("device") or "", "category": e.get("category") or ""}
            for e in entries if str(e.get("url") or "").startswith("http") and ":8444/" not in str(e.get("url"))]
    return {"keys": keys}


def write_all():
    os.makedirs(SITE, exist_ok=True)
    for name, fn in (("flyer", flyer), ("tv", tv), ("keyring", keyring)):
        try:
            json.dump(fn(), open(os.path.join(SITE, name + ".json"), "w"), ensure_ascii=False)
        except Exception as ex:
            print("kiosk data: %s failed (%s)" % (name, type(ex).__name__))
