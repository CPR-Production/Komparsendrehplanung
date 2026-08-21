# Release-Pipeline und Installer

Diese Anleitung richtet sich an den, der ein Release herausgibt — nicht an
Endnutzer. Wie eine fertige Version installiert wird, steht in
[self-hosting.md](self-hosting.md).

## Kurzfassung

Ein Release entsteht aus einem Git-Tag. Drei Schritte:

```bash
npm version 1.2.0 --workspaces --include-workspace-root --no-git-tag-version
git commit -am "Version 1.2.0"
git tag v1.2.0 && git push origin master v1.2.0
```

Den Rest macht `.github/workflows/release.yml`: bauen, verpacken, prüfen,
veröffentlichen. Nach etwa zehn Minuten liegen die Installer auf der
Releases-Seite.

Der erste Befehl fasst auch die `package-lock.json` an; sie gehört mit in
denselben Commit, sonst scheitert das `npm ci` im Workflow. Das `-a` oben nimmt
sie mit.

Für eine Vorabversion entfällt der Versionssprung, solange der Kern schon
stimmt: `v1.2.0-rc1` passt zu einer `package.json` auf `1.2.0`.

**Der Versionssprung im ersten Befehl ist nicht optional.** Der Docker-Weg
stempelt keine Version ein, sondern liest sie aus `apps/server/package.json`.
Steht die auf einem älteren Stand, meldet jede Docker-Installation dauerhaft
ein verfügbares Update — auch direkt nachdem sie aktualisiert wurde. Der
Workflow bricht deshalb ab, wenn Tag und `package.json` nicht übereinstimmen.

## Was dabei entsteht

| Datei | Runner | Enthält |
| --- | --- | --- |
| `Komparsendrehplanung-<v>-macos-arm64.dmg` | `macos-15` | App-Bundle für Apple Silicon |
| `Komparsendrehplanung-<v>-macos-x86_64.dmg` | `macos-15-intel` | App-Bundle für Intel-Macs |
| `Komparsendrehplanung-<v>-windows-x64.exe` | `windows-2022` | Inno-Setup-Installer |
| `Komparsendrehplanung-<v>-linux-x86_64.tar.gz` | `ubuntu-22.04` | Archiv mit `install.sh` |
| `payload-<v>-<platform>-<arch>.tar.gz` | alle vier | reine Nutzlast, für das Selbst-Update |
| `SHA256SUMS.txt` | — | Prüfsummen aller Dateien |

Die `payload-`-Archive sind nicht zum Herunterladen von Hand gedacht: Sie
enthalten dieselben Dateien wie die Installer, nur ohne Verpackung. Der Updater
lädt sie, weil aus einem DMG, einem Inno-Setup und einem tar.gz zu
aktualisieren drei verschiedene Mechanismen wären — so ist es überall
derselbe.

Dazu stellt GitHub für jedes Paket eine Herkunftsbescheinigung aus, die belegt,
aus welchem Commit und welchem Workflow-Lauf es stammt.

In jedem Paket steckt dieselbe Ordner-Nutzlast:

```
komparsen(.exe)       Node-Runtime und Server in einer Datei
better_sqlite3.node   das native SQLite-Addon
web/                  gebautes Frontend
migrations/           Datenbank-Migrationen
```

Vier Runner sind nötig, weil `better_sqlite3.node` nur auf der Zielplattform
entsteht — es lässt sich nicht kreuzweise bauen.

Der Intel-Mac-Runner bleibt bewusst drin, solange es ihn gibt: Im Büro ist nicht
sicher, welche Hardware noch im Einsatz ist, und GitHub bietet `macos-15-intel`
bis **Herbst 2027** an. Danach endet x86_64 auf macOS bei GitHub ganz — dann
fällt dieser Runner weg und mit ihm das Intel-DMG.

## Ein Release veröffentlichen

1. **Alles auf `master`**, was in die Version soll.
2. **Versionsnummer hochziehen** (Befehl oben). Sie muss in `package.json` und
   `apps/server/package.json` stehen.
3. **Tag setzen und pushen.** Schema `v<major>.<minor>.<patch>`, also `v1.2.0`.
   Ein Tag mit Suffix — `v1.2.0-rc1` — wird als Vorabversion veröffentlicht und
   löst bei niemandem das Update-Banner aus. Gut zum Ausprobieren der Pipeline.
   Die `package.json` bleibt dabei auf dem Kern `1.2.0` stehen; die Sperre
   vergleicht nur den Kern, den Suffix trägt allein der Tag.
