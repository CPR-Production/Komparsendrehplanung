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

Der Drehplan ist **eine** Tabelle: `ScheduleTableHead` liefert `<colgroup>` und
`<thead>`, jedes `SetSection` rendert einen eigenen `<tbody>`. Dadurch teilen
sich alle Sets ein Spaltenraster.

Das Raster steht in `apps/web/src/grid/scheduleLayout.ts`, und zwar **als Liste
von Breiten**: `SCENE_COLUMN_WIDTHS` und `ROLE_META_COLUMN_WIDTHS`. Die
Spaltenzahlen sind deren Länge (`SCENE_COLUMN_COUNT`,
`ROLE_META_COLUMN_COUNT`), daraus wiederum `COLUMNS_BEFORE_ROLE_NAME` und
`totalColumnCount()`. **Eine neue Spalte kommt als Eintrag in eine der beiden
Listen** — die Zahlen ziehen dann von selbst nach, und alle `colSpan`s
(Set-Header, Synopsis, Change-Zeile, Summenzeile) bleiben heil. Nur die
Löschspalte steht außerhalb der Listen (`ROW_ACTION_COLUMN_*`): sie sitzt hinter
den Kategorien, und deren Zahl hängt am Projekt.

Die Tabelle ist `table-layout: fixed`. Darunter liest der Browser seine Spalten
**allein aus der ersten Zeile** — und das ist hier der Gruppen-Header, dessen
Zellen über vier und mehr Spalten laufen. Deshalb steht die Breite im
`<colgroup>`; an den `<th>` der zweiten Kopfzeile, wo sie früher stand, liest sie
niemand, und alle Spalten wurden gleich breit. Reicht die Tabellenbreite über die
Summe der Spalten hinaus, verteilt der Browser den Rest **proportional** — die
Verhältnisse der Liste bleiben also in jeder Fensterbreite erhalten.

**Beide Kopfzeilen kleben.** Die Gruppenzeile hält `--app-header-height`, die
Spaltenzeile sitzt eine Gruppenzeile tiefer. Vorher klebten beide an derselben
Linie, und die Spaltenzeile legte sich über die Gruppenzeile — also über „Scene"
und die Kategorie-Gruppen. Ein Sticky-Versatz lässt sich nicht aus der Zeile
darüber messen, deshalb hat die Gruppenzeile eine gesetzte Höhe
(`--head-group-row-height`) und die zweite rechnet mit derselben Zahl. Die Höhe
gehört zur Strip Size und steht pro Stufe neben deren Schriftgröße.

**Strip Size** (`stripSize.tsx`, `components/StripSizeSelect.tsx`) skaliert das
Raster in vier Stufen — XS, S, M, XL, Vorgabe M, XL ist die Größe, auf die das
Grid vorher fest verdrahtet war. Umgeschaltet wird in der Kopfleiste des
Drehplans, gemerkt in `localStorage` unter `komparsen.stripSize`, wie Sprache
und Sperre. Drei Dinge gehen gemeinsam: Schriftgröße, Zellpolsterung und die
Höhe der Gruppen-Kopfzeile.

- **Die Klasse `strip-size-*` sitzt am `<table>`**, nicht am `<main>`: der
  Sticky-Versatz der zweiten Kopfzeile liest `--head-group-row-height` aus
  derselben Klasse.
- **Die Polsterung zählt mehr als die Schrift.** Bootstrap schreibt die
  Polsterung von `.table-sm` direkt hin, nicht über eine Variable — es braucht
  zwei Klassen, um dagegen anzukommen (`.schedule-table.table-sm > … > *`).
  Die Int/Ex-Leiste mit der Tageszeit darunter ist die höchste Zelle einer
  Szenenzeile, deshalb skalieren auch die Knöpfe mit (`padding` in `em`).
- **Alles, was sich an der Zellschrift ausrichtet, steht in `em`** — die
  Summenzeile, `neu/wdh.`, der Anfasser, „Total/Scene". Fest in `rem` bliebe es
  beim Umschalten stehen. Formularfelder erben keine Schriftgröße, die bekommen
  sie ausdrücklich (`font-size: inherit`).

Spalten aktuell: `# | In/Ex · D/N | Script Time | Location | Fuzzle ID | Name | Total/Scene | Total | <Kategorien…> | ×`

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
- **Script Time ist eine reine Eingabe**: die Startzeit der Szene, sonst
  nichts. Früher stand in derselben Spalte bei der letzten Szene ein zweites
  Feld für das Ende des Drehtags, und daraus rechnete der Set-Kopf eine Drehzeit
  „Von – Bis"; beides ist weg, also auch jede Ableitung aus Zeiten. Eine leere
  Szene zeigt `--:--` und meint genau das. Die Spalte `scene.end_time` bleibt in
  Schema und API-Typ stehen — sie zu entfernen wäre eine Migration ohne
  Gegenwert, wie bei `scene.day_night`; die Oberfläche schreibt sie nicht mehr.
