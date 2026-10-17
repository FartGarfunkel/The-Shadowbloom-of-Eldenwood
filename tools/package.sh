#!/usr/bin/env bash
# Builds the standalone versions of Shadowbloom into dist/release/:
#   Shadowbloom-<version>-x86_64.AppImage       Linux: make it executable and run it
#   Shadowbloom-<version>-windows-x64.zip       Windows: unzip anywhere, run Shadowbloom.exe
#   Shadowbloom-<version>-linux-x64.tar.gz      Linux without AppImage support: unpack, run ./emberwild
#   Shadowbloom-<version>-web.zip               installable web app for phones (see launcher/web/README.txt)
#
# Needs: node, curl, unzip, zip, tar. Downloads Electron and appimagetool from
# GitHub the first time (kept in .cache/ for next time).
#   bash tools/package.sh            all of the above
#   bash tools/package.sh linux      just the Linux builds
#   bash tools/package.sh windows    just the Windows build
#   bash tools/package.sh web        just the web app
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
ELECTRON=41.5.0
WHAT="${1:-all}"
CACHE="$ROOT/.cache"
OUT="$ROOT/dist/release"
mkdir -p "$CACHE" "$OUT"

node tools/build.js
VERSION="$(node -e "console.log(require('./dist/desktop/package.json').version)")"
FULLVER="$(grep -o "GAME_VERSION = '[^']*'" src/js/save/storage.js | cut -d"'" -f2)"
SHOWVER="$(echo "$FULLVER" | sed 's/-alpha//')"   # how the game shows it: 0.9.0-alpha.8 is 0.9.0.8
echo "Packaging Shadowbloom $SHOWVER"

fetch() { # url file
  if [ ! -s "$CACHE/$2" ]; then echo "  downloading $2" >&2; curl -fSL --retry 3 -o "$CACHE/$2.part" "$1"; mv "$CACHE/$2.part" "$CACHE/$2"; fi
}
electron_for() { # platform-arch -> unpacked folder
  local zipf="electron-v$ELECTRON-$1.zip"
  fetch "https://github.com/electron/electron/releases/download/v$ELECTRON/$zipf" "$zipf"
  local dir="$CACHE/electron-$1"
  if [ ! -d "$dir" ]; then mkdir -p "$dir"; unzip -q "$CACHE/$zipf" -d "$dir"; fi
  echo "$dir"
}
app_into() { # resources folder
  rm -rf "$1/app" "$1/default_app.asar"
  mkdir -p "$1/app"
  cp -a dist/desktop/. "$1/app/"
}

if [ "$WHAT" = all ] || [ "$WHAT" = linux ]; then
  echo "Linux…"
  EL="$(electron_for linux-x64)"
  STAGE="$CACHE/stage-linux"; rm -rf "$STAGE"; mkdir -p "$STAGE"
  APPDIR="$STAGE/Emberwild.AppDir"; mkdir -p "$APPDIR/usr/lib/emberwild"
  cp -a "$EL/." "$APPDIR/usr/lib/emberwild/"
  mv "$APPDIR/usr/lib/emberwild/electron" "$APPDIR/usr/lib/emberwild/emberwild"
  app_into "$APPDIR/usr/lib/emberwild/resources"
  cat > "$APPDIR/AppRun" <<'EOS'
#!/bin/sh
HERE="$(dirname "$(readlink -f "$0")")"
# AppImages can't carry Chromium's setuid sandbox helper; the game only ever loads its own page.
exec "$HERE/usr/lib/emberwild/emberwild" --no-sandbox "$@"
EOS
  chmod +x "$APPDIR/AppRun"
  cat > "$APPDIR/emberwild.desktop" <<EOS