4. **Den Lauf beobachten** unter *Actions → Release*. Vier Build-Jobs laufen
   parallel, danach der Veröffentlichungs-Job.
5. **Ergebnis prüfen** auf der Releases-Seite: vier Pakete plus
   `SHA256SUMS.txt`.

Schlägt ein einzelner Runner fehl, laufen die anderen weiter (`fail-fast:
false`) — es fehlt dann eine Plattform, nicht das ganze Release. Den Job kann
man einzeln neu starten; die Dateien werden dabei ersetzt, nicht verdoppelt.

### Geht das auch über die GitHub-Oberfläche?

Ja — *Releases → Draft a new release*, dort einen neuen Tag `v1.2.0` eintragen
und **Publish** drücken. Das legt den Tag an, und der Tag startet die Pipeline,
die ihre Dateien anschließend an das bereits bestehende Release hängt.

Zwei Dinge dabei:

- **Nur Publish zählt, nicht Save draft.** Ein Entwurf legt den Tag noch nicht
  an, also passiert auch nichts.
- **Der Versionssprung bleibt Pflicht.** Er muss als Commit auf `master` liegen,
  *bevor* der Tag entsteht — der Tag zeigt ja auf einen Commit, und aus dem
  liest der Docker-Weg später seine Version. Ist die `package.json` nicht auf
  demselben Stand wie der Tag, bricht die Pipeline gleich im ersten Schritt ab.

Der Weg über die Oberfläche spart also nichts am Vorbereiten, sondern ersetzt
nur `git tag` und `git push` durch zwei Klicks. Wer die Release-Notizen von Hand
schreiben will, ist damit gut bedient; sonst ist der Tag von der Kommandozeile
kürzer.

### Was der Workflow je Runner tut

1. Version aus dem Tag ableiten und gegen die `package.json` prüfen
2. `npm ci`
3. Tests aus `packages/shared`
4. `npm run build:release` — Workspaces bauen, Server zu einer CJS-Datei
   bündeln, Node-Binary besorgen, Bundle hineininjizieren, Nutzlast
   zusammenstellen
5. Verpacken mit dem plattformeigenen Skript
6. `scripts/smoke-test.sh` — die frisch gepackte Binary wird gestartet, legt
   testweise ein Projekt an und muss das Frontend ausliefern

Schritt 6 ist der wichtigste: Er fängt genau die Fehler ab, die sonst erst beim
Nutzer auffallen — ein fehlendes Addon, nicht mitgepackte Migrationen, eine
Binary, die gar nicht startet.

## Lokal bauen

Zum Ausprobieren, ohne ein Release zu veröffentlichen. Es entsteht immer nur
das Paket für **die Plattform, auf der man gerade sitzt**.

Voraussetzungen: Node ≥ 20.12 und `npm ci`. Dazu je nach System:

| System | Zusätzlich nötig |
| --- | --- |
| macOS | Xcode Command Line Tools (liefert `codesign`, `lipo`, `hdiutil`) |
| Windows | [Inno Setup 6](https://jrsoftware.org/isdl.php) |
| Linux | nichts weiter |

```bash
# Nutzlast bauen (ohne --version nimmt es die aus der package.json)
npm run build:release -- --version=1.2.0

# Prüfen, dass die gepackte Binary wirklich läuft
bash scripts/smoke-test.sh

# Verpacken
bash infra/installer/macos/package.sh 1.2.0      # macOS
bash infra/installer/linux/package.sh 1.2.0      # Linux
```

Unter Windows in der PowerShell:

```powershell
& "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" /DAppVersion=1.2.0 infra\installer\windows\komparsen.iss
```

Ergebnis liegt in `build/release/dist/`, die rohe Nutzlast in
`build/release/payload/`. Beides ist in `.gitignore`.

Mit `--skip-build` überspringt das Skript die Workspace-Builds — praktisch, wenn
man nur am Verpacken schraubt.

## Wie ein Update beim Nutzer abläuft

### Heute

Der Server fragt stündlich das neueste Release bei GitHub ab. Ist eines neuer
als die laufende Version, erscheint oben ein Banner mit Link auf die
Releases-Seite. Von dort:

- **macOS** — neues DMG öffnen, App nach *Programme* ziehen, Ersetzen
  bestätigen.
- **Windows** — neues Setup ausführen; es installiert über die vorhandene
  Version.
- **Linux** — neues Archiv entpacken, `./install.sh` erneut ausführen.
- **Docker** — `git pull` und `docker compose up -d --build`.

Die Datenbank liegt in allen Fällen außerhalb des Programmverzeichnisses und
wird nicht angefasst. Migrationen laufen beim ersten Start der neuen Version
automatisch.

### Der Knopf „Jetzt installieren"

Kann sich die Installation selbst austauschen, steht im Banner ein Knopf, der
alles übernimmt:

1. Das zur Plattform passende `payload-`-Archiv aus dem neuesten Release laden
2. Die Prüfsumme gegen die `SHA256SUMS.txt` desselben Releases halten — stimmt
   sie nicht, bricht der Vorgang ab, **bevor** irgendetwas ausgetauscht wird
3. Innerhalb des Programmverzeichnisses entpacken
4. Die laufenden Dateien umbenennen statt überschreiben. Windows lässt eine
   laufende `.exe` nicht überschreiben, wohl aber umbenennen — daran hängt der
   ganze Entwurf. Nebeneffekt: die alte Version liegt bis zum nächsten Start
   noch daneben, ein Rückweg ist also da.
5. Prozess neu starten; das Frontend merkt am Versionswechsel, dass es so weit
   ist, und lädt sich selbst neu
6. Beim nächsten Start die umbenannten Reste wegräumen

Scheitert ein Schritt, wird zurückgedreht, was schon bewegt wurde — halb
getauscht wäre schlimmer als gar nicht getauscht. Das Banner zeigt dann den
Grund an und bietet einen zweiten Versuch.

Die Datenbank liegt außerhalb des Programmverzeichnisses und wird dabei nie
angefasst.

**Wo der Knopf fehlt:** im Docker-Betrieb (ein Container kann sich nicht selbst
ersetzen, ohne Zugriff auf den Docker-Socket zu bekommen), im Dev-Betrieb, und
wenn das Programmverzeichnis dem Konto nicht gehört. In diesen Fällen bleibt es
beim Link auf die Releases-Seite.

**Kein Zugriffsschutz:** Die App kennt keine Anmeldung, und der Server lauscht
auf allen Netzwerkschnittstellen. Wer die Installation im Netz erreicht, kann
also auch das Update anstoßen. Mehr als einen ungebetenen Neustart kann das
nicht auslösen — installiert wird nur, was aus dem hinterlegten Repository
kommt und dessen Prüfsumme passt.

## Stolpersteine

**„Multiple occurences of sentinel found in the binary"** — das Node-Binary ist
ein Universal-Binary (so installiert der macOS-Installer von nodejs.org). Der
Sentinel steckt dann zweimal drin, einmal je Architektur.
`scripts/build-release.mjs` schneidet den passenden Teil selbst heraus; tritt
der Fehler trotzdem auf, zeigt `NODE_BINARY` auf ein fremdes Binary.

**Die App startet, meldet aber einen Fehler beim Laden des Addons** — Nutzlast
und Node-Runtime stammen aus verschiedenen Node-Versionen. Beide müssen vom
selben Lauf kommen; nach einem Wechsel der Node-Version hilft `npm ci` und ein
frischer Build.

**Warnung beim ersten Start** — erwartet. Ohne Apple-Developer-ID und ohne
Windows-Codesigning-Zertifikat melden macOS und Windows einen unbekannten
Herausgeber. Der Weg drumherum steht in [self-hosting.md](self-hosting.md) und
gehört in jede Weitergabe des Programms.

**Update gegen eine eigene Quelle testen** — `GITHUB_API_BASE` biegt sowohl den
Update-Check als auch den Updater auf eine andere Adresse um. Gedacht für
GitHub-Enterprise-Installationen, brauchbar auch, um den Ablauf gegen eine
lokale Nachbildung durchzuspielen, ohne ein echtes Release zu veröffentlichen.

**Ein Job wartet ewig auf einen Runner** — dann gibt es das Label nicht (mehr).
GitHub pflegt je Betriebssystem nur die zwei neuesten Images; ein abgeschaltetes
Label lässt den Job nicht scheitern, sondern warten, und der
Veröffentlichungs-Job hängt über `needs: build` mit dran. Die gültigen Labels
stehen in der GitHub-Dokumentation zu den gehosteten Runnern. `timeout-minutes`
begrenzt den Schaden auf 45 Minuten statt sechs Stunden.

**Das Banner erscheint nicht** — es braucht ein veröffentlichtes Release, das
keine Vorabversion ist, und eine gesetzte `GITHUB_REPO`. Der Server hält das
Ergebnis der GitHub-Abfrage eine Stunde lang fest; nach einem frischen Release
kann es also so lange dauern.