- **Der Rollenname bricht um und die Zeile wächst mit.** Deshalb ein
  `<textarea>` statt einer Eingabezeile (`AutoGrowTextarea`): ein `<input>`
  bricht grundsätzlich nicht um, und ein **gesperrtes Feld lässt sich nicht
  scrollen** — der Rest eines langen Namens wäre also gar nicht erreichbar,
  dieselbe Überlegung wie bei der Synopsis. Das Feld misst sich selbst, weil in
  der Kette sonst niemand eine Höhe kennt: die Zeilenhöhe kommt von der Zelle,
  die Zelle vom Feld. Erst `height: auto`, dann `scrollHeight` plus Ränder
  (`box-sizing: border-box` liest die gesetzte Höhe als Außenmaß). Die Strip
  Size steht mit in den Abhängigkeiten — sie ändert, wie viele Zeilen derselbe
  Text braucht. Enter wird geschluckt: der Umbruch kommt aus der Breite, ein
  gespeicherter Zeilenumbruch wäre unsichtbar.
- **Die beiden Total-Spalten stehen vor den Kategorien**, nicht dahinter: erst
  wer die Rolle ist (Fuzzle ID, Name), dann was sie zusammenzählt, und erst
  danach die Felder, in die getippt wird. Beide sind **halb so breit** wie eine
  Kategorie-Spalte (`TOTAL_COLUMN_WIDTH`), denn darin steht nur eine Zahl.
  - Eine Folge daraus: „Total/Scene" passt so nicht mehr in seinen Kopf. Die
    Schrift ist dort kleiner (`.col-total`), und ein `<wbr>` nach dem
    Schrägstrich gibt die eine Stelle vor, an der umbrochen werden darf — Chrome
    bricht von sich aus weder nach `/` noch sinnvoll mitten im Wort.
- **Löschen hat eine eigene Spalte**, ganz rechts und **ohne Kopf** — es ist
  ein Bedienelement, kein Wert, und als festes 1,6-rem-Quadrat hält es jede
  Spalte auf, die es sich mit etwas teilt (die halbierte Total-Spalte zuerst).
  Der leere Kopf läuft als `rowSpan={2}` über beide Kopfzeilen, damit ihn keine
  Linie zerschneidet.
  - **Tagteiler, Szene und Rolle löschen an derselben Kante.** Das kostet
    beide Zeilen, die vorher bis zum Rand durchliefen, ihre letzte Spalte: der
    Set-Kopf spannt `totalColumns - 1`, die Location der Szene
    `totalColumns - SCENE_COLUMN_COUNT`. Die Szene trug ihr × früher neben der
    Szenennummer, wo es sich die Ecke mit dem Anfasser teilte; der Tagteiler
    hatte überhaupt keins — anlegen ging, löschen nicht.
  - Motiv, Location und Rollenwechsel behalten ihr × **beim Feld**: jedes
    trifft einen bestimmten Eintrag, und drei davon nebeneinander in einer
    Zelle sagten nicht mehr, welches welchen löscht.
- **„+ Tagteiler" steht zweimal.** In der Kopfleiste hängt er einen weiteren
  Drehtag hinten an; am Ende jedes Tagteilers legt er den neuen **genau dort**
  an — dieselbe Rolle, die „+ Szene" eine Ebene tiefer spielt. Beide laufen
  über dieselbe Mutation, `afterSetId: null` heißt „ans Ende". Der Server hängt
  immer hinten an und sortiert erst der Reihenfolgen-Endpunkt um, denn wohin
  der neue gehört, weiß nur die Liste im Client.
- **Summenzeile** direkt unter dem Set-Header: Label in der Name-Spalte, Summen in
  den jeweiligen Kategorie-Spalten, Gesamtsumme in Total. Bewusst spaltenbündig
  statt als Fließtext, damit sie unter ihrem Kategorie- und Gruppen-Header steht.
  Total/Scene bleibt darin leer — es summiert eine einzelne Szene, dazu hat das
  Set nichts zu sagen. Sie ist die **einzige** Darstellung der Tagessumme; im
  Set-Kopf stand dieselbe Zahl einmal zusätzlich als „Total Shoots" und ist dort
  entfallen.

### Der Set-Kopf

**Nur Eingaben, in zwei Listen.** Links ⠿, SD und Drehdatum; daneben die Orte
des Drehtags als Block: **Motive oben, Locations darunter**, jede Liste mit
ihrem eigenen „+" und bis zu sechs Einträgen (`MAX_PLACES_PER_KIND`). Die
Grenze ist eine Frage des Platzes, nicht der Daten, und steht deshalb im Grid
und nicht im Server.

