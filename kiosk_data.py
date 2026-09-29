"""Data the kiosk's props read, built with the page: the radio dial (public part of radio_stations.json), today's tear-off flyer above the
payphone, the little TV's lineup, and the keyring in the stash box (web links from The Green Thumb — no passwords, never)."""
import datetime as dt, glob, json, os, random, subprocess, urllib.parse

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
KITCHEN = [  # Garden Kitchen: YouTube cooking shows (the channels' own uploads): (id, seconds, show, title)
    ("gkBEppyO2wA", 1250, "Martha Stewart", "Martha & Snoop's Best Moments and Recipes"),
    ("N4sP6NbobA0", 134, "Granny PottyMouth", "Tofucken: a Vegan Turducken"),
    ("PxXvWVRB-Ek", 208, "Granny PottyMouth", "Fried Rice in 10 Minutes"),
    ("SLQq4Wuhexg", 90, "Granny PottyMouth", "Hater Cake, Baked With Love"),
    ("cpO-ptZvGyM", 591, "Granny PottyMouth", "AppleGasm (Diabetic Friendly, Too)")]
FIRE = [("qeWLeTQAjzU", 10800, "Aura Video Art", "Cozy Fireplace")]
ASWIM = [  # [adult swim]: full episodes from the network's own YouTube channels, with a few short bits between
    ("D0yvN-myK3E", 692, "Aqua Teen Hunger Force", "S2E14: Spirit Journey Formation Anniversary"),
    ("-gfIHZnt4yA", 694, "Metalocalypse", "S1E1: The Curse of Dethklok"),
    ("e-NDfQwjwhg", 97, "Space Ghost Coast to Coast", "Space Ghost Sells Out"),
    ("GglUupLgiNg", 1394, "The Venture Bros.", "S1E14: Return to Spider-Skull Island"),
    ("rSctLJTUs_w", 690, "Aqua Teen Hunger Force", "S2E11: Universal Re-Monster"),
    ("uE0jauwSYyA", 694, "Metalocalypse", "S1E2: Dethwater"),
    ("9exB1XR10ck", 93, "Tim and Eric Awesome Show, Great Job!", "Usable Human Bones"),
    ("qeyIlOwDfjw", 1357, "The Venture Bros.", "S1E12: Past Tense"),
    ("yZdG1rY2U7s", 693, "Aqua Teen Hunger Force", "S2E13: Revenge of the Trees"),
    ("3pLxP65Q5ro", 693, "Metalocalypse", "S1E6: Dethfam"),
    ("aElQCJKTG0g", 96, "Harvey Birdman, Attorney at Law", "The Trial of Fred Flintstone"),
    ("BR0j57lrsOo", 692, "Aqua Teen Hunger Force", "S2E15: The Shaving"),
    ("4bQunFXMXFY", 693, "Metalocalypse", "S1E12: Murdering Outside the Box"),
    ("1Y9t_Cj_YDk", 1068, "Robot Chicken", "Horror Movie Parodies"),
    ("7Hzi45yDiz0", 81, "Squidbillies", "Nother Soda, Granny?"),
    ("fIIuuzGUpts", 1123, "Aqua Teen Hunger Force", "Mooninites Unite")]
CHASES = [  # Chopper 7: real chases, from the TV stations' own uploads
    ("eYjXuYF_8uI", 524, "Eyewitness News ABC7NY", "The O.J. Simpson white Bronco chase (June 17, 1994)"),
    ("Q6UBW0wrB18", 214, "CBS 8 San Diego", "Stolen tank rampage in San Diego (1995)"),
    ("a3fO6M2arX0", 800, "KTLA 5", "Marathon CHP chase from L.A. County into San Diego"),
    ("Nxc7C1xM7pY", 983, "KTLA 5", "Fleeing driver ends up riding on rims"),
    ("0WF_NeBgm-o", 269, "9NEWS", "O.J. Simpson's white Bronco chase"),
    ("Qe4zO9IMSKk", 1377, "KTLA 5", "Driver fleeing police rams cars on the 405"),
    ("bxJopaA_w84", 965, "ABC7", "Full chase: armed robbery suspects arrested"),
    ("z7Hk73RAdpI", 1256, "KTLA 5", "High-speed chase ends in a crash east of L.A."),
    ("xgLrHJRrFTY", 1489, "KTLA 5", "CHP officers chase an armed suspect")]
