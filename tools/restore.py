# Rebuilds the whole project folder from one game file (dokuquest.html / emberwild.html, 0.8.1 or later).
# Usage: python3 tools/restore.py GAMEFILE.html OUTDIR
# The game file holds every source module (marked "// ==== path ===="), the styles, the page,
# the patch notes, and a compressed bundle of everything else (launcher, tools, notes).
# Icons (launcher/icons/*.png) are not in it: run `python3 launcher/make_icons.py` to draw them again.
import sys, os, re, json, gzip, base64

src, out = sys.argv[1], sys.argv[2]
full = open(src, encoding='utf-8').read()
os.makedirs(out, exist_ok=True)
def write(rel, text):
    p = os.path.join(out, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8').write(text)

# 1. the bundled extras
m = re.search(r'<script type="application/octet-stream" id="dq-sources"[^>]*>([^<]+)</script>\n', full)
if m:
    for rel, text in json.loads(gzip.decompress(base64.b64decode(m.group(1)))).items(): write(rel, text)
    full = full[:m.start()] + full[m.end():]
# 2. the page body: index.html with its markers, styles, patch notes, script
body = full[full.index('<body>\n') + 7: full.rindex('\n</body>')]
s1 = body.index('<style>') + len('<style>')
s2 = body.index('</style>', s1)
css = body[s1:s2]
n1 = body.index('<template id="ember-news">') + len('<template id="ember-news">')
n2 = body.index('</template>', n1)
j1 = body.index('<script>(function () {') + len('<script>')
j2 = body.rindex('})();</script>') + len('})();')
index = body[:s1] + '/*STYLES*/' + body[s2:n1] + '/*NEWS*/' + body[n2:j1] + '/*SCRIPT*/' + body[j2:]
write('src/index.html', index)
write('src/styles.css', css)
if not os.path.exists(os.path.join(out, 'launcher/news.html')): write('launcher/news.html', body[n1:n2] + '\n')
# 3. the modules
js = body[j1:j2][len("(function () {\n'use strict';\n"):-len("\n})();")]
parts = re.split(r'^// ==== (.+?) ====\n', js, flags=re.M)
names, texts = parts[1::2], parts[2::2]
for i, (n, t) in enumerate(zip(names, texts)):
    if i < len(names) - 1: t = t[:-1]
    write('src/js/' + n, t)
print('restored', len(names), 'modules into', out, '\nmodule order (check tools/build.js ORDER matches):', ', '.join(names))
