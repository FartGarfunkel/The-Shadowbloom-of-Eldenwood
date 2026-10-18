#!/usr/bin/env bash
# Puts the current build on GitHub Releases, where the desktop launcher finds it by itself (0.9.0.40).
#
#   bash tools/publish.sh owner/name          the game file, plus the desktop apps when the app changed
#   bash tools/publish.sh owner/name --app    always package and attach the desktop apps
#   bash tools/publish.sh                     the repository named by UPDATE_SOURCE in src/js/save/storage.js
#
# Each release holds dokuquest.html and app.json. app.json says which game it is and where the newest
# desktop apps are (they stay on the release that brought them, so game-only releases stay small).
# The release is made as a draft, filled, and only then published, so a launcher never sees half of one.
# Needs gh (GitHub's command line tool) with push access to the repository. Uses the REST API only.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=""; FORCE_APP=""
for a in "$@"; do case "$a" in --app) FORCE_APP=1 ;; *) SRC="$a" ;; esac; done
[ -n "$SRC" ] || SRC="$(grep -o "UPDATE_SOURCE = '[^']*'" src/js/save/storage.js | cut -d"'" -f2)"
[ -n "$SRC" ] || { echo "Which repository? bash tools/publish.sh owner/name" >&2; exit 1; }

node tools/build.js
# (alpha 5) the gate: never publish a build that doesn't reach its main menu, throws while starting, or has broken
# campaign links (tools/release_check.py). SKIP_CHECK=1 skips it (only for a deliberate emergency re-publish).
if [ -z "${SKIP_CHECK:-}" ]; then
  CHK="$(mktemp -d)"
  python3 -m venv "$CHK/venv" && "$CHK/venv/bin/pip" install --quiet playwright==1.56.0 \
    && "$CHK/venv/bin/python" -m playwright install --with-deps chromium > "$CHK/install.log" 2>&1 \
    || { echo "Could not set up the release check (see the log above); not publishing." >&2; cat "$CHK/install.log" >&2 || true; exit 1; }
  "$CHK/venv/bin/python" tools/release_check.py dist/shadowbloom.html 60 || { echo "The release check failed: not publishing." >&2; exit 1; }
