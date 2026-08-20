# Komparsendrehplanung

Drehplanung für Komparsen/Supporting Artists. Ersetzt eine Excel-Vorlage, deren
Farbhierarchie und Spaltenaufbau die UI bewusst nachbildet.

## Aufbau

npm-Workspaces-Monorepo:

- `apps/web` — React 18 + Vite + TypeScript, React Router, TanStack Query, Bootstrap 5, i18next
- `apps/server` — Express + Drizzle ORM auf SQLite (`apps/server/data/komparsen.sqlite`)
- `packages/shared` — Typen und Berechnungen, die Front- und Backend teilen (einziger Ort mit Tests)

Dev: `npm run dev:server` (Port 3001) und `npm run dev:web` (Port 5173, proxyt `/api` auf 3001).
Beide sind in `.claude/launch.json` hinterlegt.

## Domänenmodell

`Project → Set → Scene → Role → RoleCategoryCount`

Ein **Set** ist ein Drehtag. Szenen und Sets sind per Drag & Drop sortierbar
(`sortOrder`, Reorder-Endpunkte). **Changes** („Wechsel") hängen per
`anchorAfterSceneId` hinter einer Szene. Kategorien liegen in **Kategorie-Gruppen**
(Default beim Projektanlegen: Gruppe „Supporting artists" mit
`normal, special, Feat., KD, Double`) und sind pro Projekt frei editierbar.

### Zählregeln (`packages/shared/src/calculations.ts`)

Der wichtigste fachliche Punkt: **`isNew` entscheidet, ob ein Slot zählt.**

- `calcSceneTotal` — alle Counts einer Szene, unabhängig von `isNew`
- `calcSetTotalShoots` — **nur** Slots mit `isNew`, weil ein an einem anderen Set
  wiederverwendeter Komparse den Tagesbedarf nicht erhöht
- `calcSetNewCountsByCategory` — dieselbe „nur neu"-Regel, aber pro Kategorie
  aufgeschlüsselt; speist die Summenzeile im Set-Header

Diese drei sind die einzige Stelle mit Tests. Bei Änderungen an der Zähllogik
immer `npm run test --workspace packages/shared` laufen lassen.

## Grid-Layout

Der Drehplan ist **eine** Tabelle: `ScheduleTableHead` liefert den `<thead>`,
jedes `SetSection` rendert einen eigenen `<tbody>`. Dadurch teilen sich alle Sets
ein Spaltenraster.

Die Spaltenzahlen stehen in `apps/web/src/grid/scheduleLayout.ts` und sind hart
gekoppelt: `SCENE_COLUMN_COUNT`, `ROLE_META_COLUMN_COUNT`,
`COLUMNS_BEFORE_ROLE_NAME`, `totalColumnCount()`. **Wer eine Spalte hinzufügt oder
zusammenlegt, muss diese Konstanten mitziehen** — sonst brechen alle `colSpan`s
(Set-Header, Synopsis, Change-Zeile, Summenzeile).

Spalten aktuell: `# | In/Ex · D/N | Script Time | Location | Total/Scene | Fuzzle ID | Name | <Kategorien…> | Total`

- **In/Ex und Tag/Nacht teilen sich eine Spalte** (gestapelt, In/Ex oben) — `.scene-flags`
- **Script Time** führt Von und Bis in einer Spalte; Bis erscheint nur bei der
  letzten Szene, weil sie den Drehtag abschließt. Die Drehzeit im Set-Header ist
  daraus abgeleitet, kein eigenes Feld.
- **Summenzeile** direkt unter dem Set-Header: Label in der Name-Spalte, Summen in
  den jeweiligen Kategorie-Spalten, Gesamtsumme in Total. Bewusst spaltenbündig
  statt als Fließtext, damit sie unter ihrem Kategorie- und Gruppen-Header steht.

### Styling-Konventionen

- Farbhierarchie in `schedule-colors.css`, angelehnt an die Excel-Vorlage:
  Set (orange) > Scene (gelb) > Role (grün) > Count (blau).
- Bootstrap liest Zellhintergründe über `--bs-table-bg`. Deshalb **diese Variable
  setzen**, statt mit höherer Spezifität gegen `background-color` anzukämpfen.
- Löschen ist app-weit einheitlich `.row-delete` (rotes ×, festes Quadrat) — im
  Grid für Set-Name, Szene, Rolle und Wechsel, in den Settings für Gruppe und
  Kategorie. Die Regel steht in `controls.css`, **nicht** in `schedule-colors.css`,
  weil sie nicht mehr grid-spezifisch ist. Nicht durch `btn btn-outline-*` ersetzen.
- Der sticky `<thead>` versetzt sich um `--app-header-height`; der Wert kommt aus
  `APP_HEADER_HEIGHT` in `ProjectSchedulePage`. Beide müssen übereinstimmen.

## State-Handling

`SetSection` hydriert seinen lokalen State **einmal** aus dem Server (`hydratedRef`).
Ein erneutes Sync bei jedem Background-Refetch würde Edits zerstören, die noch im
Debounce-Fenster hängen. Schreibende Felder laufen über `useDebouncedSave`.

Szenen lassen sich erst löschen, wenn ihre Rollen weg sind — ein Fehlklick soll
keine ganze Besetzungsliste mitnehmen.

## i18n

`apps/web/src/i18n/index.ts` hält die Ressourcen aktuell **im Code**. Laut Plan
(Phase 5) ersetzt ein DB-gestützter `/api/translations`-Endpunkt das später durch
redeploy-freie, editierbare Übersetzungen — die `translation`-Tabelle steht im
Schema bereits bereit.

Abgedeckt ist die App-Hülle (Nav, Projektliste, Settings-Seite komplett).
**Das Drehplan-Grid trägt weiterhin fest verdrahtete deutsche Labels**
(„Synopsis", „+ Rolle", „+ Szene", „+ Wechsel", „Total Shoots", „Summe neu",
„neu"/„wdh.", Tooltips). Wer das Grid übersetzen will, zieht diese Strings nach
`i18n/index.ts`.

Der `LanguageSwitcher` (`components/LanguageSwitcher.tsx`) steht in der Header-Nav
aller Seiten; `LANGUAGES` dort ist die einzige Liste, die um ein Locale zu
erweitern ist. Die Auswahl liegt in `localStorage` unter `komparsen.language`.

## Bootstrap-Umstellung — Stand

**Nicht vollständig.** Bootstrap ist global eingebunden (`main.tsx`), aber die
Seiten sind unterschiedlich weit:

| Bereich | Stand |
| --- | --- |
| `ProjectListPage` | umgestellt (container, row-cols, card, form-control, btn) |
| `ScheduleTable` | weitgehend umgestellt (form-control-sm, btn-group, d-flex) + eigenes CSS |
| `ProjectSchedulePage` Header | umgestellt; Höhe/Sticky bleiben inline (Kopplung an `--app-header-height`) |
| `ScheduleTableHead` | inline `width`-Styles je Spalte — bewusst, steuert das feste Tabellenraster |
| `SettingsPage` | umgestellt (card + list-group je Gruppe, `form-control`/`btn`, `.row-delete`) |
| `SetSection` | reine Logik, kein Markup |

Damit ist die Umstellung durch. Übrig sind nur noch bewusste Inline-Styles:
die Spaltenbreiten in `ScheduleTableHead` und Höhe/Sticky des App-Headers.

### Löschen mit Kaskade

`DELETE` auf Kategorie-Gruppe oder Kategorie kaskadiert bis in
`role_category_count` — die im Drehplan eingetragenen Zahlen verschwinden also
mit. Beide Buttons in `SettingsPage` fragen deshalb per `window.confirm` nach
und benennen die Folge. Wer dort etwas umbaut, darf die Rückfrage nicht
wegoptimieren.

## Release-Bauweise

Ein Tag `v*` löst `.github/workflows/release.yml` aus: vier Runner bauen je eine
Ordner-Nutzlast, verpacken sie zu einem Installer, und ein zweiter Job hängt
alles mit `SHA256SUMS.txt` und Herkunftsbescheinigung an ein GitHub-Release.

Die Nutzlast entsteht in `scripts/build-release.mjs` und ist bewusst **kein
Einzeldatei-Binary**:

```
komparsen(.exe)       Node-SEA: Runtime + gebündelter Server
better_sqlite3.node   das native Addon
web/                  gebautes Frontend
migrations/           Drizzle-SQL samt _journal.json
```

Drei Kopplungen, die man kennen muss:

- **Die Runner-Matrix ist keine Bequemlichkeit.** `better-sqlite3` ist ein
  natives Addon und entsteht nur auf der Zielplattform; das Addon und die
  eingebettete Node-Runtime müssen dieselbe ABI haben, deshalb kommen beide vom
  selben Runner.
- **`apps/server/src/paths.ts` ist die einzige Stelle, die den gepackten Betrieb
  kennt.** `isSea()` entscheidet, ob Migrationen, Web-Assets und Addon neben der
  Binary oder im Quellbaum gesucht werden, und ob die Datenbank ins
  Benutzerverzeichnis wandert. Wer eine weitere Datei zur Laufzeit von der
  Platte liest, muss sie hier eintragen **und** in die Nutzlast kopieren lassen.
- **Eine SEA kann nur CommonJS.** Das Bundle wird deshalb nach CJS gebaut, was
  zwei Kunstgriffe erzwingt: `import.meta.url` wird per Define auf einen
  Banner-Ausdruck umgebogen, und die Version kommt über `__APP_VERSION__` statt
  aus der `package.json`, die im Release nicht mehr auf der Platte liegt.
  `better-sqlite3` bekommt sein Addon als geladenes Objekt durchgereicht, weil
  das `require()` der SEA-Runtime nur Builtins auflöst.

Lokal probieren: `npm run build:release` (optional `--version=1.2.3`), dann
`bash scripts/smoke-test.sh`. Der Rauchtest läuft auch im Workflow und legt
testweise ein Projekt an — nur ein Schreibvorgang beweist, dass die Migrationen
durchliefen.

### Selbst-Update

`services/updater.ts` tauscht die Nutzlast im laufenden Betrieb aus. Es lädt
dafür nicht den Installer nach, sondern das `payload-`-Archiv desselben
Releases — sonst wären DMG, Inno-Setup und tar.gz drei Mechanismen.

Der Kern ist eine Reihenfolge, an der man nichts drehen sollte: erst Prüfsumme,
dann austauschen. Und ausgetauscht wird durch **Umbenennen der laufenden
Dateien**, nicht durch Überschreiben — Windows lässt eine laufende `.exe` nicht
überschreiben, wohl aber umbenennen. Schlägt ein Schritt fehl, dreht `swapIn`
das bereits Bewegte zurück; halb getauscht liefe gar nicht mehr.

`GITHUB_API_BASE` biegt Update-Check und Updater auf eine andere Adresse um —
gedacht für GitHub Enterprise, brauchbar, um den Ablauf lokal durchzuspielen.

## Offene Referenz: „Architektur-Plan"

`docs/self-hosting.md` verweist auf einen Architektur-Plan mit Phasen (dort
Phase 6 = Backup-Job), `i18n/index.ts` auf Phase 5 (DB-gestützte Übersetzungen).
**Dieses Dokument liegt nicht im Repo** und war auch nie eingecheckt. Wer die
Phasen kennt, sollte es ablegen — bis dahin sind die beiden Verweise ins Leere
gerichtet und die Phasennummern nicht überprüfbar.

## Konventionen

- ESM durchgehend, Imports mit `.js`-Endung (auch aus `.ts`/`.tsx`).
- Kommentare erklären **warum**, nicht was — bestehende Dichte und Ton beibehalten.
- UI-Sprache ist Deutsch, Code und Bezeichner sind Englisch.
- Vor dem Abschluss: `npx tsc -p apps/web/tsconfig.json --noEmit` und
  `npm run test --workspace packages/shared`.
  (`npm test` auf Root-Ebene schlägt fehl, weil `apps/server` keine Testdateien hat.)
