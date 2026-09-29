"""Garden Bucks banknotes for the cash drawer (play money): 1, 5, 10, 20, 50. Writes tex/bill_<n>.png (and tex/coin_face.png)."""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

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


NOTES = {1: ((196, 214, 186), (46, 84, 52)), 5: ((206, 214, 176), (70, 88, 40)), 10: ((188, 210, 200), (32, 82, 72)),
         20: ((214, 204, 184), (96, 70, 40)), 50: ((200, 196, 214), (70, 56, 104))}
W, H = 1040, 440


def seal(d, cx, cy, r, ink):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=ink, width=6)
    d.ellipse((cx - r + 14, cy - r + 14, cx + r - 14, cy + r - 14), outline=ink, width=2)
    s = r * 0.5   # the little house
    d.polygon([(cx - s, cy), (cx, cy - s * 0.9), (cx + s, cy)], outline=ink, width=5)
    d.rectangle((cx - s * 0.75, cy, cx + s * 0.75, cy + s * 0.8), outline=ink, width=5)
    d.rectangle((cx - s * 0.18, cy + s * 0.3, cx + s * 0.18, cy + s * 0.8), fill=ink)


for n, (paper, ink) in NOTES.items():
    im = Image.new("RGB", (W, H), paper)
    d = ImageDraw.Draw(im)
    for y in range(0, H, 6):   # guilloche-ish fine lines
        d.line([(0, y), (W, y + 30)], fill=tuple(max(0, c - 14) for c in paper), width=1)
    d.rectangle((14, 14, W - 15, H - 15), outline=ink, width=8)
    d.rectangle((30, 30, W - 31, H - 31), outline=ink, width=2)
    seal(d, W // 2, H // 2 + 12, 100, ink)
    d.text((W // 2, 62), "THE GARDEN RESERVE NOTE", font=font("georgiab.ttf", 40), fill=ink, anchor="mm")
    d.text((W // 2, H - 64), "GARDEN BUCKS", font=font("impact.ttf", 56), fill=ink, anchor="mm")
    d.text((W // 2, 102), "IN CLYDE WE TRUST", font=font("georgia.ttf", 22), fill=ink, anchor="mm")
    big = font("georgiab.ttf", 130)
    for x, y in ((120, 130), (W - 120, H - 150)):
        d.text((x, y), str(n), font=big, fill=ink, anchor="mm")
    for x, y in ((W - 90, 96), (90, H - 96)):
        d.text((x, y), str(n), font=font("georgiab.ttf", 54), fill=ink, anchor="mm")
    d.text((250, H // 2 + 8), "PLAY MONEY", font=font("arial.ttf", 18), fill=ink, anchor="mm")
    d.text((W - 250, H // 2 + 8), "NOT LEGAL TENDER", font=font("arial.ttf", 18), fill=ink, anchor="mm")
    im = im.filter(ImageFilter.GaussianBlur(0.6))
    im.save(os.path.join(OUT, "bill_%d.png" % n))

# a coin face (stamped house) used on the coins' caps
im = Image.new("RGB", (256, 256), (200, 200, 200))
d = ImageDraw.Draw(im)
seal(d, 128, 132, 100, (90, 90, 90))
im.filter(ImageFilter.GaussianBlur(1.2)).save(os.path.join(OUT, "coin_face.png"))
print("bills written to", OUT)
