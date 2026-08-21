#!/usr/bin/env bash
# Schnürt die Nutzlast samt install.sh zu einem tar.gz. Ein Archiv statt eines
# .deb, weil die App bewusst ohne Systemrechte ins Benutzerverzeichnis geht.
set -euo pipefail

VERSION="${1:?Version fehlt: package.sh <version>}"
VERSION="${VERSION#v}"
ARCH="$(uname -m)"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PAYLOAD="$REPO_ROOT/build/release/payload"
STAGING="$REPO_ROOT/build/release/tar/Komparsendrehplanung"
DIST="$REPO_ROOT/build/release/dist"

[ -d "$PAYLOAD" ] || { echo "Keine Nutzlast in $PAYLOAD — vorher npm run build:release"; exit 1; }

rm -rf "$(dirname "$STAGING")"
mkdir -p "$STAGING" "$DIST"
cp -R "$PAYLOAD/." "$STAGING/"
cp "$REPO_ROOT/infra/installer/linux/install.sh" "$STAGING/"
cp "$REPO_ROOT/infra/installer/assets/icon-512.png" "$STAGING/icon.png"

ARCHIVE="$DIST/Komparsendrehplanung-$VERSION-linux-$ARCH.tar.gz"
rm -f "$ARCHIVE"
tar -czf "$ARCHIVE" -C "$(dirname "$STAGING")" Komparsendrehplanung

echo "✓ $ARCHIVE"