[Desktop Entry]
Type=Application
Name=Shadowbloom
Comment=Voxel sandbox: dig, build, survive and explore
Exec=emberwild %U
Icon=emberwild
Categories=Game;
Terminal=false
StartupWMClass=Shadowbloom
X-AppImage-Version=$SHOWVER
EOS
  cp launcher/icons/icon-256.png "$APPDIR/emberwild.png"
  mkdir -p "$APPDIR/usr/share/icons/hicolor/256x256/apps" && cp launcher/icons/icon-256.png "$APPDIR/usr/share/icons/hicolor/256x256/apps/emberwild.png"
  ln -sf emberwild.png "$APPDIR/.DirIcon"
  fetch "https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage" appimagetool-x86_64.AppImage
  fetch "https://github.com/AppImage/type2-runtime/releases/download/continuous/runtime-x86_64" runtime-x86_64
  chmod +x "$CACHE/appimagetool-x86_64.AppImage"
  rm -f "$OUT/Shadowbloom-$SHOWVER-x86_64.AppImage"
  ARCH=x86_64 APPIMAGE_EXTRACT_AND_RUN=1 "$CACHE/appimagetool-x86_64.AppImage" --no-appstream --runtime-file "$CACHE/runtime-x86_64" \
    "$APPDIR" "$OUT/Shadowbloom-$SHOWVER-x86_64.AppImage"
  chmod +x "$OUT/Shadowbloom-$SHOWVER-x86_64.AppImage"
  # the same thing as a plain folder, for systems without FUSE
  rm -rf "$STAGE/Shadowbloom-linux-x64"; cp -a "$APPDIR/usr/lib/emberwild" "$STAGE/Shadowbloom-linux-x64"
  printf '#!/bin/sh\ncd "$(dirname "$(readlink -f "$0")")"\nexec ./emberwild --no-sandbox "$@"\n' > "$STAGE/Shadowbloom-linux-x64/run-emberwild.sh"; chmod +x "$STAGE/Shadowbloom-linux-x64/run-emberwild.sh"
  tar -C "$STAGE" -czf "$OUT/Shadowbloom-$SHOWVER-linux-x64.tar.gz" Shadowbloom-linux-x64
fi

if [ "$WHAT" = all ] || [ "$WHAT" = windows ]; then
  echo "Windows…"
  EL="$(electron_for win32-x64)"
  STAGE="$CACHE/stage-win"; rm -rf "$STAGE"; mkdir -p "$STAGE/Shadowbloom"
  cp -a "$EL/." "$STAGE/Shadowbloom/"
  mv "$STAGE/Shadowbloom/electron.exe" "$STAGE/Shadowbloom/Shadowbloom.exe"
  app_into "$STAGE/Shadowbloom/resources"
  cp launcher/icons/icon.ico "$STAGE/Shadowbloom/Shadowbloom.ico"
  printf 'Shadowbloom %s for Windows\r\n\r\nRun Shadowbloom.exe. Keep it in this folder with its other files.\r\nTo put it on your Start menu or desktop: right-click Shadowbloom.exe > Show more options > Send to > Desktop (create shortcut).\r\nIf Windows SmartScreen warns about an unknown app: More info > Run anyway.\r\nUpdates: the launcher installs new versions by itself (Options > Updates from GitHub), or use Options > Install update...\r\nYour worlds are kept in %%APPDATA%%\\Shadowbloom, so a newer version finds them.\r\n' "$SHOWVER" > "$STAGE/Shadowbloom/README.txt"
  rm -f "$OUT/Shadowbloom-$SHOWVER-windows-x64.zip"
  (cd "$STAGE" && zip -qr -9 "$OUT/Shadowbloom-$SHOWVER-windows-x64.zip" Shadowbloom)
fi

if [ "$WHAT" = all ] || [ "$WHAT" = web ]; then
  echo "Web…"
  rm -f "$OUT/Shadowbloom-$FULLVER-web.zip"
  (cd dist && rm -rf Shadowbloom-web && cp -a web Shadowbloom-web && zip -qr -9 "$OUT/Shadowbloom-$FULLVER-web.zip" Shadowbloom-web && rm -rf Shadowbloom-web)
fi

ls -lh "$OUT"
