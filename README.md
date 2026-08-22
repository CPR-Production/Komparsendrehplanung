# Komparsendrehplanung

Drehplanung für Komparsen und Supporting Artists. Ersetzt die Excel-Vorlage, mit
der solche Pläne sonst gepflegt werden — und behält deren Farbhierarchie und
Spaltenaufbau bewusst bei, damit niemand die gewohnte Lesart neu lernen muss.

Die App läuft lokal auf einem Rechner, speichert alles in einer einzelnen
SQLite-Datei und wird im Browser bedient.

## Was sie kann

- **Drehtage als Sets** mit SD-Nummer, Datum, Drehzeit und mehreren Set-Namen samt Adressen
- **Szenen** mit Nummer, Innen/Außen, Tag/Nacht, Script Time, Location und Synopsis
- **Rollen** je Szene, mit Fuzzle-ID und Bedarf pro Kategorie
- **Frei definierbare Kategorien** in Gruppen (Vorgabe: „Supporting artists" mit
  `normal, special, Feat., KD, Double`), pro Projekt anpassbar
- **Wechsel** („Changes"), die hinter einer Szene verankert sind
- **Sortieren per Drag & Drop** für Sets und Szenen
- **Sperre gegen versehentliche Änderungen**: ein Schloss in der Kopfleiste
  schaltet zwischen Ansehen und Bearbeiten — wer den Plan nur liest, verstellt
  nichts aus Versehen
- **Summen pro Kategorie und Gruppe** direkt im Set-Kopf, spaltenbündig zum Raster
- **Deutsch und Englisch** umschaltbar, Drehplan eingeschlossen; die
  Spaltenköpfe bleiben in beiden Sprachen die Begriffe der Vorlage

## Die Regel, die den Plan ausmacht

Jeder Kategorie-Eintrag ist entweder **neu** oder **wdh.** (wiederverwendet).
Nur die neuen zählen in die Tagessumme:

- **Total/Scene** summiert alles in einer Szene, unabhängig davon.
- **Die Summenzeile im Set-Kopf** („Summe neu") zählt **nur neue** Einträge —
  eine Komparsin, die an einem Drehtag in einer weiteren Szene nochmal auftritt,
  erhöht den Tagesbedarf nicht.

Wer an dieser Logik etwas ändert, sollte
[`packages/shared/src/calculations.ts`](packages/shared/src/calculations.ts)
lesen; das ist die einzige Stelle im Projekt mit Tests.

## Installieren

Fertige Installer liegen auf der
[Releases-Seite](https://github.com/CPR-Production/Komparsendrehplanung/releases)
unter **Assets**:

| Datei | Für |
| --- | --- |
| `…-macos-arm64.dmg` | Mac mit Apple Silicon (M1 und neuer) |
| `…-macos-x86_64.dmg` | Mac mit Intel-Prozessor |
| `…-windows-x64.exe` | Windows |
| `…-linux-x86_64.tar.gz` | Linux |

Die `payload-…`-Archive daneben gehören zur eingebauten Update-Funktion und sind
nicht zum Installieren von Hand gedacht.

Danach läuft die App unter <http://localhost:3001>; der Browser öffnet sich von
selbst.

### Der erste Start braucht einen Handgriff

Diese App ist quelloffen und **nicht bei Apple oder Microsoft registriert** — für
eine Registrierung müsste das Projekt jährlich zahlen. Beide Systeme melden das
beim ersten Start. Das ist erwartet, und es ist einmalig.

**macOS.** Der Dialog sagt, Apple könne die App nicht auf Schadsoftware prüfen,
und bietet als blau hervorgehobenen Knopf *In den Papierkorb legen* an. **Nicht
den nehmen.**

1. Im Dialog auf **Fertig** klicken.
2. *Systemeinstellungen* → *Datenschutz & Sicherheit* → hinunterscrollen zum
   Abschnitt *Sicherheit*. Dort steht die App mit dem Knopf **Dennoch öffnen**.
3. Mit Passwort oder Touch ID bestätigen, dann noch einmal **Öffnen**.

Der Knopf erscheint erst *nach* dem ersten Startversuch und bleibt etwa eine
Stunde lang stehen. Danach startet die App wie jedes andere Programm.

**Windows.** SmartScreen meldet einen unbekannten Herausgeber: auf *Weitere
Informationen* klicken, dann *Trotzdem ausführen*.

**Linux.** Keine Rückfrage; das Archiv entpacken und `./install.sh` ausführen.

## Alternativ: mit Docker betreiben

Für einen Rechner, der die App für mehrere Leute im Netz bereitstellt.
Voraussetzung ist Docker (Docker Desktop unter Mac/Windows, Docker Engine unter
Linux).

```bash
git clone https://github.com/CPR-Production/Komparsendrehplanung.git
cd Komparsendrehplanung/infra/docker
docker compose up -d
```

Danach läuft die App unter <http://localhost:3001>. Alle Daten liegen im
Docker-Volume `komparsen-data` und überleben Neustarts und Updates.

Details, Update- und Backup-Hinweise stehen in
[docs/self-hosting.md](docs/self-hosting.md).

## Entwicklung

Was als Nächstes ansteht, sammelt [docs/backlog.md](docs/backlog.md).

Node 20 oder neuer.

```bash
npm install
npm run dev:server   # Port 3001
npm run dev:web      # Port 5173, leitet /api an 3001 weiter
```

Vor dem Abschluss einer Änderung:

```bash
npx tsc -p apps/web/tsconfig.json --noEmit
npm run test --workspace packages/shared
```

`npm test` auf Root-Ebene schlägt fehl, weil `apps/server` keine Testdateien hat.

## Aufbau

npm-Workspaces-Monorepo:

| Paket | Inhalt |
| --- | --- |
| `apps/web` | React 18, Vite, TypeScript, React Router, TanStack Query, Bootstrap 5, i18next |
| `apps/server` | Express, Drizzle ORM auf SQLite |
| `packages/shared` | Typen und Berechnungen für beide Seiten — einziger Ort mit Tests |

Datenmodell: `Project → Set → Scene → Role → RoleCategoryCount`. Ein **Set** ist
ein Drehtag.

Der Drehplan ist **eine** Tabelle: der Kopf kommt aus `ScheduleTableHead`, jedes
Set rendert einen eigenen `<tbody>`. Dadurch teilen sich alle Sets ein
Spaltenraster. Die Spaltenzahlen in
[`apps/web/src/grid/scheduleLayout.ts`](apps/web/src/grid/scheduleLayout.ts) sind
hart gekoppelt — wer eine Spalte ergänzt oder zusammenlegt, muss sie mitziehen,
sonst brechen sämtliche `colSpan`s.

Weitere Hintergründe für Mitarbeitende stehen in [CLAUDE.md](CLAUDE.md).

## Konfiguration

| Variable | Bedeutung |
| --- | --- |
| `DATABASE_PATH` | Pfad zur SQLite-Datei (Vorgabe `./data/komparsen.sqlite`) |
| `PORT` | Port des Servers (Vorgabe `3001`) |
| `GITHUB_REPO` | `owner/repo`; schaltet Update-Hinweis und Feedback-Formular frei |

Ist `GITHUB_REPO` gesetzt, prüft der Server stündlich, ob es ein neueres Release
gibt, und blendet dann oben ein Banner ein. Unter **Hilfe & Feedback** lässt sich
eine Meldung vorbereiten, die als GitHub-Issue geöffnet wird — abgeschickt unter
dem eigenen Konto der meldenden Person. Es liegt also **kein Zugangstoken in der
Installation**. Beides setzt voraus, dass das Repository öffentlich ist.

## Feedback und Fehler

Über **Hilfe & Feedback** in der App oder direkt als
[Issue](https://github.com/CPR-Production/Komparsendrehplanung/issues).

## Lizenz

[MIT](LICENSE) — nutzen, ändern und weitergeben ist erlaubt, auch kommerziell,
solange der Copyright-Hinweis erhalten bleibt.
