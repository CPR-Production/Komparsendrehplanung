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

Bei Änderungen an der Zähllogik immer
`npm run test --workspace packages/shared` laufen lassen. Getestet ist dort
außerdem `sceneColors.ts` (siehe „Farben"); `packages/shared` bleibt der
einzige Ort mit Tests.

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

- **In/Ex und Tageszeit teilen sich eine Spalte** (gestapelt, In/Ex oben) —
  `.scene-flags`. Der Spaltenkopf heißt weiterhin „In/Ex · D/N".
  - **Intern und Extern schließen sich nicht aus**: eine Szene kann drinnen
    beginnen und draußen enden, deshalb sind es Checkboxen, keine Umschalter.
    Beide Werte stehen mit `;` getrennt in derselben Textspalte `scene.int_ext`
    (`"intern;extern"`) — keine neue Spalte, keine Migration. `parseIntExt` und
    `toggleIntExt` in `ScheduleTable.tsx` sind die einzige Stelle, die das Format
    kennt; `toggleIntExt` sortiert nach der Optionsliste, damit der gespeicherte
    Wert nicht von der Klickfolge abhängt.
  - **Die Tageszeit hat fünf Stufen**, nicht zwei: Tag, Nacht, Morgen, Dim,
    Abend (`TIME_OF_DAY_OPTIONS`). Fünf sich ausschließende Werte passen nicht
    mehr als Knopfleiste in die Spalte, deshalb ist es eine Auswahlliste — so
    macht es die Vorlage ohnehin. **Die Reihenfolge ist die der Vorlage**
    (Day, Night, Morn, Dim, Eve), nicht der Tagesverlauf, weil die noch
    ausstehenden Ziffernkürzel aus Issue #11 genau so durchnummerieren. Die
    Anfangsbuchstaben T, N, M, D, A sind verschieden — damit wählt ein Tastendruck
    einen Eintrag, was beim Erfassen zählt. **`Dim` bleibt unübersetzt**;
    „halb dunkel" ist zu lang und lässt sich nicht gut kürzen.
  - Die Spalte heißt in der Datenbank weiterhin `scene.day_night` — historisch,
    eine Umbenennung wäre eine Migration ohne Gegenwert.
- **Eine Szene belegt zwei Bereiche.** Oben eine eigene Zeile mit Nummer,
  In/Ex + Tageszeit, Script Time und Location — die **Location zieht alle
  Spalten rechts von sich mit** (`totalColumns - (SCENE_COLUMN_COUNT - 1)`),
  weil der Streifen über den Rollen sonst leer bliebe und eine Adresse
  regelmäßig länger ist als ihre Spalte. Darunter die **Synopsis über den vier
  Szenen-Spalten** (`SCENE_COLUMN_COUNT`) und über die Rollenzeilen hinweg
  (`rowSpan`), also genau dort, wo vorher nichts stand.
  - **Ohne Beschriftung**: „Synopsis" stand früher als Wort davor. Kursiv unter
    der Szenennummer liest sich die Zeile auch so; den Namen trägt jetzt nur
    noch `aria-label`, der Schlüssel `grid.scene.synopsis` bleibt dafür.
  - Als `<textarea>`, nicht als Eingabezeile: vier Spalten sind schmaler als die
    frühere volle Tabellenbreite, und ein **gesperrtes Feld lässt sich nicht
    scrollen** — der Text muss also umbrechen können.
  - Das Feld ist **absolut gegen die Zelle positioniert**, nicht auf `height:
    100%` gesetzt. Die Zelle bekommt ihre Höhe von den Rollenzeilen nebenan, hat
    also selbst keine, die sie weiterreichen könnte; die Prozenthöhe löst sich
    ins Nichts auf und das Feld bliebe einzeilig in einer vier Zeilen tiefen
    Zelle. Der Selektor muss dafür `.schedule-table td.cell-synopsis textarea`
    heißen — schwächer geschrieben gewinnt das `width: 100%` der allgemeinen
    Feldregel gegen den rechten Versatz.
- **Script Time** führt Von und Bis in einer Spalte; Bis erscheint nur bei der
  letzten Szene, weil sie den Drehtag abschließt. Die Drehzeit im Set-Header ist
  daraus abgeleitet, kein eigenes Feld.
- **Summenzeile** direkt unter dem Set-Header: Label in der Name-Spalte, Summen in
  den jeweiligen Kategorie-Spalten, Gesamtsumme in Total. Bewusst spaltenbündig
  statt als Fließtext, damit sie unter ihrem Kategorie- und Gruppen-Header steht.
  Sie ist die **einzige** Darstellung der Tagessumme; im Set-Kopf stand dieselbe
  Zahl einmal zusätzlich als „Total Shoots" und ist dort entfallen.

### Farben

Neunzehn Ziele, alle pro Projekt einstellbar, Hintergrund und Text getrennt:

- **Vier Grundfarben** — Tabellenkopf, Set, Rolle, Anzahl. Sie tragen als
  Vorgabe genau die Werte, auf die das Grid vorher fest verdrahtet war.
- **Fünfzehn Szenenzustände** — eine Szene wird **nach ihrem Zustand**
  eingefärbt, nicht nach ihrer Stelle in der Hierarchie: Int, Ex oder beides,
  mal fünf Tageszeiten. Ohne In/Ex oder Tageszeit bleibt das neutrale Gelb.

`packages/shared/src/sceneColors.ts` ist die einzige Liste. Sie muss geteilt
sein: der Server prüft gegen sie, die Einstellungsseite zeigt sie als Zeilen,
das Grid schlägt darin nach. Dort liegen auch `parseIntExt`/`formatIntExt` —
das `;`-Format von `scene.int_ext` gehört neben `sceneColorKey`, weil beide
den Zustand aus demselben String lesen.

Fünf Kopplungen:

- **Gespeichert wird nur, was abweicht.** `scene_color` (pro Projekt) hält
  ausschließlich geänderte Ziele, `GET` legt sie über die Vorgaben aus dem
  Code. Deshalb brauchte kein Bestandsprojekt eine Nachbefüllung, und eine
  spätere Änderung an den Vorgaben erreicht alle, die nichts angefasst haben.
  **Zurücksetzen ist ein `DELETE`, kein Schreiben des Vorgabewerts** — sonst
  würde das Ziel den Vorgaben nicht mehr folgen.
- **Die Tabelle heißt `scene_color` und der Endpunkt `/scene-colors`**, obwohl
  beide auch die Grundfarben tragen — benannt, als es nur die Szenenzustände
  gab. Eine Umbenennung wäre eine Migration ohne Gegenwert, wie bei
  `scene.day_night`.
- **Der Schlüssel ist ein URL-Pfadsegment** (`PUT …/scene-colors/:key`). Er darf
  deshalb kein `/` enthalten: Int und Ex hängen mit `+` aneinander, die
  Tageszeit folgt nach `-` (`intern+extern-nacht`). Der Client kodiert ihn
  zusätzlich.
- **Farben laufen über Bootstraps eigene Zellvariablen**, `--bs-table-bg` und
  `--bs-table-color`. Bootstrap setzt beide Eigenschaften über
  `.table > :not(caption) > * > *` — das schlägt eine einzelne Klasse, ein
  direktes `color:` verliert also. Die vier Grundfarben hängen als geerbte
  Custom Properties am `<table>` (`--set-bg` und so weiter, Vorgabewerte als
  Fallback im Stylesheet); die Szenenfarbe steht am jeweiligen `<td>`, weil sie
  sich von Zeile zu Zeile unterscheidet.
- **`has-dark-state`, `has-dark-set`, `has-dark-role` sind keine
  Schönheitsnamen.** Die Bedienelemente in diesen Zellen tragen feste Farben,
  die gegen Gelb und Orange gewählt waren: rotes ×, grauer Anfasser, dunkle
  Knopfränder, die gedämpften Hinweistexte, die Trennlinie über der Summenzeile.
  Auf einem Nachtblau verschwinden sie. Nur dann weichen sie der Textfarbe der
  Zelle; auf hellen Farben bleibt das Rot, weil es dort liest und das Löschen
  sonst sein einziges Signal verlöre. `isDarkColor` entscheidet das. Für
  Tabellenkopf und Anzahl gibt es bewusst keine solche Klasse — dort steht kein
  Element mit eigener fester Farbe.

Die Vorgabepalette der Szenen nennt die Vorlage nur an vier Stellen; der Rest
füllt dazwischen auf. **Ein Test in `packages/shared` hält jede Paarung auf
WCAG AA** — die Farben werden ausgeliefert, bevor sie jemand anfasst.

### Styling-Konventionen

- Farbhierarchie in `schedule-colors.css`, angelehnt an die Excel-Vorlage:
  Set (orange) > Role (grün) > Count (blau) — inzwischen aber nur noch als
  Vorgabewerte, siehe „Farben". Das Szenen-Gelb greift nur, solange eine Szene
  weder In/Ex noch Tageszeit gesetzt hat.
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

## Bearbeitungssperre

`editLock.tsx` hält den einen Zustand, den die Sperre braucht: gesperrt oder
nicht. Umgeschaltet wird er mit dem Schloss-Knopf in der Kopfleiste des
Drehplans (`components/EditLockToggle.tsx`), gelesen mit `useEditLock()` —
im Grid direkt und nicht als Prop, weil die Sperre weder zum Set noch zur Szene
gehört und sonst durch `SetSection` hindurchgereicht werden müsste.

- **Nur Oberfläche.** Der Server nimmt weiter jede Änderung an. Die Sperre
  schützt vor dem Vertippen, nicht vor Personen — so in Issue #7 entschieden.
- **Gesperrt ist der Anfangszustand**: Ein Browser, der noch nie aufgeschlossen
  hat, beginnt zu. Danach gilt die zuletzt getroffene Wahl — sie liegt in
  `localStorage` unter `komparsen.editLock`, wie die Sprache, damit ein
  Bearbeitungstag einen Klick kostet und nicht einen pro Neuladen. Alles außer
  einem gespeicherten `"unlocked"` heißt gesperrt.
- **`disabled` an jedem Bedienelement**, nicht `pointer-events: none` und nicht
  `inert`: beides nähme dem Lesenden auch das Markieren und den Screenreader.
  Fürs Ziehen gibt es kein `disabled`, dort steht `draggable: !locked` — an
  beiden Anfassern, Set in `ProjectSchedulePage`, Szene in `SetSection`.
- **Ein gesperrtes Feld darf nicht grau werden**, denn gesperrt heißt: Der Plan
  wird gerade gelesen. In `schedule-colors.css` steht dafür `color: inherit`
  **samt `-webkit-text-fill-color`** (Safari graut darüber ein, nicht über
  `color`), `background: transparent` gegen Bootstraps `.form-control:disabled`
  und `opacity: 1` für Int/Ex und neu/wdh., deren Zustand Information ist. Die
  Klasse `is-locked` am `<table>` trägt nur den Anfasser, dem sonst der
  Greifzeiger bliebe.
- **Die Einstellungsseiten sind bewusst nicht gesperrt** — dorthin geht man
  absichtlich, und der Knopf steht dort auch nicht.

## i18n

`apps/web/src/i18n/index.ts` hält die Ressourcen aktuell **im Code**. Laut Plan
(Phase 5) ersetzt ein DB-gestützter `/api/translations`-Endpunkt das später durch
redeploy-freie, editierbare Übersetzungen — die `translation`-Tabelle steht im
Schema bereits bereit.

Abgedeckt ist die ganze Oberfläche, das Drehplan-Grid eingeschlossen
(`grid.*`). Drei Regeln, die dort gelten:

- **Benutzereingaben laufen nie durch `t()`.** Projekt-, Set-, Rollen- und
  Kategorienamen, Synopsis, Wechseltext, Adressen: alles steht so da, wie es
  eingetippt wurde. Ein `t()`-Schlüssel wird deshalb **nie** aus Daten gebaut —
  die dynamischen Schlüssel (`sceneState.…`, `update.phase.…`,
  `colorTarget.chrome.…`) setzen sich ausschließlich aus festen Wertelisten
  zusammen.
- **Die Spaltenköpfe tragen in beiden Sprachen die Begriffe der Vorlage** —
  Scene, Script Time, Location, Total/Scene, Fuzzle ID, Total. Sie sind der
  Wortschatz, in dem am Set geredet wird; eine deutsche Fassung stünde neben
  der Vorlage, nicht in ihr. `grid.head.*` ist deshalb in `de` und `en`
  gleich — das ist Absicht und kein vergessener Eintrag.
- **`sceneState.intExt.*` und `sceneState.timeOfDay.*` gehören Grid und
  Einstellungen gemeinsam.** Beide beschriften dieselben Zustände, und zwei
  Schlüsselsätze wären zwei Schreibweisen. (Die Farbziele des Rasters bleiben
  unter `colorTarget.chrome.*`, die sind wirklich nur Farbe.)

Der `LanguageSwitcher` (`components/LanguageSwitcher.tsx`) steht in der Header-Nav
aller Seiten, daneben der `VersionBadge` — die Seiten teilen sich keine
Kopfleiste, eine neue Seite braucht beide also selbst. `LANGUAGES` dort ist die
einzige Liste, die um ein Locale zu erweitern ist; dazu kommt nur der
Ressourcenblock in `i18n/index.ts`.

Die Auswahl liegt in `localStorage` unter `komparsen.language`, und
**`<html lang>` folgt ihr** — gesetzt beim Start *und* im
`languageChanged`-Listener, weil i18next das Ereignis je nach Ladeweg schon
während `init()` feuert, also womöglich bevor der Listener steht. `index.html`
liefert `lang="de"` aus; das stimmt für die Vorgabe und nur für sie.

## Bootstrap-Umstellung — Stand

**Nicht vollständig.** Bootstrap ist global eingebunden (`main.tsx`), aber die
Seiten sind unterschiedlich weit:

| Bereich | Stand |
| --- | --- |
| `ProjectListPage` | umgestellt (container, row-cols, card, form-control, btn) |
| `ScheduleTable` | weitgehend umgestellt (form-control-sm, btn-group, d-flex) + eigenes CSS |
| `ProjectSchedulePage` Header | umgestellt; Höhe/Sticky bleiben inline (Kopplung an `--app-header-height`) |
| `ScheduleTableHead` | inline `width`-Styles je Spalte — bewusst, steuert das feste Tabellenraster |
| `SettingsPage` | nur noch Hülle: Kopf, Reiter, `<Outlet/>`. Ein Thema je Unterseite — `SettingsCategoriesPage` und `SettingsColorsPage` (card + list-group, `form-control`/`btn`, `.row-delete`). `/settings` ohne Unterpfad leitet auf die Kategorien um, wo es vorher aufging. Ein zweiter Eintrag in der App-Navigation kam bewusst nicht dazu |
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

### Das macOS-Fenster

`infra/installer/macos/launcher/main.swift` ist auf dem Mac das
`CFBundleExecutable` — ein kleines AppKit-Fenster, das den Server als
Kindprozess führt und ihn beim Beenden mitnimmt. Ohne das ist die App ein reiner
Node-Prozess: keine WindowServer-Verbindung, also kein Dock-Eintrag, kein
Laufindikator und kein Weg zum Beenden außer der Aktivitätsanzeige.

Zwei Kopplungen:

- **Ende-Code 75.** `restart()` in `services/updater.ts` startet den Nachfolger
  nur dann selbst, wenn `KOMPARSEN_SUPERVISED` **nicht** gesetzt ist; unter dem
  Fenster beendet es sich stattdessen mit 75, und das Fenster startet neu. Ein
  selbst gestarteter Nachfolger hinge nicht mehr am Fenster. Die Zahl steht in
  beiden Dateien und muss zusammenpassen.
- **Nicht in der Nutzlast.** Wie die `.icns` bleibt der Wrapper vom
  Selbst-Update unangetastet — das hält nebenbei die Bundle-Signatur gültig,
  kostet aber dasselbe: Änderungen kommen erst per Neuinstallation an.

Das Fenster misst seine Höhe selbst (`fitWindowToContent`). Feste Koordinaten
schneiden bei größerer Systemschrift Text ab, deshalb Auto Layout.

### Icons

Eine Zeichnung, `infra/installer/assets/icon.svg`, wird von
`npm run build:icons` zu `.icns`, `.ico`, Linux-PNG und Favicons gerastert.
Die Ergebnisse **liegen fertig im Repo** — das Skript läuft nicht im Workflow,
weil es Chrome, `sips` und `iconutil` braucht. Wer die Zeichnung ändert, ruft es
von Hand auf und checkt die erzeugten Dateien mit ein.

Zwei Kopplungen: macOS bekommt eine eigene, auf 824/1024 verkleinerte Fassung
mit Schatten, und die `.icns` liegt in `Contents/Resources`, also außerhalb der
Nutzlast — ein neues Motiv erreicht Nutzer deshalb nur über eine
Neuinstallation, nicht per Selbst-Update.

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