ROADSHOW = [  # Antiques Roadshow: full episodes from PBS's own channel
    ("Kdb95712xOU", 3225, "Antiques Roadshow", "Vintage First Finds, Hour 1"), ("CqtGj2b-fPo", 3225, "Antiques Roadshow", "Vintage First Finds, Hour 2"),
    ("hrosOXcgJuo", 3175, "Antiques Roadshow", "Never Seen That Before!"), ("cVPDhFWL3ck", 3202, "Antiques Roadshow", "Vintage San Jose, Hour 1"),
    ("rVPchaA1bn4", 3178, "Antiques Roadshow", "Best Bargains"), ("iSW0JryPwCM", 3205, "Antiques Roadshow", "Vintage Baltimore 2021, Hour 1"),
    ("2kJaiIY9Xfs", 3173, "Antiques Roadshow", "Did Grandma Lie?"), ("Reh_cbSXFzA", 3167, "Antiques Roadshow", "Vintage Denver 2024, Hour 2"),
    ("-1W6rFqNu7E", 942, "Antiques Roadshow", "The Most Valuable Items Ever Appraised, Part 1")]
LECTURES = [  # The Lecture Hall: the Free To Choose Network and the Alan Watts Organization's own uploads
    ("dngqR9gcDDw", 3467, "Milton Friedman", "Free To Choose (1980) · Vol. 1: The Power of the Market"),
    ("NvLlpY9vd9E", 2848, "Alan Watts", "Individual and the World, Part 1"),
    ("B_nGEj8wIP0", 5164, "Milton Friedman", "Milton Friedman Speaks: Money and Inflation"),
    ("C48hI9Qb2q4", 2238, "Alan Watts", "Myth of Myself, Part 1"),
    ("CWgNe8v6KFc", 3459, "Milton Friedman", "Free To Choose (1980) · Vol. 2: The Tyranny of Control"),
    ("RBGJ8uyAT24", 1747, "Alan Watts", "Ways of Liberation"),
    ("ppGaozkIGa4", 5155, "Milton Friedman", "Milton Friedman Speaks: Equality and Freedom in the Free Enterprise System"),
    ("lHXisYGjvmM", 3172, "Alan Watts", "Mind Over Mind"),
    ("gMLjkt87ICo", 202, "Milton Friedman", "Milton Friedman Schools a Young Idealist")]
JRE = [  # PowerfulJRE and JRE Clips uploads
    ("8DwKiAD1ff0", 980, "JRE Clips", "Egyptian Pharaohs Used Mummification to Download Consciousness"),
    ("mnJ8Ffv-SzE", 916, "JRE Clips", "Shane Gillis on the Civil War and WWI"),
    ("ke-H2zQQMqw", 946, "JRE Clips", "Inside the Government's 80-Year Cover-Up of UFOs"),
    ("J3SIbt2s28Y", 8900, "Joe Rogan Experience #2555", "Ron White"),
    ("6is72EG4N_c", 937, "JRE Clips", "The 1 Million Year Old Skull Found in China"),
    ("6y2LZHcatVo", 996, "JRE Clips", "Yakov Smirnoff on Growing Up in the Soviet Union"),
    ("KIY0np5KDfE", 9599, "Joe Rogan Experience #2553", "Andrew Huberman"),
    ("4QmsFKyt6UA", 881, "JRE Clips", "The Environmental Impact of Cobalt Mining")]
