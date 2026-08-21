#!/usr/bin/env bash
# Installiert die entpackte Nutzlast ins Benutzerverzeichnis. Bewusst ohne
# sudo: die Anwendung braucht keine Systemrechte, und ein Update muss später
# in dasselbe Verzeichnis schreiben können.
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PREFIX="${PREFIX:-$HOME/.local}"
APP_DIR="$PREFIX/lib/komparsendrehplanung"
BIN_DIR="$PREFIX/bin"
DESKTOP_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
WITH_SERVICE=0

for arg in "$@"; do
  case "$arg" in
    --with-service) WITH_SERVICE=1 ;;
    *) echo "Unbekannte Option: $arg" >&2; exit 1 ;;
  esac
done

echo "Installiere nach $APP_DIR"
mkdir -p "$APP_DIR" "$BIN_DIR" "$DESKTOP_DIR"
# Erst leeren: ein Update darf keine Dateien einer älteren Version stehen
# lassen, sonst serviert das Frontend Reste aus zwei Ständen.
rm -rf "${APP_DIR:?}/web" "${APP_DIR:?}/migrations"
cp -R "$SOURCE_DIR/komparsen" "$SOURCE_DIR/better_sqlite3.node" "$SOURCE_DIR/web" "$SOURCE_DIR/migrations" "$APP_DIR/"
cp "$SOURCE_DIR/icon.png" "$APP_DIR/"
chmod +x "$APP_DIR/komparsen"

ln -sfn "$APP_DIR/komparsen" "$BIN_DIR/komparsendrehplanung"

cat > "$DESKTOP_DIR/komparsendrehplanung.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Komparsendrehplanung
Comment=Drehplanung für Komparsen
Exec=$APP_DIR/komparsen
Icon=$APP_DIR/icon.png
Terminal=false
Categories=Office;
DESKTOP

if [ "$WITH_SERVICE" -eq 1 ]; then
  UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
  mkdir -p "$UNIT_DIR"
  # Ohne Browser-Start: als Dienst läuft die App im Hintergrund, das Fenster
  # öffnet der Nutzer selbst.
  cat > "$UNIT_DIR/komparsendrehplanung.service" <<UNIT
[Unit]
Description=Komparsendrehplanung
After=network.target

[Service]
ExecStart=$APP_DIR/komparsen
Environment=KOMPARSEN_NO_BROWSER=1
Restart=on-failure

[Install]
WantedBy=default.target
UNIT
  systemctl --user daemon-reload
  systemctl --user enable --now komparsendrehplanung.service
  echo "Dienst eingerichtet — läuft ab jetzt bei jeder Anmeldung."
fi

echo
echo "Fertig. Start über das Anwendungsmenü, den Dienst oder:"
echo "  $BIN_DIR/komparsendrehplanung"
echo "Danach erreichbar unter http://localhost:3001"
