#!/usr/bin/env bash
# Verpackt die Nutzlast aus build/release/payload in ein App-Bundle und ein DMG.
# Die Nutzlast bleibt flach in Contents/MacOS liegen, weil die App ihre Dateien
# über den Programmpfad findet (siehe apps/server/src/paths.ts).
#
# Gestartet wird nicht die Nutzlast selbst, sondern das daneben übersetzte
# Fenster aus launcher/main.swift — der Server allein hätte auf dem Mac weder
# Dock-Eintrag noch Beenden-Knopf.
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
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources" "$DIST"
cp -R "$PAYLOAD/." "$APP/Contents/MacOS/"

# Das Icon gehört nach Resources und damit ausdrücklich nicht in die Nutzlast:
# das Selbst-Update tauscht nur Contents/MacOS aus. Ein geändertes Motiv kommt
# deshalb erst mit einer neuen Installation an, nicht über ein Update.
cp "$REPO_ROOT/infra/installer/assets/icon.icns" "$APP/Contents/Resources/Komparsendrehplanung.icns"

# Für die Zielarchitektur des Runners, nicht für die des Übersetzers: die
# Release-Matrix baut Intel und Apple Silicon auf getrennten Maschinen. Das
# Mindestsystem muss zu LSMinimumSystemVersion weiter unten passen.
command -v swiftc >/dev/null || { echo "swiftc fehlt — Xcode Command Line Tools installieren"; exit 1; }
# Sprachfassung festgenagelt: Welches Xcode auf dem Runner steht, entscheidet
# GitHub. Ein Compiler, der irgendwann auf Swift 6 vorgibt, würde die Closures
# unten wegen strengerer Nebenläufigkeitsregeln zurückweisen.
swiftc -O -swift-version 5 -target "$ARCH-apple-macos11" \
  -o "$APP/Contents/MacOS/Komparsendrehplanung" \
  "$REPO_ROOT/infra/installer/macos/launcher/main.swift"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Komparsendrehplanung</string>
  <key>CFBundleDisplayName</key><string>Komparsendrehplanung</string>
  <key>CFBundleIdentifier</key><string>com.github.cpr-production.komparsendrehplanung</string>
  <key>CFBundleExecutable</key><string>Komparsendrehplanung</string>
  <key>CFBundleIconFile</key><string>Komparsendrehplanung</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleVersion</key><string>$VERSION</string>
  <key>CFBundleShortVersionString</key><string>$VERSION</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
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

Danach öffnet sich der Browser auf http://localhost:3001, und daneben
ein kleines Fenster "Komparsendrehplanung".

Dieses kleine Fenster IST die laufende Anwendung. Solange es offen ist,
ist der Drehplan erreichbar. Zum Beenden das Fenster schließen oder
darin auf "Beenden" klicken. Nur den Browser-Tab zu schließen genügt
nicht — dann läuft die Anwendung im Hintergrund weiter.

Fragen und Fehler:
https://github.com/CPR-Production/Komparsendrehplanung/issues
README

DMG="$DIST/Komparsendrehplanung-$VERSION-macos-$ARCH.dmg"
rm -f "$DMG"
hdiutil create -volname "Komparsendrehplanung" -srcfolder "$STAGING" -ov -format UDZO "$DMG" >/dev/null

echo "✓ $DMG"
