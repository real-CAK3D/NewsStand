"""Garden Bucks for the cash drawer (play money, clearly marked). Banknotes 1, 5, 10, 20, 50, 100 in the style of engraved paper money —
guilloche, rosettes, a portrait oval, seals, serial numbers — and coin faces 1¢, 5¢, 10¢, 25¢, $1 (RGBA, embossed).
Writes tex/bill_<n>.png and tex/coin_<n>.png."""
import math
import os
import random
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "tex")
os.makedirs(OUT, exist_ok=True)
FONTS = "C:/Windows/Fonts/"


def font(name, size):
    for n in (name, "georgiab.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(FONTS + n, size)
        except OSError:
            pass
    return ImageFont.load_default()


WORDS = {1: "ONE", 5: "FIVE", 10: "TEN", 20: "TWENTY", 50: "FIFTY", 100: "ONE HUNDRED"}
# paper tint, ink, accent (the colour-shifted numeral / background wash), like modern notes
NOTES = {1: ((222, 226, 208), (34, 52, 40), (120, 140, 110)), 5: ((226, 222, 222), (40, 44, 52), (150, 110, 160)),
         10: ((230, 222, 204), (46, 44, 36), (206, 140, 70)), 20: ((218, 228, 212), (30, 50, 38), (110, 160, 110)),
         50: ((222, 222, 230), (38, 40, 58), (200, 120, 130)), 100: ((214, 228, 230), (30, 46, 50), (90, 150, 170))}
W, H = 1560, 660


def guilloche(d, cx, cy, r0, r1, n, col, width=1, turns=7):
    for k in range(n):
        pts = []
        ph = k * 2 * math.pi / n
        for t in range(0, 721):
            a = t / 720 * 2 * math.pi
            r = r0 + (r1 - r0) * (0.5 + 0.5 * math.sin(turns * a + ph))
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        d.line(pts, fill=col, width=width)


def portrait(d, cx, cy, ink):
    """An engraved-looking profile: Clydius the dog, facing left, in fine hatching."""
    head = [(cx - 150, cy - 12), (cx - 118, cy - 34), (cx - 78, cy - 42), (cx - 58, cy - 72), (cx - 30, cy - 104), (cx + 18, cy - 118), (cx + 62, cy - 104),
            (cx + 92, cy - 70), (cx + 108, cy - 10), (cx + 118, cy + 80), (cx + 124, cy + 160), (cx - 40, cy + 160), (cx - 36, cy + 90), (cx - 56, cy + 46),
            (cx - 92, cy + 34), (cx - 130, cy + 22), (cx - 152, cy + 8)]
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).polygon(head, fill=255)
    hatch = Image.new("L", (W, H), 0)
    hd = ImageDraw.Draw(hatch)
    for y in range(cy - 160, cy + 170, 5):
        hd.line([(cx - 200, y), (cx + 200, y + 40)], fill=255, width=2)
    for x in range(cx - 30, cx + 140, 6):   # darker cross-hatching on the neck and back of the head
        hd.line([(x, cy - 140), (x - 60, cy + 160)], fill=255, width=1)
    layer = ImageChops.multiply(mask, hatch)
    d.bitmap((0, 0), layer, fill=ink)
    d.line(head + [head[0]], fill=ink, width=3)
    d.polygon([(cx + 30, cy - 112), (cx + 78, cy - 128), (cx + 70, cy - 88)], outline=ink, fill=ink)   # the rose ear, folded back
    d.ellipse((cx - 62, cy - 66, cx - 46, cy - 52), fill=ink)   # the eye
    d.arc((cx - 72, cy - 78, cx - 38, cy - 58), 190, 330, fill=ink, width=3)   # the brow
    d.ellipse((cx - 160, cy - 26, cx - 138, cy - 4), fill=ink)   # the nose
    d.line([(cx - 146, cy + 6), (cx - 96, cy + 12), (cx - 80, cy + 4)], fill=ink, width=4)   # the mouth
    d.line([(cx - 40, cy + 88), (cx + 118, cy + 76)], fill=(90, 110, 60), width=14)   # the camo collar
    d.ellipse((cx + 20, cy + 92, cx + 44, cy + 116), outline=ink, width=3)   # the bone tag


