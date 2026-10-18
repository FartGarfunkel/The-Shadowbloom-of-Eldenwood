# Crops chosen icons out of icons.png (from a3_icons.py) into one labelled strip.
import sys, json, os
from PIL import Image, ImageDraw
D = sys.argv[1]
sheet = Image.open(os.path.join(D, 'icons.png')).convert('RGBA')
idx = json.load(open(os.path.join(D, 'idx.json')))
S, cols = 64, 16
per = 12
rows = (len(idx) + per - 1) // per
out = Image.new('RGBA', (per * 90, rows * 86), (44, 44, 52, 255))
dr = ImageDraw.Draw(out)
for n, (k, i) in enumerate(idx):
    x, y = (n % per) * 90, (n // per) * 86
    if i >= 0:
        ic = sheet.crop(((i % cols) * S, (i // cols) * S, (i % cols) * S + S, (i // cols) * S + S))
        out.alpha_composite(ic, (x + 13, y + 2))
    dr.text((x + 2, y + 70), k[:14], fill=(220, 220, 220, 255))
out.save(os.path.join(D, 'strip.png'))
