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

# Liegt sichtbar im selben Fenster. Ohne das steht der Nutzer beim ersten Start
# vor einem Dialog, dessen blauer Vorgabeknopf die App in den Papierkorb wirft.
cat > "$STAGING/Bitte zuerst lesen.txt" <<'README'
Komparsendrehplanung — erster Start
===================================

1. Komparsendrehplanung.app nach rechts auf "Applications" ziehen.
2. Die App dort per Doppelklick starten.

Beim ersten Mal meldet macOS: "Apple konnte nicht überprüfen, ob
'Komparsendrehplanung.app' frei von Schadsoftware ist."

Das ist erwartet. Diese Software ist quelloffen und nicht bei Apple
registriert — dafür müsste das Projekt jährlich zahlen. Der Hinweis sagt
nichts darüber aus, ob die App in Ordnung ist.

So kommen Sie weiter:

  1. Im Dialog auf "Fertig" klicken.
     NICHT auf "In den Papierkorb legen" — das ist zwar der blau
     hervorgehobene Knopf, aber der falsche.

  2. Systemeinstellungen öffnen, dort "Datenschutz & Sicherheit"
     auswählen und bis zum Abschnitt "Sicherheit" hinunterscrollen.

  3. Dort steht "Komparsendrehplanung.app" mit dem Knopf
     "Dennoch öffnen". Darauf klicken.

  4. Mit Passwort oder Touch ID bestätigen, dann noch einmal "Öffnen".

Der Knopf erscheint erst, nachdem Sie die App einmal zu starten versucht
haben, und bleibt danach etwa eine Stunde lang stehen. Ist die Ausnahme
einmal gesetzt, startet die App künftig per Doppelklick wie jedes andere
Programm.

Danach öffnet sich der Browser auf http://localhost:3001.
Das Fenster, das dabei aufgeht, gehört dazu — es zu schließen beendet
die Anwendung.

Fragen und Fehler:
https://github.com/CPR-Production/Komparsendrehplanung/issues
README

DMG="$DIST/Komparsendrehplanung-$VERSION-macos-$ARCH.dmg"
rm -f "$DMG"
hdiutil create -volname "Komparsendrehplanung" -srcfolder "$STAGING" -ov -format UDZO "$DMG" >/dev/null

echo "✓ $DMG"
