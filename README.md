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
- **Summen pro Kategorie und Gruppe** direkt im Set-Kopf, spaltenbündig zum Raster
- **Deutsch und Englisch** umschaltbar (die Oberfläche des Drehplan-Grids ist
  derzeit noch fest deutsch)

## Die Regel, die den Plan ausmacht

Jeder Kategorie-Eintrag ist entweder **neu** oder **wdh.** (wiederverwendet).
Nur die neuen zählen in die Tagessumme:

- **Total/Scene** summiert alles in einer Szene, unabhängig davon.
- **Total Shoots** und die Summenzeile im Set-Kopf zählen **nur neue** Einträge —
  eine Komparsin, die an einem Drehtag in einer weiteren Szene nochmal auftritt,
  erhöht den Tagesbedarf nicht.

Wer an dieser Logik etwas ändert, sollte
[`packages/shared/src/calculations.ts`](packages/shared/src/calculations.ts)
lesen; das ist die einzige Stelle im Projekt mit Tests.

## Schnellstart

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