**Die beiden Listen sind unabhängig** — das ist der ganze Punkt. Drei Motive
können an einer einzigen Adresse liegen, und dieselbe Adresse trägt am nächsten
Tag ein anderes Motiv. Früher war eine Zeile ein **Paar** aus `name` und
`address`, was jedes Mal die jeweils andere Hälfte zu erfinden zwang. Jetzt
sagt `shoot_set_location.kind` (`motif` | `location`, Liste in
`packages/shared`), was eine Zeile ist, und `name` trägt in beiden Fällen den
Text. Migration `0003` spaltet die Bestandspaare auf: aus jeder Zeile mit
Adresse wird eine zweite Zeile, und Zeilen, die nur eine Adresse trugen,
hinterlassen kein leeres Motiv. `0004` lässt `address` fallen.

- **Die Reihenfolge zählt je Liste.** `POST …/locations` setzt `sortOrder` auf
  die Zahl der vorhandenen Zeilen **derselben Art** — ein zweites Motiv steht
  hinter dem ersten Motiv, nicht hinter der letzten Location.
- **`PATCH` nimmt nur den Text.** Die Art einer Zeile ändert sich nie; ein
  Motiv wird nicht zur Location.
- **Das SD-Feld trägt seine Beschriftung daneben, nicht darüber.** Nur so ist
  jeder Block dieser Reihe genau eine Feldhöhe hoch und die erste Ortszeile
  steht ohne gerechneten Versatz auf einer Linie mit SD und Datum. Mit „SD"
  über dem Feld bräuchte es einen Versatz, und der träfe nie: die Höhe einer
  Listenzeile hängt davon ab, ob sie schon Einträge hat oder nur ihren Knopf.
- Die Feldbreiten stehen in `schedule-colors.css` und nicht auf `100%` — sonst
  drückte ein Feld die Zeile allein um.

Zwei abgeleitete Anzeigen sind ersatzlos entfallen: die Drehzeit aus erster und
letzter Szene (siehe Script Time) und die Sammlung der Szenen-Locations. Die
zweite stand neben dem neuen Location-Feld und hätte zweimal dasselbe Wort
gezeigt. Die Datalist der Szenen-Locations bleibt davon unberührt — sie ist die
Vervollständigung der Location-**Spalte**, nicht die Zusammenfassung im Kopf.

Benannt nach dem, was am Set gesagt wird: **Motiv** ist das Inhaltliche
(„Küche Weber"), **Location** der Drehort („Industriestr. 4"). Die Tabelle heißt
weiterhin `shoot_set_location`, obwohl sie beide Arten hält — wie
`scene.day_night` eine Umbenennung ohne Gegenwert.

### Farben

Zwanzig Ziele, alle pro Projekt einstellbar, Hintergrund und Text getrennt:

- **Fünf Grundfarben** — Tabellenkopf, Tagteiler, Rolle, Anzahl, Rollenwechsel.
  Sie tragen als Vorgabe genau die Werte, auf die das Grid vorher fest
  verdrahtet war. Der Rollenwechsel kam zuletzt dazu und steht deshalb hinten,
  obwohl seine Zeile auf dem Schirm zwischen den Szenen liegt — die Reihenfolge
  der Einstellungsseite soll sich nicht unter denen ändern, die sie kennen.
  **Ein neues Ziel braucht nur einen Eintrag in `CHROME_COLOR_TARGETS`**: die
  Einstellungsseite rendert die Liste, der Server prüft gegen sie, und der
  WCAG-Test greift von selbst. Dazu kommen nur der `colorTarget.chrome.*`-Text,
  der Schlüssel in der Schleife von `ProjectSchedulePage` und die CSS-Regel,
  die `--<key>-bg` liest.
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
- **`has-dark-state`, `has-dark-set`, `has-dark-role`, `has-dark-change` sind
  keine Schönheitsnamen.** Die Bedienelemente in diesen Zellen tragen feste Farben,
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
keine ganze Besetzungsliste mitnehmen. **Dieselbe Regel eine Ebene höher**: ein
Tagteiler lässt sich erst löschen, wenn seine Szenen weg sind, sonst nähme ein
Fehlklick einen ganzen Drehtag samt Besetzung mit. Ein versehentlich angelegter,
noch leerer Tagteiler verschwindet dagegen mit einem Klick. Das Löschen selbst
kaskadiert serverseitig bis in `role_category_count` — die Sperre ist das
Einzige, was davor steht.

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

