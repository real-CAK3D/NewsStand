#!/usr/bin/env python3
"""The kiosk's search box: one index of every page of every paper on the stand (the latest issues and the back issues), so a word
typed at The Corner Chronicle finds the story wherever it ran. Flipbook pages are indexed one by one and linked with #page-N.
Writes site/search.json (text only; no private data — private/ folders and the password locker are never read)."""
import datetime as dt, glob, html, json, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
GARDEN = os.path.dirname(ROOT)
MOUNT = {"doublewide": "/double-wide/", "tip-sheet": "/dime-bags/"}
SKIP = {"newsstand"}
def flip_pages(src):
    """[(title, inner html)] for each flipbook page, in order (split on the page openers; the last page stops at the pager)."""
    chunks = src.split('<div class="pg" data-title="')[1:]
    out = []
    for i, c in enumerate(chunks):
        title, _, inner = c.partition('"')
        if i == len(chunks) - 1:
            inner = inner.split('<nav class="pager"')[0]
        out.append((title, inner))
    return out
MAX_PER_PAPER = 400


def text(h):
    h = re.sub(r"<(script|style|svg|template)\b.*?</\1>", " ", h, flags=re.S | re.I)
    h = re.sub(r"<[^>]+>", " ", h)
    return re.sub(r"\s+", " ", html.unescape(h)).strip()


def main():
    pages = []
    for site in sorted(glob.glob(os.path.join(GARDEN, "*", "site"))):
        folder = site.split(os.sep)[-2]
        if folder in SKIP:
            continue
        mount = MOUNT.get(folder, "/%s/" % folder)
        latest = json.load(open(os.path.join(site, "latest.json"))) if os.path.exists(os.path.join(site, "latest.json")) else {}
        paper = latest.get("paper") or folder.replace("-", " ").title()
        files = sorted(glob.glob(os.path.join(site, "editions", "*.html")) + glob.glob(os.path.join(site, "issues", "*.html")) +
                       glob.glob(os.path.join(site, "guides", "*.html")) + glob.glob(os.path.join(site, "grow", "*.html")), reverse=True)
        if not files:
            files = [os.path.join(site, "index.html")]
        files += [f for f in (os.path.join(site, "funnies.html"), os.path.join(site, "catalog.html")) if os.path.exists(f)]
        n = 0
        for f in files:
            rel = os.path.relpath(f, site).replace(os.sep, "/")
            m = re.search(r"(\d{4}-\d{2}(?:-\d{2})?)", rel)
            date = m.group(1) if m else ""
            src = open(f, errors="ignore").read()
            found = flip_pages(src)
            if found:
                for i, (title, inner) in enumerate(found):
                    t = text(inner)
                    if len(t) > 40 and n < MAX_PER_PAPER:
                        pages.append({"paper": paper, "date": date, "title": html.unescape(title) + (" — " + date if date else ""),
                                      "url": "%s%s#page-%d" % (mount, rel, i + 1), "text": t[:1400]})
                        n += 1
            else:
                body = re.search(r"<body[^>]*>(.*)</body>", src, re.S)
                t = text(body.group(1) if body else src)
                ttl = re.search(r"<title>(.*?)</title>", src, re.S)
                if len(t) > 40 and n < MAX_PER_PAPER:
                    pages.append({"paper": paper, "date": date, "title": html.unescape(ttl.group(1)) if ttl else paper, "url": mount + rel, "text": t[:3000]})
                    n += 1
    out = os.path.join(ROOT, "site", "search.json")
    json.dump({"built": dt.datetime.now().isoformat(timespec="seconds"), "pages": pages}, open(out, "w"), ensure_ascii=False, separators=(",", ":"))
    print("search index: %d pages, %d KB" % (len(pages), os.path.getsize(out) // 1024))


if __name__ == "__main__":
    main()
