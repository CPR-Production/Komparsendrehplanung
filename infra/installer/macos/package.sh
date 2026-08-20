#!/usr/bin/env bash
# Verpackt die Nutzlast aus build/release/payload in ein App-Bundle und ein DMG.
# Die Nutzlast bleibt flach in Contents/MacOS liegen, weil die App ihre Dateien
# über den Programmpfad findet (siehe apps/server/src/paths.ts).
set -euo pipefail

VERSION="${1:?Version fehlt: package.sh <version>}"
VERSION="${VERSION#v}"
ARCH="$(uname -m)"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PAYLOAD="$REPO_ROOT/build/release/payload"
STAGING="$REPO_ROOT/build/release/dmg"
DIST="$REPO_ROOT/build/release/dist"
APP="$STAGING/Komparsendrehplanung.app"

[ -d "$PAYLOAD" ] || { echo "Keine Nutzlast in $PAYLOAD — vorher npm run build:release"; exit 1; }

rm -rf "$STAGING"
mkdir -p "$APP/Contents/MacOS" "$DIST"
cp -R "$PAYLOAD/." "$APP/Contents/MacOS/"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Komparsendrehplanung</string>
  <key>CFBundleDisplayName</key><string>Komparsendrehplanung</string>
  <key>CFBundleIdentifier</key><string>com.github.cpr-production.komparsendrehplanung</string>
  <key>CFBundleExecutable</key><string>komparsen</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleVersion</key><string>$VERSION</string>
  <key>CFBundleShortVersionString</key><string>$VERSION</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
</dict>
</plist>
PLIST

# Ad-hoc über das ganze Bundle: ohne Signatur startet die Binary auf Apple
# Silicon gar nicht. Den Gatekeeper-Hinweis beim ersten Öffnen ersetzt das
# nicht — dafür bräuchte es eine Developer-ID samt Notarisierung.
codesign --force --deep --sign - "$APP"

# Der Symlink macht aus dem Fenster ein Ziehziel: App links, Programme rechts.
ln -sfn /Applications "$STAGING/Applications"

DMG="$DIST/Komparsendrehplanung-$VERSION-macos-$ARCH.dmg"
rm -f "$DMG"
hdiutil create -volname "Komparsendrehplanung" -srcfolder "$STAGING" -ov -format UDZO "$DMG" >/dev/null

echo "✓ $DMG"