**Alle Sprachen stehen pro Schlüssel nebeneinander**, nicht als ein Block je
Sprache: `strings` ist eine Liste von Schlüsseln, jeder mit einer Zeichenkette
pro Locale. So lässt sich zeilenweise abgleichen, was die Fassungen sagen, und
`Record<Locale, string>` macht jede Lücke zu einem **Compilerfehler** — eine
neue Sprache in `LOCALES` nennt TypeScript dann Zeile für Zeile, bis sie
vollständig ist. Nach Sprache sortiert werden die Ressourcen an genau einer
Stelle, in der Schleife unter der Liste, weil i18next sie so erwartet.

`LOCALES` steht **dort und nicht im `LanguageSwitcher`**: eine Sprache in der
Auswahl ohne Spalte in der Liste wäre eine Sprache ohne Wörter.

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
Kopfleiste, eine neue Seite braucht beide also selbst. Eine neue Sprache
erweitert `LOCALES` in `i18n/index.ts` und bekommt dort ihre Zeichenketten;
anderswo ist nichts einzutragen.

### Benennungen aus der Vorlage

Drei Begriffe sind bewusst gewählt und sollten nicht wieder auseinanderlaufen:

- **Set heißt in der Oberfläche Tagteiler / Daybreak.** Ein Set ist ein Drehtag,
  und was der Knopf anlegt, ist die Trennung zwischen zwei Drehtagen — der
  Daybreak-Streifen der Vorlage. Betroffen sind `nav.addSet`, `grid.set.move`
  und das Farbziel `colorTarget.chrome.set`. Code, Tabellen und Endpunkte heißen
  weiter `set`.
- **Change heißt Rollenwechsel / Costume change.** Gemeint ist der Kostümwechsel
  einer Rolle, nicht irgendein Wechsel.
- **Motiv und Location** für die beiden Felder des Set-Kopfs, siehe dort.

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
| `ScheduleTableHead` | inline `width` je `<col>` — bewusst, steuert das feste Tabellenraster; die Werte kommen aus `scheduleLayout.ts` |
| `SettingsPage` | nur noch Hülle: Kopf, Reiter, `<Outlet/>`. Ein Thema je Unterseite — `SettingsCategoriesPage` und `SettingsColorsPage` (card + list-group, `form-control`/`btn`, `.row-delete`). `/settings` ohne Unterpfad leitet auf die Kategorien um, wo es vorher aufging. Ein zweiter Eintrag in der App-Navigation kam bewusst nicht dazu |
| `SetSection` | reine Logik, kein Markup |

Damit ist die Umstellung durch. Übrig sind nur noch bewusste Inline-Styles:
die Spaltenbreiten im `<colgroup>` von `ScheduleTableHead`, `table-layout: fixed`
in `ProjectSchedulePage` und dort auch Höhe/Sticky des App-Headers.

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

## Versionsnummer

**Jede Änderung hebt die Version an**, mindestens die letzte Stelle
(`0.5.0` → `0.5.1`). Das passiert **vor** dem Commit, nicht erst beim Release:
die Nummer steht in der Kopfleiste jeder Seite, und sie ist das Einzige, woran
sich im Betrieb ablesen lässt, welcher Stand gerade läuft.

**Zwei Dateien tragen sie, und sie müssen übereinstimmen:**

| Datei | treibt |
| --- | --- |
| `package.json` (Wurzel) | den Release — `scripts/build-release.mjs` liest sie und stempelt sie per `__APP_VERSION__` in die Binary |
| `apps/server/package.json` | den Dev-Betrieb — `resolveVersion()` in `config.ts` liest sie über `../package.json`, wenn weder `APP_VERSION` noch `__APP_VERSION__` gesetzt ist |

Laufen die beiden auseinander, zeigt die entwickelte App eine andere Nummer als
die ausgelieferte — und genau dann ist die Anzeige wertlos.

`apps/web` und `packages/shared` haben eigene, niedrigere Nummern (`0.2.2`).
Die sind **interne Paketversionen** und treiben nichts; wer „die Version"
anhebt, fasst sie nicht an. In `package-lock.json` stehen dieselben Nummern
noch einmal — mit anzuheben, sonst hinkt sie hinterher, wie sie es bis 0.5.0
tat.

## Konventionen

- ESM durchgehend, Imports mit `.js`-Endung (auch aus `.ts`/`.tsx`).
- Kommentare erklären **warum**, nicht was — bestehende Dichte und Ton beibehalten.
- UI-Sprache ist Deutsch, Code und Bezeichner sind Englisch.
- Vor dem Abschluss: Version anheben (siehe oben),
  `npx tsc -p apps/web/tsconfig.json --noEmit` und
  `npm run test --workspace packages/shared`.
  (`npm test` auf Root-Ebene schlägt fehl, weil `apps/server` keine Testdateien hat.)
