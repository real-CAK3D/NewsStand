#!/usr/bin/env python3
"""The Corner Chronicle web server — the Garden's one home-screen app (Tailscale-only; `tailscale serve --https=8444` mounts it at /
and each paper at its own path). Static kiosk + app shell (manifest, service worker) + new-issue notices (/api/push/*), plus the
things on and around the kiosk that remember you:

  GET  /api/state?endpoint=…           -> wallet, punch card, clippings, stash box, scores, muted papers (for this phone's notices)
  POST /api/read   {paper}             -> punches today on the card (+10 Garden Bucks a day, streak rewards)
  POST /api/clip   {paper,title,url,text,kind} · POST /api/unclip {id}      the Scrapbook drawer
  POST /api/letter {text, to}          -> Letters to the Editor (Ganja prints and answers them in The Double Wide)
  POST /api/tip    {text, agent}       -> the tip line (Ganja assigns it to a desk in the next paper)
  POST /api/rate   {paper,issue,section,vote}                             👍/👎 per section, summed for Ganja
  POST /api/score  {game,date,secs,won}                                   puzzle scores (The Crossword Times)
  POST /api/mute   {endpoint,paper,muted}                                 which papers ring this phone
  POST /api/buy    {pack}              -> buys a seed pack from The Seed Catalog with Garden Bucks; it goes in the stash box
  POST /api/plant  {pack, seed}        -> CHRONIC writes a grow guide for that seed (a one-off relay job)
Garden Bucks are pretend money shared with Dime Bags. Usage: serve.py <site_dir> <host> <port>"""
import datetime as dt, json, os, re, secrets, subprocess, sys

import gardenweb as gw
from gardenweb import jload, jsave, LOCK, wallet_tx

ROOT = os.path.dirname(os.path.abspath(__file__))
PRIV = os.path.join(ROOT, "private")
HERMES = os.path.expanduser("~/.hermes")
GARDEN = os.path.join(HERMES, "garden")
PY = os.path.join(HERMES, "hermes-agent/venv/bin/python")
SEEDS = os.path.join(GARDEN, "seed-catalog")
PAPER_IDS = r"[a-z0-9-]{2,30}"
REWARDS = {7: (100, "Bonus comic unlocked"), 14: (250, "Gold seal on your card"), 30: (1000, "The Golden Joint for the counter")}


def f(name):
    return os.path.join(PRIV, name + ".json")


def today():
    return dt.datetime.now().date().isoformat()


def now():
    return dt.datetime.now().isoformat(timespec="seconds")


def clean(s, n):
    return re.sub(r"[\x00-\x08\x0b-\x1f]", "", str(s or ""))[:n].strip()


def streak(days):
    d, n, have = dt.date.today(), 0, set(days)
    if d.isoformat() not in have:
        d -= dt.timedelta(days=1)
    while d.isoformat() in have:
        n += 1
        d -= dt.timedelta(days=1)
    return n


def sh(s):
    return "'" + str(s).replace("'", "'\\''") + "'"


def create_job(profile_home, prompt, name):
    code = ("import sys; from cron.jobs import create_job, pause_job\n"
            "j = create_job(sys.argv[1], '0 0 1 1 *', name=sys.argv[2], repeat=1, deliver='discord')\n"
            "jid = j.get('id') if isinstance(j, dict) else j\npause_job(jid)\nprint(jid)")
    r = subprocess.run([PY, "-c", code, prompt, name], cwd=os.path.join(HERMES, "hermes-agent"),
                       env={**os.environ, "HERMES_HOME": profile_home}, capture_output=True, text=True, timeout=180)
    return (r.returncode == 0), ((r.stdout.strip().splitlines() or [""])[-1] if r.returncode == 0 else r.stderr.strip()[-200:])


def catalog():
    return jload(os.path.join(SEEDS, "site", "catalog.json"), {"packs": []})


