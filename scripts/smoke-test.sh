#!/usr/bin/env bash
# Startet die frisch gepackte Binary und prüft, dass sie wirklich hochkommt.
# Ein Release, das erst beim Nutzer am fehlenden Addon oder an einer nicht
# gefundenen Migration scheitert, ist der teuerste denkbare Fehler — deshalb
# läuft das im Build, nicht erst danach.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PAYLOAD="$REPO_ROOT/build/release/payload"
EXE="$PAYLOAD/komparsen"
[ -f "$EXE" ] || EXE="$PAYLOAD/komparsen.exe"
[ -f "$EXE" ] || { echo "Keine gepackte Binary in $PAYLOAD"; exit 1; }

PORT=3987
WORK="$(mktemp -d)"
# Das wait nach dem kill unterdrückt die "Terminated"-Meldung der Shell — die
# sähe im Build-Log wie ein Fehlschlag aus. Der Exit-Code wird von Hand
# durchgereicht, sonst gewönne der des abgeschossenen Servers.
cleanup() {
  local status=$?
  # Beide Zeilen dürfen nicht scheitern: unter set -e risse ein nicht-null
  # Ergebnis von wait (der abgeschossene Server meldet 143) die Funktion ab,
  # bevor der echte Exit-Code unten durchgereicht wird.
  kill "${PID:-}" 2>/dev/null || true
  wait "${PID:-}" 2>/dev/null || true
  rm -rf "$WORK"
  exit "$status"
}
trap cleanup EXIT

KOMPARSEN_NO_BROWSER=1 PORT="$PORT" DATABASE_PATH="$WORK/smoke.sqlite" "$EXE" &
PID=$!

# Der erste Start legt die Datenbank an und spielt die Migrationen ein, das
# darf einen Moment dauern.
curl --silent --fail --retry 30 --retry-delay 1 --retry-connrefused \
  "http://localhost:$PORT/api/health" > /dev/null

# Ein Schreibvorgang, weil erst der beweist, dass die Migrationen durchliefen —
# /api/health antwortet auch ohne Tabellen.
project="$(curl --silent --fail -X POST "http://localhost:$PORT/api/projects" \
  -H 'Content-Type: application/json' -d '{"name":"Rauchtest"}')"
case "$project" in
  *'"name":"Rauchtest"'*) ;;
  *) echo "Projekt konnte nicht angelegt werden: $project"; exit 1 ;;
esac

# Das Frontend muss aus der Nutzlast kommen, nicht aus dem Quellbaum.
curl --silent --fail "http://localhost:$PORT/" | grep -q "<title>" \
  || { echo "Frontend wird nicht ausgeliefert"; exit 1; }

reported="$(curl --silent --fail "http://localhost:$PORT/api/version")"
echo "Rauchtest bestanden: $reported"

if [ -n "${VERSION:-}" ]; then
  case "$reported" in
    *"\"version\":\"$VERSION\""*) ;;
    *) echo "Version passt nicht zum Tag: erwartet $VERSION, gemeldet $reported"; exit 1 ;;
  esac
fi
