# Offene Punkte und Ideen

Gesammelt am 21.08.2026 beim Durchklicken von 0.2.3. Reihenfolge ist keine
Priorität. Jeder Punkt nennt, was heute da ist, damit man später nicht erst
wieder suchen muss.

Jeder Punkt hat ein Issue (#5–#15). Die Diskussion gehört dorthin, dieser Text
bleibt der Überblick.

Vorbild ist durchgehend **Fuzzle** — die Software, die im Betrieb schon benutzt
wird. Wo hier „Fuzzle macht das so" steht, ist das ein Soll, kein Vorschlag.

---

## 1. Farben aus Fuzzle übernehmen, samt Einstellungen ([#5](https://github.com/CPR-Production/Komparsendrehplanung/issues/5))

**Heute:** Die Farbhierarchie steht fest verdrahtet in
`apps/web/src/schedule-colors.css` — Set `#f4c896`, Szene `#fff176`, Rolle
`#a5c882`, Anzahl `#5b9bd5`. Sie bildet die Excel-Vorlage nach und ist nicht
einstellbar.

**Soll:** Fuzzle färbt nicht nach Hierarchie, sondern **nach Inhalt der Szene**,
und lässt den Nutzer die Zuordnung selbst festlegen. Einstellbar sind dort zwei
Dinge getrennt: **Background Color** und **Text Color**.

Vorgabewerte, an denen wir uns ausrichten sollen:

| Zustand | Hintergrund |
| --- | --- |
| aktuell ausgewählt | rot |
| Int/Night | hellblau |
| Ext/Day | gelb |
| Ext/Night | dunkelblau |
| Int+Ext/Night | dunkleres blau |
| … | weitere folgen |

**Damit fallen die heutigen Entwicklungsfarben weg.** Das ist der Punkt, an dem
die Anlehnung an die Excel-Vorlage endet — wer `schedule-colors.css` anfasst,
sollte vorher hier hereinsehen.

**Hängt an Punkt 7, enger als zunächst gedacht.** Fuzzle zeigt die Farben in
derselben Auswahlliste, aus der man den Zustand wählt — fünfzehn Einträge von
Int/Day bis Int+Ext/Eve. Diese Liste ist damit zugleich die Zeilenliste der
Farbeinstellung. Solange es die Zustände nicht gibt, gibt es auch nichts zu
färben.

**Offen:** Farben pro Projekt oder global? Die Kategorien liegen pro Projekt,
die Farben würden dazu passen — dann braucht es aber eine Tabelle statt CSS.

## 2. Export nach CSV, Excel und JSON ([#6](https://github.com/CPR-Production/Komparsendrehplanung/issues/6))

**Heute:** Gar nicht vorhanden. Der Drehplan lebt nur in der Oberfläche und in
der SQLite-Datei.

**Soll:** Ein Export je Projekt. JSON als vollständige Abbildung (auch für
Sicherungen und für einen späteren Import), CSV und Excel als das, was man
weitergibt.

**Offen:** Exportiert wird der Drehplan wie er auf dem Bildschirm steht, also
mit Kategorie-Spalten je Projekt — die Spaltenköpfe sind damit pro Projekt
verschieden. Für Excel wäre die Farbgebung aus Punkt 1 mitzunehmen.

## 3. Sperre gegen versehentliche Änderungen ([#7](https://github.com/CPR-Production/Komparsendrehplanung/issues/7))

**Heute:** Jedes Feld im Grid ist immer schreibbar, Änderungen laufen sofort
über `useDebouncedSave` in die Datenbank.

**Soll:** Ein Schloss-Knopf in der Navigationsleiste, der zwischen Ansehen und
Bearbeiten umschaltet. Wer den Plan nur liest, soll nicht aus Versehen etwas
verstellen.

**Offen:** Nur Oberfläche oder auch serverseitig? Für den Zweck („nicht aus
Versehen") reicht die Oberfläche.

## 4. Versionsnummer in der Navigationsleiste ([#8](https://github.com/CPR-Production/Komparsendrehplanung/issues/8))

**Heute:** Die Version liefert `/api/version`, angezeigt wird sie nur im
Update-Banner, wenn es eines gibt.

**Soll:** Dauerhaft sichtbar in der Navigationsleiste. Bei Rückfragen aus dem
Betrieb ist das die erste Frage.

## 5. Total Shoots steht doppelt da ([#9](https://github.com/CPR-Production/Komparsendrehplanung/issues/9))

**Heute:** Zweimal dieselbe Zahl im Set-Kopf:

- `grid/ScheduleTable.tsx:182` — `Total Shoots: {totalShoots}` als Fließtext
  rechts in der Kopfzeile
- `grid/ScheduleTable.tsx:223` — die Zeile „Summe neu" mit derselben Summe,
  aufgeschlüsselt nach Kategorie-Spalten

Dazu direkt daneben „Locations aus Szenen", ebenfalls als Fließtext.

**Soll:** Eine Darstellung, nicht zwei. Die spaltenbündige Zeile ist die
nützlichere — sie steht unter ihren Kategorie-Köpfen. Zu klären ist, ob die
Gesamtsumme im Kopf ganz verschwindet oder die Zeile ersetzt.

## 6. Spaltenbreiten sollen dem Inhalt folgen ([#10](https://github.com/CPR-Production/Komparsendrehplanung/issues/10))

**Heute:** `grid/ScheduleTableHead.tsx` setzt je Spalte eine feste Breite als
Inline-Style. Das ist bewusst so (siehe CLAUDE.md) und hält das Raster über
alle Sets hinweg gleich — alle Sets teilen sich **eine** Tabelle.

**Soll:** Breiten nach Inhalt statt gleichmäßig.

**Achtung, das ist ein Zielkonflikt:** Sobald Breiten am Inhalt hängen, driften
die Sets auseinander, wenn nicht alle dieselbe Tabelle bleiben. Entweder man
misst über alle Sets hinweg und setzt das Ergebnis fest, oder man gibt das
gemeinsame Raster auf. Vor der Umsetzung entscheiden.

## 7. Int und Ext gleichzeitig, und mehr als Tag/Nacht ([#11](https://github.com/CPR-Production/Komparsendrehplanung/issues/11))

**Heute:** Zwei Umschaltgruppen mit je zwei sich ausschließenden Werten
(`ScheduleTable.tsx:44-51`): Intern/Extern und Tag/Nacht. In der Datenbank sind
das zwei Textspalten, `scene.int_ext` und `scene.day_night`.

**Soll:** Fuzzle löst das nicht über Umschalter, sondern über **eine
Auswahlliste** mit allen Kombinationen. Fünfzehn Einträge plus „–" für nichts
gesetzt, die ersten zehn mit einer Ziffer als Kürzel:

| | Day | Night | Morn | Dim | Eve |
| --- | --- | --- | --- | --- | --- |
| **Int** | 0 | 1 | 2 | 3 | 4 |
| **Ext** | 5 | 6 | 7 | 8 | 9 |
| **Int+Ext** | – | – | – | – | – |

Die Tageszeit hat dort also **fünf** Stufen, nicht zwei — neben Day, Night,
Morn und Eve auch **Dim**. Die Liste zeigt jeden Eintrag bereits in seiner
Farbe: Int/Night hellblau, Ext/Day gelb, Ext/Night dunkelblau, Int+Ext/Night
dunkler. Damit **ist** diese Liste die Farbtabelle aus Punkt 1 — die
Einstellungsseite braucht eine Zeile je Eintrag von hier.

Die Ziffern sind kein Beiwerk: Wer einen Drehplan erfasst, tippt das dutzendfach
hintereinander.

**Datenmodell — kleiner als gedacht.** In den Spalten steht ohnehin nur Text.
Eine Kombination trägt einfach mehr davon, mit `;` getrennt, und lässt sich
wieder auftrennen — `int_ext` = `"Int;Ext"`. Es braucht also weder neue Spalten
noch eine aufwendige Migration.

**Erledigt, aber anders aufgeteilt als beschrieben.** Statt einer einzigen
Auswahlliste über alle fünfzehn Kombinationen sind es zwei Bedienelemente in
derselben Spalte:

- **Int+Ext** sind zwei Checkboxen, beide gleichzeitig wählbar. Die Kombination
  steht in der Vorlagedatei, die offene Frage ist damit entschieden.
  Gespeichert wird wie beschrieben in `scene.int_ext`, mit `;` verkettet; die
  Werte bleiben die bestehenden `intern`/`extern`, damit vorhandene Drehpläne
  ohne Migration weiterlesen.
- **Die Tageszeit** ist eine Auswahlliste mit den fünf Stufen plus „–": Tag,
  Nacht, Morgen, Dim, Abend, in der Reihenfolge der Vorlage. **`Dim` bleibt
  unübersetzt** — „halb dunkel" ist zu lang und lässt sich nicht gut kürzen.

Die Trennung kostet nichts, was die Liste geleistet hätte: Int/Ext und Tageszeit
sind unabhängig, und die Anfangsbuchstaben T, N, M, D, A wählen je mit einem
Tastendruck.

**Offen bleibt:** die Ziffernkürzel — deren Nummerierung im Original über die
Kombination läuft (Int/Day = 0 … Ext/Eve = 9) und sich durch die Aufteilung in
zwei Bedienelemente nicht mehr eins zu eins übertragen lässt; hier ist zu
entscheiden, ob die Ziffer künftig nur die Tageszeit meint oder beides zugleich
setzt. Die Farbliste aus Punkt 1 kann jetzt loslegen: die Zustände gibt es.

## 8. Location je Szene soll die Sets des Drehtags anbieten ([#12](https://github.com/CPR-Production/Komparsendrehplanung/issues/12))

**Heute:** Das Feld ist ein Freitext mit `datalist`
(`SCENE_LOCATIONS_DATALIST_ID`), gefüllt aus den Werten, die in diesem Projekt
schon eingetippt wurden — nicht aus den Sets.

**Soll:** Die Auswahl soll die **Sets** des Drehtags anbieten. Ein Set ist der
Ort; die Szene wählt einen davon aus, statt ihn neu zu tippen.

Räumt nebenbei den doppelten „Locations aus Szenen"-Text aus Punkt 5 ab: Wenn
die Szene auf ein Set zeigt, muss der Kopf sie nicht mehr einsammeln.

## 9. Set trägt Namen und Adresse ([#13](https://github.com/CPR-Production/Komparsendrehplanung/issues/13))

**Heute:** In der Datenbank vorhanden — `shoot_set_location` hat `name` und
`address`, und die Oberfläche zeigt beide Felder im Set-Kopf (Platzhalter
„Set-Name 1"). Fehlt also nicht, ist aber begrifflich unklar: Die Tabelle heißt
`setLocations`, die Szene hat daneben ein eigenes Feld `location`, und beide
heißen im Text „Location".

**Soll:** Begriffe geraderücken. Ein **Set** hat einen Namen und eine Adresse;
die Szene zeigt auf ein Set. Zusammen mit Punkt 8 zu machen — getrennt bringt
es nichts.

## 10. Übersetzung greift nicht überall ([#14](https://github.com/CPR-Production/Komparsendrehplanung/issues/14))

**Heute:** Übersetzt ist die App-Hülle: Navigation, Projektliste und die
Einstellungsseite. **Das Drehplan-Grid trägt fest verdrahtete deutsche Labels** —
„Synopsis", „+ Rolle", „+ Szene", „+ Wechsel", „Total Shoots", „Summe neu",
„neu"/„wdh." und die Tooltips.

**Soll:** Diese Strings nach `apps/web/src/i18n/index.ts` ziehen, dann greift
der Umschalter überall.

Steht so schon in CLAUDE.md; hier nur, damit es nicht zwischen den anderen
Punkten untergeht.

## 11. Einstellungsseite um Farben erweitern ([#15](https://github.com/CPR-Production/Komparsendrehplanung/issues/15))

Die Oberfläche zu Punkt 1: In den Einstellungen sollen Hintergrund- und
Textfarbe je Zustand einstellbar sein, mit den Fuzzle-Werten als Vorgabe.

Die Einstellungsseite ist bereits umgestellt (Karte plus Listengruppe je
Gruppe) und hat mit den Kategorie-Gruppen ein Muster, an dem sich ein
Farbabschnitt orientieren kann.