def plant(pack, seed):
    """CHRONIC (the Garden's head grower) writes a grow guide for one seed; his gateway only runs for shifts, so the one-off job goes
    through relay-step, then the guide page is printed and the phone gets a notice."""
    prompt = open(os.path.join(SEEDS, "prompts", "grow_prompt.txt")).read() \
        .replace("@@SEED@@", json.dumps({"pack": pack.get("name"), **seed}, ensure_ascii=False, indent=1)).replace("@@SEED_ID@@", seed["id"])
    name = "Grow guide: %s" % seed["id"]
    ok, jid = create_job(os.path.join(HERMES, "profiles", "chronic"), prompt, name)
    if not ok:
        return False, jid
    cmd = ("%s/bin/relay-step.sh chronic %s; %s %s/build_seeds.py; [ -f %s/site/grow/%s.html ] && %s %s/notify.py %s %s %s") % (
        HERMES, sh(name), PY, SEEDS, SEEDS, seed["id"], PY, ROOT, sh("🌱 Your seed sprouted"), sh(str(seed.get("name"))[:80] + " — CHRONIC's grow guide is ready"),
        sh("/seed-catalog/grow/%s.html" % seed["id"]))
    subprocess.Popen(["systemd-run", "--user", "--collect", "--unit=grow-%s-%s" % (seed["id"].lower()[:30], dt.datetime.now().strftime("%H%M%S")),
                      "/bin/bash", "-c", cmd], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return True, jid


def stash_view():
    st = jload(f("stash"), {"packs": []})
    for p in st["packs"]:
        for sid, s in (p.get("seeds") or {}).items():
            if os.path.exists(os.path.join(SEEDS, "site", "grow", sid + ".html")):
                s["status"], s["url"] = "grown", "/seed-catalog/grow/%s.html" % sid
            elif s.get("status") == "planting" and s.get("at", "") < (dt.datetime.now() - dt.timedelta(hours=3)).isoformat():
                s["status"] = "wilted"
    return st


def scores_view():
    sc = jload(f("scores"), {})
    out = {}
    for g, rows in sc.items():
        won = [r for r in rows if r.get("won")]
        out[g] = {"played": len(rows), "won": len(won), "best": min((r["secs"] for r in won if r.get("secs")), default=None),
                  "streak": streak([r["date"] for r in won]), "dates": sorted({r["date"] for r in won})[-60:]}
    return out


class Handler(gw.Handler):
    ROOT = ROOT

    def get_api(self, p):
        if p == "/api/state":
            from urllib.parse import unquote
            m = re.search(r"endpoint=([^&]+)", self.path)
            ep = unquote(m.group(1)) if m else ""
            punch = jload(f("punch"), {"days": [], "rewards": []})
            self.json(200, {"wallet": {"balance": wallet_tx(lambda w: w["balance"])},
                            "punch": {"days": punch["days"][-40:], "streak": streak(punch["days"]), "rewards": punch["rewards"]},
                            "clips": jload(f("clips"), [])[-200:], "stash": stash_view(), "scores": scores_view(),
                            "muted": jload(f("muted"), {}).get(ep, []) if ep else []})
            return True
        if p == "/api/scores":
            self.json(200, scores_view())
            return True

    def post_api(self, p):
        req = self.body(8192)
        if p == "/api/read":
            paper = str(req.get("paper") or "")
            assert re.fullmatch(PAPER_IDS, paper)
            with LOCK:
                punch = jload(f("punch"), {"days": [], "rewards": []})
                msg, new = "", today() not in punch["days"]
                if new:
                    punch["days"] = sorted(set(punch["days"] + [today()]))[-400:]
                    s, bonus = streak(punch["days"]), 10
                    got = REWARDS.get(s)
                    if got and "%d-%s" % (s, today()) not in punch["rewards"]:
                        bonus += got[0]
                        punch["rewards"].append("%d-%s" % (s, today()))
                        msg = "🎉 %d-day streak! +%d Garden Bucks · %s" % (s, got[0], got[1])
                    wallet_tx(lambda w: w.__setitem__("balance", w["balance"] + bonus))
                    jsave(f("punch"), punch)
            self.json(200, {"ok": True, "punched": new, "streak": streak(punch["days"]), "message": msg})
            return True
        if p == "/api/clip":
            item = {"id": secrets.token_hex(4), "at": now(), "paper": clean(req.get("paper"), 40), "title": clean(req.get("title"), 160),
                    "url": clean(req.get("url"), 300), "text": clean(req.get("text"), 1200), "kind": clean(req.get("kind"), 20) or "story"}
            assert item["url"].startswith("/") and item["title"]
            with LOCK:
                clips = jload(f("clips"), [])
                clips.append(item)
                jsave(f("clips"), clips[-500:])
            self.json(200, {"ok": True, "id": item["id"], "message": "✂ Clipped to your Scrapbook."})
            return True
        if p == "/api/unclip":
            with LOCK:
                jsave(f("clips"), [c for c in jload(f("clips"), []) if c.get("id") != req.get("id")])
            self.json(200, {"ok": True})
            return True
        if p in ("/api/letter", "/api/tip"):
            kind = p.rsplit("/", 1)[1]
            text = clean(req.get("text"), 1500)
            assert len(text) >= 3
            item = {"id": secrets.token_hex(4), "at": now(), "text": text, "status": "new",
                    ("to" if kind == "letter" else "agent"): clean(req.get("to") or req.get("agent"), 40) or ("The Editor" if kind == "letter" else "Ganja")}
            with LOCK:
                rows = jload(f(kind + "s"), [])
                rows.append(item)
                jsave(f(kind + "s"), rows[-300:])
            self.json(200, {"ok": True, "message": "📬 Posted! Ganja prints letters (and her answers) in the next Double Wide." if kind == "letter"
                            else "☎ Got it — your tip goes to %s in the next paper." % item["agent"]})
            return True
        if p == "/api/rate":
            paper, vote = str(req.get("paper") or ""), int(req.get("vote") or 0)
            assert re.fullmatch(PAPER_IDS, paper) and vote in (1, -1)
            with LOCK:
                rows = jload(f("ratings"), [])
                key = (paper, clean(req.get("issue"), 20), clean(req.get("section"), 80))
                rows = [r for r in rows if (r["paper"], r["issue"], r["section"]) != key]
                rows.append({"paper": key[0], "issue": key[1], "section": key[2], "vote": vote, "at": now()})
                jsave(f("ratings"), rows[-3000:])
            self.json(200, {"ok": True})
            return True
        if p == "/api/score":
            game, date = clean(req.get("game"), 20), clean(req.get("date"), 10)
            assert re.fullmatch(r"[a-z0-9]{3,20}", game) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", date)
            with LOCK:
                sc = jload(f("scores"), {})
                sc.setdefault(game, []).append({"date": date, "secs": int(req.get("secs") or 0), "won": bool(req.get("won")), "at": now()})
                sc[game] = sc[game][-800:]
                jsave(f("scores"), sc)
            self.json(200, {"ok": True, "stats": scores_view().get(game)})
            return True
        if p == "/api/mute":
            ep, paper = str(req.get("endpoint") or ""), str(req.get("paper") or "")
            assert ep.startswith("https://") and re.fullmatch(PAPER_IDS, paper)
            with LOCK:
                m = jload(f("muted"), {})
                s = set(m.get(ep, []))
                (s.add if req.get("muted") else s.discard)(paper)
                m[ep] = sorted(s)
                jsave(f("muted"), m)
            self.json(200, {"ok": True, "muted": m[ep]})
            return True
        if p == "/api/buy":
            pack = next((x for x in catalog()["packs"] if x.get("id") == req.get("pack")), None)
            assert pack
            price = int(pack.get("price") or 0)

            def pay(w):
                if w["balance"] < price:
                    return False
                w["balance"] -= price
                return True
            with LOCK:
                if not wallet_tx(pay):
                    self.json(200, {"ok": False, "message": "Not enough Garden Bucks — read the paper daily (+10) or win at Dime Bags."})
                    return True
                st = jload(f("stash"), {"packs": []})
                st["packs"].append({"pack": pack["id"], "name": pack.get("name"), "theme": pack.get("theme"), "color": pack.get("color"),
                                    "bought": now(), "seeds": {s["id"]: {"name": s.get("name"), "status": "seed"} for s in pack.get("seeds") or []}})
                jsave(f("stash"), st)
            self.json(200, {"ok": True, "message": "🌱 %s is in your stash box." % pack.get("name")})
            return True
        if p == "/api/plant":
            pack = next((x for x in catalog()["packs"] if x.get("id") == req.get("pack")), None)
            seed = next((s for s in (pack or {}).get("seeds") or [] if s.get("id") == req.get("seed")), None)
            assert pack and seed and re.fullmatch(r"[a-z0-9-]{3,60}", seed["id"])
            with LOCK:
                st = stash_view()
                owned = next((x for x in st["packs"] if x["pack"] == pack["id"] and seed["id"] in x["seeds"]), None)
                if not owned:
                    self.json(200, {"ok": False, "message": "Buy the pack first — it's in The Seed Catalog."})
                    return True
                s = owned["seeds"][seed["id"]]
                if s.get("status") in ("planting", "grown"):
                    self.json(200, {"ok": True, "status": s["status"], "url": s.get("url"),
                                    "message": "Already growing — CHRONIC is on it." if s["status"] == "planting" else "Fully grown — open the guide."})
                    return True
                ok, info = plant(pack, seed)
                if not ok:
                    self.json(200, {"ok": False, "message": "Couldn't reach CHRONIC: " + info})
                    return True
                s.update({"status": "planting", "at": now(), "job": info})
                jsave(f("stash"), st)
            self.json(200, {"ok": True, "status": "planting", "message": "🌱 Planted! CHRONIC is writing the grow guide — you'll get a notice when it sprouts."})
            return True


if __name__ == "__main__":
    gw.run(Handler, sys.argv[1], sys.argv[2], int(sys.argv[3]))