def rosette(d, cx, cy, r, ink, acc):
    guilloche(d, cx, cy, r * 0.35, r, 18, acc, 1, turns=9)
    d.ellipse((cx - r * 0.42, cy - r * 0.42, cx + r * 0.42, cy + r * 0.42), outline=ink, width=3)


def seal(d, cx, cy, r, col, letter):
    pts = []
    for k in range(64):
        a = k / 64 * 2 * math.pi
        rr = r if k % 2 else r * 0.88
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.polygon(pts, outline=col, width=3)
    d.ellipse((cx - r * 0.72, cy - r * 0.72, cx + r * 0.72, cy + r * 0.72), outline=col, width=3)
    d.text((cx, cy), letter, font=font("georgiab.ttf", int(r * 0.9)), fill=col, anchor="mm")


random.seed(7)
for n, (paper, ink, acc) in NOTES.items():
    im = Image.new("RGB", (W, H), paper)
    d = ImageDraw.Draw(im)
    wash = tuple(int(paper[i] * 0.8 + acc[i] * 0.2) for i in range(3))
    d.ellipse((W * 0.52, -H * 0.2, W * 1.15, H * 1.2), fill=wash)   # the colour wash behind the right half
    for y in range(0, H, 7):   # fine background lines
        d.line([(0, y), (W, y + 40)], fill=tuple(max(0, c - 16) for c in paper), width=1)
    d.rectangle((16, 16, W - 17, H - 17), outline=ink, width=10)
    d.rectangle((34, 34, W - 35, H - 35), outline=ink, width=2)
    for x in range(40, W - 40, 16):   # a border of tiny guilloche loops
        d.arc((x, 22, x + 16, 34), 0, 360, fill=ink)
        d.arc((x, H - 34, x + 16, H - 22), 0, 360, fill=ink)
    # the portrait oval
    cx, cy = W // 2, H // 2 + 36
    d.ellipse((cx - 214, cy - 222, cx + 214, cy + 222), fill=wash, outline=ink, width=2)
    d.ellipse((cx - 186, cy - 196, cx + 186, cy + 196), fill=tuple(min(255, c + 8) for c in paper), outline=ink, width=6)
    for k in range(90):   # a chain of little loops round the oval
        a = k / 90 * 2 * math.pi
        x, y = cx + 200 * math.cos(a), cy + 209 * math.sin(a)
        d.ellipse((x - 7, y - 7, x + 7, y + 7), outline=acc, width=2)
    portrait(d, cx + 10, cy + 6, ink)
    d.text((cx, cy + 176), "CLYDIUS", font=font("georgiab.ttf", 20), fill=ink, anchor="mm")
    # headline, seals, serials
    d.text((cx, 74), "THE GARDEN RESERVE NOTE", font=font("georgiab.ttf", 50), fill=ink, anchor="mm")
    d.text((cx, 112), "THE UNITED PAPERS OF THE GARDEN", font=font("georgia.ttf", 22), fill=ink, anchor="mm")
    d.text((cx, H - 62), WORDS[n] + " GARDEN BUCK" + ("" if n == 1 else "S"), font=font("georgiab.ttf", 40), fill=ink, anchor="mm")
    seal(d, 330, H // 2 + 20, 88, ink, "G")
    seal(d, W - 330, H // 2 + 20, 76, (40, 110, 70), "GB")
    serial = "G %08d %s" % (random.randint(0, 99999999), random.choice("ABCDEFGH"))
    for x, y in ((330, 200), (W - 440, H - 190)):
        d.text((x, y), serial, font=font("consolab.ttf", 34), fill=(40, 110, 70), anchor="mm")
    d.text((cx - 420, 150), "IN CLYDE WE TRUST", font=font("georgia.ttf", 20), fill=ink, anchor="mm")
    # denominations: ornate corners and the big colour-shifting numeral
    for (x, y), sz in (((110, 120), 92), ((W - 110, 120), 92), ((110, H - 120), 92)):
        rosette(d, x, y, 76, ink, acc)
        d.ellipse((x - 50, y - 50, x + 50, y + 50), fill=paper)
        d.text((x, y), str(n), font=font("georgiab.ttf", (sz if n < 100 else 60) * 7 // 10), fill=ink, anchor="mm")
    d.text((W - 150, H - 150), str(n), font=font("georgiab.ttf", 190 if n < 100 else 130), fill=tuple(int(c * 0.75) for c in acc), anchor="mm")
    d.text((cx - 420, H - 110), "PLAY MONEY · NOT LEGAL TENDER", font=font("arial.ttf", 16), fill=ink, anchor="mm")
    d.text((cx + 420, 186), "SERIES 2026", font=font("georgia.ttf", 18), fill=ink, anchor="mm")
    im = im.filter(ImageFilter.GaussianBlur(0.7))
    # a little wear
    grain = Image.effect_noise((W, H), 18).convert("L")
    im = Image.blend(im, Image.merge("RGB", (grain, grain, grain)), 0.05)
    im.save(os.path.join(OUT, "bill_%d.png" % n))

# ---- coins: face art, embossed onto the metal colour, round alpha
COINS = {1: ((150, 84, 50), "1¢", "ONE CENT"), 5: ((150, 150, 146), "5¢", "FIVE CENTS"), 10: ((160, 160, 158), "10¢", "ONE DIME"),
         25: ((156, 156, 154), "25¢", "QUARTER"), 100: ((176, 140, 64), "$1", "ONE BUCK")}
S = 512
for n, (metal, big, word) in COINS.items():
    art = Image.new("L", (S, S), 128)
    d = ImageDraw.Draw(art)
    d.ellipse((12, 12, S - 12, S - 12), outline=230, width=14)   # the rim
    d.ellipse((34, 34, S - 34, S - 34), outline=60, width=3)
    # lettering round the edge
    txt = "THE GARDEN · IN CLYDE WE TRUST · 2026 · "
    f = font("georgiab.ttf", 30)
    for k, ch in enumerate(txt):
        a = -math.pi / 2 + (k - len(txt) / 2) * 0.155
        x, y = S / 2 + 196 * math.cos(a), S / 2 + 196 * math.sin(a)
        tile = Image.new("L", (40, 40), 0)
        ImageDraw.Draw(tile).text((20, 20), ch, font=f, fill=255, anchor="mm")
        tile = tile.rotate(-math.degrees(a) - 90, resample=Image.BICUBIC)
        art.paste(230, (int(x - 20), int(y - 20)), tile)
    # the house in the middle and the value under it
    cx, cy, r = S // 2, S // 2 - 20, 80
    d.polygon([(cx - r, cy), (cx, cy - r * 0.9), (cx + r, cy)], outline=235, width=12)
    d.rectangle((cx - r * 0.75, cy, cx + r * 0.75, cy + r * 0.8), outline=235, width=12)
    d.rectangle((cx - 16, cy + r * 0.3, cx + 16, cy + r * 0.8), fill=40)
    d.text((cx, cy + 130), big, font=font("georgiab.ttf", 64), fill=235, anchor="mm")
    d.text((cx, cy + 180), word, font=font("georgiab.ttf", 24), fill=225, anchor="mm")
    emb = art.filter(ImageFilter.EMBOSS).filter(ImageFilter.GaussianBlur(0.8)).point(lambda v: max(0, min(255, (v - 128) * 2 + 128)))
    base = Image.new("RGB", (S, S), metal)
    shade = Image.merge("RGB", (emb, emb, emb))
    face = ImageChops.overlay(base, shade)
    rim = Image.new("L", (S, S), 255)   # a crisp raised rim, darker in its groove, instead of a fake dome
    ImageDraw.Draw(rim).ellipse((4, 4, S - 4, S - 4), outline=150, width=10)
    ImageDraw.Draw(rim).ellipse((16, 16, S - 16, S - 16), outline=205, width=5)
    face = ImageChops.multiply(face, Image.merge("RGB", (rim, rim, rim)))
    alpha = Image.new("L", (S, S), 0)
    ImageDraw.Draw(alpha).ellipse((4, 4, S - 4, S - 4), fill=255)
    face.putalpha(alpha)
    face.save(os.path.join(OUT, "coin_%d.png" % n))
print("money written to", OUT)
