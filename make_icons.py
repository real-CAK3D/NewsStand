#!/usr/bin/env python3
"""Draw this app's home-screen icons.  make_icons.py doublewide|sunday|couponer|yellowpages"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "site", "icons")
os.makedirs(OUT, exist_ok=True)
INK, CREAM = (27, 21, 16), (245, 238, 219)
STYLES = {  # background, rim, circle, letters
    "doublewide": ((224, 122, 36), (184, 90, 20), CREAM, None),
    "sunday": ((31, 58, 95), (20, 38, 63), CREAM, "S"),
    "couponer": ((214, 40, 40), (157, 27, 27), (255, 224, 102), "%"),
    "yellowpages": ((247, 209, 23), (201, 168, 0), (255, 255, 255), "YP"),
    "newsstand": ((107, 69, 38), (74, 47, 26), CREAM, None),
}
STYLE = sys.argv[1] if len(sys.argv) > 1 else "doublewide"
BG, RIM, CIRCLE, LETTERS = STYLES[STYLE]


def font(size):
    for f in ("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"):
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def emblem(d, cx, cy, r, ink=INK, fill=CIRCLE):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill, outline=ink, width=max(2, int(r // 14)))
    if STYLE == "couponer":   # dashed coupon inside the circle
        w, h = r * 1.15, r * 0.7
        for i in range(0, 24):
            if i % 2 == 0:
                t0, t1 = i / 24, (i + 1) / 24
                pts = []
                for t in (t0, t1):
                    per = 2 * (w + h) * t
                    if per < w: pts.append((cx - w / 2 + per, cy - h / 2))
                    elif per < w + h: pts.append((cx + w / 2, cy - h / 2 + per - w))
                    elif per < 2 * w + h: pts.append((cx + w / 2 - (per - w - h), cy + h / 2))
                    else: pts.append((cx - w / 2, cy + h / 2 - (per - 2 * w - h)))
                d.line(pts, fill=ink, width=max(2, int(r // 16)))
    if STYLE == "newsstand":   # a fan of the Garden's papers on the rack
        for i, col in enumerate([(224, 122, 36), (31, 122, 109), (244, 239, 226), (255, 224, 102), (111, 179, 90)]):
            x = cx + (i - 2) * r * 0.28
            y = cy - r * 0.05 + abs(i - 2) * r * 0.08
            d.rectangle([x - r * 0.26, y - r * 0.5, x + r * 0.26, y + r * 0.45], fill=col, outline=ink, width=max(2, int(r // 20)))
            d.line([x - r * 0.17, y - r * 0.3, x + r * 0.17, y - r * 0.3], fill=ink, width=max(1, int(r // 26)))
        return
    if LETTERS:
        f = font(int(r * (1.15 if len(LETTERS) == 1 else 0.8)))
        d.text((cx, cy + r * 0.04), LETTERS, font=f, fill=ink, anchor="mm")
        return
    s = r / 60.0   # the Double Wide house seal (120x120 drawing)
    P = lambda x, y: (cx + (x - 60) * s, cy + (y - 60) * s)
    d.line([P(24, 78), P(96, 78), P(96, 56), P(60, 38), P(24, 56), P(24, 78)], fill=ink, width=max(2, int(5 * s)), joint="curve")
    d.rectangle([P(36, 60), P(50, 78)], fill=ink)
    d.rectangle([P(62, 60), P(82, 70)], fill=ink)
    for pts in ([(74, 38), (78, 30), (86, 30), (84, 22)], [(82, 36), (88, 30), (94, 32), (94, 24)]):
        d.line([P(*p) for p in pts], fill=ink, width=max(2, int(4 * s)), joint="curve")


def icon(size, maskable=False):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if maskable:
        d.rectangle([0, 0, size, size], fill=BG)
        emblem(d, size / 2, size / 2, size * 0.30)
    else:
        rad = size // 5
        d.rounded_rectangle([0, 0, size - 1, size - 1], rad, fill=BG, outline=INK, width=max(3, size // 40))
        d.rounded_rectangle([size * .06, size * .06, size * .94, size * .94], int(rad * .8), outline=RIM, width=max(2, size // 90))
        emblem(d, size / 2, size / 2, size * 0.36)
    return im


icon(192).save(os.path.join(OUT, "icon-192.png"))
icon(512).save(os.path.join(OUT, "icon-512.png"))
icon(512, maskable=True).save(os.path.join(OUT, "maskable-512.png"))
b = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
emblem(ImageDraw.Draw(b), 48, 48, 44, ink=(255, 255, 255, 255), fill=(0, 0, 0, 0))
b.save(os.path.join(OUT, "badge-96.png"))
print("icons drawn:", STYLE)