STOOGES = [  # the four public-domain Three Stooges shorts, from the Internet Archive
    ("disorder_in_the_court", "disorder_in_the_court_512kb.mp4", 997, "Disorder in the Court (1936)"),
    ("brideless_groom", "brideless_groom_512kb.mp4", 999, "Brideless Groom (1947)"),
    ("sing_a_song_of_six_pants", "sing_a_song_of_six_pants_512kb.mp4", 1017, "Sing a Song of Six Pants (1947)"),
    ("malice_in_the_palace", "malice_in_the_palace_512kb.mp4", 945, "Malice in the Palace (1949)")]
SEASONAL = {  # the Internet Archive: public-domain seasonal cartoons, and commercial breaks from the season
    "halloween": [("popeye_fright_to_the_finish", "popeye_fright_to_the_finish_512kb.mp4", 381, "Popeye: Fright to the Finish (1954)"),
                  ("yt-5s.com-cartoon-network-commercials-october-15-2005", "yt5s.com-Cartoon Network Commercials (October 15, 2005).mp4", 595, "Commercial break · Cartoon Network, October 2005"),
                  ("the_cobweb_hotel", "the_cobweb_hotel_512kb.mp4", 473, "The Cobweb Hotel (1936)"),
                  ("nick-jr-commercial-break-october-2001-part-35480p", "Nick Jr Commercial Break October 2001 Part 35480p.ia.mp4", 379, "Commercial break · Nick Jr., October 2001"),
                  ("noveltoon_casper_tfg_theres_good_boos_tonight", "noveltoon_casper_tfg_theres_good_boos_tonight_512kb.mp4", 525, "Casper: There's Good Boos To-Night (1948)"),
                  ("disney-channel-commercial-breaks-october-23-2007-720p", "Disney Channel Commercial Breaks (October 23_ 2007)_ 720p.mp4", 302, "Commercial break · Disney Channel, October 2007"),
                  ("bb_minnie_the_moocher", "bb_minnie_the_moocher_512kb.mp4", 466, "Betty Boop: Minnie the Moocher (1932)"),
                  ("nick-jr-commercial-break-october-2001-part-45480p", "Nick Jr Commercial Break October 2001 Part 45480p.ia.mp4", 328, "Commercial break · Nick Jr., October 2001")],
    "christmas": [("RudolphTheRed-nosedReindeer1948", "RudolphTheRed-nosedReindeer1948_512kb.mp4", 492, "Rudolph the Red-Nosed Reindeer (1948)"),
                  ("JohnWayne-Vintage50sXmasSealsCommercial1955", "johnwayne_512kb.mp4", 100, "Commercial · Christmas Seals with John Wayne (1955)"),
                  ("SantasSuprise", "SantasSuprise_512kb.mp4", 466, "Santa's Surprise (1947)"),
                  ("Commercials36", "Commercials 36.mp4", 2015, "Commercial break · vintage Christmas ads"),
                  ("bb_snow_white", "bb_snow_white_512kb.mp4", 424, "Betty Boop: Snow White (1933)")]}
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
            "kitchen": [{"id": i, "secs": s_, "show": a_, "title": t} for i, s_, a_, t in KITCHEN],
            "fire": [{"id": i, "secs": s_, "show": a_, "title": t} for i, s_, a_, t in FIRE],
            "aswim": [{"id": i, "secs": s_, "show": a_, "title": t} for i, s_, a_, t in ASWIM],
            "lectures": [{"id": i, "secs": s_, "show": a_, "title": t} for i, s_, a_, t in LECTURES],
            "stooges": [{"url": "https://archive.org/download/%s/%s" % (i, f), "secs": s_, "title": t} for i, f, s_, t in STOOGES],
            "chases": [{"id": i, "secs": s_, "show": a_, "title": t} for i, s_, a_, t in CHASES],
            "roadshow": [{"id": i, "secs": s_, "show": a_, "title": t} for i, s_, a_, t in ROADSHOW],
            "jre": [{"id": i, "secs": s_, "show": a_, "title": t} for i, s_, a_, t in JRE],
            "seasonal": {k: [{"url": "https://archive.org/download/%s/%s" % (i, urllib.parse.quote(f)), "secs": s_, "title": t} for i, f, s_, t in v] for k, v in SEASONAL.items()},
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
