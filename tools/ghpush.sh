#!/usr/bin/env bash
# Sends the current build to the Shadowbloom GitHub repository; its workflow (tools/github/release.yml)
# then packages the apps if needed and publishes the release the launchers update from.
#   bash tools/ghpush.sh CLONE_DIR      (a clone of the repository named by UPDATE_SOURCE)
set -euo pipefail
cd "$(dirname "$0")/.."
CLONE="${1:?Where is the clone of the repository?}"
node tools/build.js >/dev/null
FULLVER="$(grep -o "GAME_VERSION = '[^']*'" src/js/save/storage.js | cut -d"'" -f2)"
SHOWVER="$(echo "$FULLVER" | sed 's/-alpha//')"
mkdir -p "$CLONE/release/icons" "$CLONE/.github/workflows"
cp dist/shadowbloom.html "$CLONE/release/shadowbloom.html"
cp tools/restore.py "$CLONE/release/restore.py"
cp launcher/icons/* "$CLONE/release/icons/"
cp tools/github/release.yml "$CLONE/.github/workflows/release.yml"
# the README says which version is out
sed -i "s/^\*\*Current version:\*\* .*/**Current version:** Alpha $SHOWVER/" "$CLONE/README.md"
cd "$CLONE"
git add -A
git -c user.name="${GIT_NAME:-FartGarfunkel}" -c user.email="${GIT_EMAIL:-FartGarfunkel@users.noreply.github.com}" commit -q -m "Shadowbloom $SHOWVER" ${GHPUSH_TRAILER:+-m "$GHPUSH_TRAILER"} || { echo "Nothing new to send."; exit 0; }
git fetch -q origin main && git rebase -q FETCH_HEAD
git push -q origin HEAD:main
echo "Sent Shadowbloom $SHOWVER; GitHub is publishing the release."