fi
FULLVER="$(grep -o "GAME_VERSION = '[^']*'" src/js/save/storage.js | cut -d"'" -f2)"
SHOWVER="$(echo "$FULLVER" | sed 's/-alpha//')"
TAG="v$SHOWVER"
LID="$(node -e "console.log(require('./dist/desktop/package.json').launcherId)")"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
api() { gh api -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" "$@"; }
js() { node -e "$1" "${@:2}"; }

# the app.json of the newest release so far, if any
mkdir -p "$TMP/prev"
if api "repos/$SRC/releases/latest" > "$TMP/latest.json" 2>/dev/null; then
  AURL="$(js "const r = require(process.argv[1]); const a = (r.assets || []).find(a => a.name === 'app.json'); console.log(a ? a.url + ' ' + a.browser_download_url : '')" "$TMP/latest.json")"
  if [ -n "$AURL" ]; then
    gh api -H "Accept: application/octet-stream" "${AURL%% *}" > "$TMP/prev/app.json" 2>/dev/null \
      || curl -fsSL "${AURL#* }" -o "$TMP/prev/app.json" 2>/dev/null || rm -f "$TMP/prev/app.json"
    node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" "$TMP/prev/app.json" 2>/dev/null || rm -f "$TMP/prev/app.json"
  fi
fi
PREV_LID=""; [ -s "$TMP/prev/app.json" ] && PREV_LID="$(js "console.log(require(process.argv[1]).launcherId || '')" "$TMP/prev/app.json")"
FILES=(dist/shadowbloom.html "$TMP/app.json")
if [ -n "$FORCE_APP" ] || [ "$PREV_LID" != "$LID" ]; then
  echo "The desktop app changed (or --app): packaging it…"
  bash tools/package.sh linux
  bash tools/package.sh windows
  APPIMG="dist/release/Shadowbloom-$SHOWVER-x86_64.AppImage"; WINZIP="dist/release/Shadowbloom-$SHOWVER-windows-x64.zip"
  FILES+=("$APPIMG" "$WINZIP")
  APP_ARGS="$APPIMG $WINZIP"
else
  echo "The desktop app is unchanged: this release carries the game only."
  APP_ARGS=""
fi

node - "$TMP" "$TAG" "$FULLVER" "$LID" $APP_ARGS <<'EOS'
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const [tmp, tag, fullver, lid, appimg, winzip] = process.argv.slice(2);
const sum = (f) => ({ size: fs.statSync(f).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') });
let prev = {}; try { prev = JSON.parse(fs.readFileSync(path.join(tmp, 'prev/app.json'), 'utf8')); } catch (e) { /* first release */ }
const app = appimg
  ? { launcherId: lid, appVersion: fullver,
      linux: Object.assign({ tag, name: path.basename(appimg) }, sum(appimg)),
      windows: Object.assign({ tag, name: path.basename(winzip) }, sum(winzip)) }
  : { launcherId: prev.launcherId, appVersion: prev.appVersion, linux: prev.linux, windows: prev.windows };
const out = Object.assign({ game: Object.assign({ version: fullver }, sum('dist/shadowbloom.html')) }, app);
fs.writeFileSync(path.join(tmp, 'app.json'), JSON.stringify(out, null, 2));
// release notes: this version's entry from the news, plus where to get things
const news = fs.readFileSync('launcher/news.html', 'utf8');
const art = (news.match(/<article[\s\S]*?<\/article>/) || [''])[0];
const lines = art.replace(/<span class="date">[^<]*<\/span>/g, '').replace(/<h2>/g, '## ').replace(/<li>/g, '- ').replace(/<\/?(b|strong)>/g, '**').replace(/<\/?(i|em)>/g, '*')
  .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .split('\n').map(l => l.trim()).filter(Boolean);
// a blank line between blocks, none between the points of a list
const text = lines.map((l, i) => (i && !(l.startsWith('- ') && lines[i - 1].startsWith('- ')) ? '\n' : '') + l).join('\n');
const get = app.linux ? `\n\n**Desktop app** (released with ${app.linux.tag}): Linux \`${app.linux.name}\` · Windows \`${app.windows.name}\`` : '';
fs.writeFileSync(path.join(tmp, 'notes.md'), (text || 'Shadowbloom ' + tag) + get + '\n\nThe desktop app installs new versions by itself each time the launcher opens. Or download `shadowbloom.html` and use Options → Install update…\n');
EOS

# the release: reuse a draft or release with this tag, else start a draft
if api "repos/$SRC/releases/tags/$TAG" > "$TMP/rel.json" 2>/dev/null; then
  RID="$(js "console.log(require(process.argv[1]).id)" "$TMP/rel.json")"; echo "Release $TAG exists (id $RID): replacing its files"
else
  RID="$(api -X POST "repos/$SRC/releases" -f tag_name="$TAG" -f target_commitish=main -f name="Shadowbloom $SHOWVER" -F body=@"$TMP/notes.md" -F draft=true --jq .id)"
  api "repos/$SRC/releases/$RID" > "$TMP/rel.json"
  echo "Draft release $TAG (id $RID)"
fi
for f in "${FILES[@]}"; do
  n="$(basename "$f")"
  old="$(js "const r = require(process.argv[1]); const a = (r.assets || []).find(a => a.name === process.argv[2]); console.log(a ? a.id : '')" "$TMP/rel.json" "$n")"
  [ -n "$old" ] && api -X DELETE "repos/$SRC/releases/assets/$old" >/dev/null
  echo "  uploading $n ($(du -h "$f" | cut -f1))"
  for try in 1 2 3; do
    if gh api -X POST -H "Content-Type: application/octet-stream" "https://uploads.github.com/repos/$SRC/releases/$RID/assets?name=$n" --input "$f" --jq .size > "$TMP/up.txt"; then break; fi
    [ "$try" = 3 ] && { echo "Upload of $n failed; the release stays a draft." >&2; exit 1; }
    echo "  retrying…"; sleep 5
  done
  [ "$(cat "$TMP/up.txt")" = "$(stat -c %s "$f")" ] || { echo "Upload of $n came out the wrong size; the release stays a draft." >&2; exit 1; }
done
api -X PATCH "repos/$SRC/releases/$RID" -F draft=false -f make_latest=true -f name="Shadowbloom $SHOWVER" -F body=@"$TMP/notes.md" >/dev/null
echo "Published Shadowbloom $SHOWVER: https://github.com/$SRC/releases/tag/$TAG"
