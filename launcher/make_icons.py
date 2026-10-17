#!/usr/bin/env python3
"""Draws The Shadowbloom of Eldenwood's app icon (a mossy forest block with the dark
shadowbloom flower on top) as pixel art and writes every size the desktop and web launchers need.

    python3 launcher/make_icons.py        -> launcher/icons/*.png
"""
import os
import random
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'icons')
N = 32


def inside(poly, x, y):
    """Point in polygon (pixel centre)."""
    px, py = x + 0.5, y + 0.5
    hit = False
    for i in range(len(poly)):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % len(poly)]
        if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1) + x1:
            hit = not hit
    return hit


def art():
    rnd = random.Random(7)
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    p = im.load()
    top = [(16, 3), (31, 10.5), (16, 18), (1, 10.5)]
    left = [(1, 10.5), (16, 18), (16, 31), (1, 23.5)]
    right = [(16, 18), (31, 10.5), (31, 23.5), (16, 31)]
    greens = [(58, 104, 46), (70, 120, 52), (48, 88, 40), (82, 134, 62)]
    dirt = [(84, 62, 74), (72, 52, 66), (98, 72, 88), (62, 44, 58)]
    for y in range(N):
        for x in range(N):
            if inside(top, x, y):
                p[x, y] = greens[rnd.randrange(4)] + (255,)
            elif inside(left, x, y) or inside(right, x, y):
                shade = 0.78 if inside(left, x, y) else 0.62
                face = left if inside(left, x, y) else right
                edge_y = face[0][1] + (face[1][1] - face[0][1]) * ((x + 0.5 - face[0][0]) / (face[1][0] - face[0][0]))
                depth = y + 0.5 - edge_y
                c = greens[rnd.randrange(4)] if depth < 2.2 + rnd.random() * 1.6 else dirt[rnd.randrange(4)]
                # purple veins of the bloom creeping through the soil
                if depth > 4 and rnd.random() < 0.06: c = (150, 80, 210)
                p[x, y] = tuple(int(v * shade) for v in c) + (255,)
    solid = [[p[x, y][3] > 0 for x in range(N)] for y in range(N)]
    for y in range(N):
        for x in range(N):
            if not solid[y][x] and any(0 <= x + dx < N and 0 <= y + dy < N and solid[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                p[x, y] = (16, 10, 20, 255)
    # the shadowbloom: dark petals round a glowing heart, on a stem
    bloom = [
        '....kk.kk....',
        '...kPPkPPk...',
        '..kPpPkPpPk..',
        '.kkPPpLpPPkk.',
        'kPPpLGGGLpPPk',
        'kPpLGWWWGLpPk',
        '.kkPLGWGLPkk.',
        '..kPPpLpPPk..',
        '...kPPkPPk...',
        '....kksk.....',
        '......s......',
    ]
    pal = {'k': (24, 10, 34), 'P': (70, 26, 110), 'p': (110, 50, 170), 'L': (176, 110, 255), 'G': (214, 170, 255), 'W': (250, 236, 255), 's': (40, 90, 40)}
    ox, oy = 10, 0
    for j, row in enumerate(bloom):
        for i, ch in enumerate(row):
            x, y = ox + i, oy + j
            if ch != '.' and 0 <= x < N and 0 <= y < N:
                p[x, y] = pal[ch] + (255,)
    return im


def main():
    os.makedirs(OUT, exist_ok=True)
    base = art()
    for s in (32, 64, 128, 256, 512, 1024):
        base.resize((s, s), Image.NEAREST).save(os.path.join(OUT, f'icon-{s}.png'))
    base.resize((16, 16), Image.BOX).save(os.path.join(OUT, 'icon-16.png'))
    base.resize((192, 192), Image.NEAREST).save(os.path.join(OUT, 'icon-192.png'))
    base.resize((48, 48), Image.NEAREST).save(os.path.join(OUT, 'icon-48.png'))
    # Android "maskable": the art inside the safe circle on the game's dark background
    m = Image.new('RGBA', (512, 512), (16, 10, 22, 255))
    m.alpha_composite(base.resize((288, 288), Image.NEAREST), (112, 104))
    m.save(os.path.join(OUT, 'icon-maskable-512.png'))
    # Windows .ico with the usual sizes
    base.resize((256, 256), Image.NEAREST).save(os.path.join(OUT, 'icon.ico'), sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print('icons written to', OUT)


if __name__ == '__main__':
    main()
