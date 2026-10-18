# The campaign written out as a reference ("bible"): towns, places, people, quests stage by stage, letters, creatures.
# Usage: python3 tools/campaign_bible.py OUT.md
import sys, os, json
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else 'campaign_bible.md'
URL = 'file://' + os.path.abspath('dist/shadowbloom.html')
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(); pg.goto(URL); pg.wait_for_timeout(3000)
    D = pg.evaluate("""() => { const C = window.__dnd.CAMPAIGNS.shadowbloom; const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => typeof v === 'function' ? undefined : v));
      return { title: C.title, intro: C.intro, towns: strip(C.towns || {}), places: strip(C.places || {}), npcs: Object.fromEntries(Object.entries(C.npcs).map(([k, n]) => [k, { name: n.name, title: n.title, town: n.town, place: n.place, dungeon: n.dungeon, about: n.about, shop: !!n.shop, if: n.if, until: n.until }])),
        quests: strip(C.quests), letters: Object.fromEntries(Object.entries(C.letters || {}).map(([k, l]) => [k, l.title])), creatures: Object.fromEntries(Object.entries(C.creatures || {}).map(([k, c]) => [k, { name: c.name, hp: c.hp, ac: c.ac, boss: !!c.boss }])), endings: strip(C.endings || null), triggers: Object.keys(C.triggers || {}) }; }""")
    b.close()
L = []
w = L.append
w(f"# {D.get('title') or 'The Shadowbloom of Eldenwood'}: campaign bible\n")
w("Generated from the game's campaign data (src/js/campaign/sb_*.js) by tools/campaign_bible.py. Spoilers throughout.\n")
intro = D.get('intro')
if isinstance(intro, list):
    w("## Opening narration\n")
    for pgx in intro:
        t = pgx.get('text') if isinstance(pgx, dict) else str(pgx)
        if t: w('> ' + t.replace('\n', '\n> ') + '\n')
w("## Towns\n")
for k, t in D['towns'].items():
    w(f"- **{t.get('name', k)}** (`{k}`){' · ' + t.get('size') if t.get('size') else ''}{': ' + t.get('about') if t.get('about') else ''}")
w("\n## Places\n")
for k, pl in D['places'].items():
    w(f"- **{pl.get('name', k)}** (`{k}`, {pl.get('kind', 'site')}){': ' + pl.get('about') if pl.get('about') else ''}")
w("\n## Quests\n")
for k, q in D['quests'].items():
    w(f"### {q.get('title', k)} (`{k}`){' · side quest' if q.get('side') else ''}\n")
    if q.get('text'): w(q['text'] + '\n')
    for sk, st in (q.get('stages') or {}).items():
        w(f"1. **{st.get('goal', sk)}** (`{sk}`){' — ' + st.get('text') if st.get('text') else ''}")
    w('')
w("## People\n")
for k, n in D['npcs'].items():
    where = n.get('town') or n.get('place') or n.get('dungeon') or ''
    w(f"- **{n.get('name', k)}**{', ' + n['title'] if n.get('title') else ''} (`{k}`{', ' + str(where) if where else ''}){': ' + n['about'] if n.get('about') else ''}")
w("\n## Letters and pages\n")
for k, t in D['letters'].items(): w(f"- {t} (`{k}`)")
w("\n## Creatures\n")
for k, c in D['creatures'].items(): w(f"- {c.get('name', k)} (`{k}`): {c.get('hp')} hp, AC {c.get('ac')}{' · boss' if c.get('boss') else ''}")
w("\n## Story triggers\n")
w(', '.join(f'`{t}`' for t in D['triggers']))
open(OUT, 'w').write('\n'.join(L) + '\n')
print('wrote', OUT, len(L), 'lines')
