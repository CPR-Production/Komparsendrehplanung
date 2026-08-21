# Selbst hosten

Diese Anleitung ist für Endnutzer gedacht, die die Anwendung auf ihrem eigenen
Rechner betreiben möchten, ohne einen separaten Datenbankserver zu installieren.
Die App speichert alle Daten in einer einzelnen SQLite-Datei.

Es gibt zwei Wege: den **Installer** für einen Arbeitsplatzrechner und
**Docker** für einen Rechner, der die App für mehrere Leute bereitstellt.

## Weg 1: Installer

Auf der [Releases-Seite](https://github.com/CPR-Production/Komparsendrehplanung/releases)
liegt für jede Version ein Paket je Plattform:

| Datei | Für |
| --- | --- |
| `Komparsendrehplanung-<version>-macos-arm64.dmg` | Mac mit Apple Silicon (M1 und neuer) |
| `Komparsendrehplanung-<version>-macos-x86_64.dmg` | Mac mit Intel-Prozessor |
| `Komparsendrehplanung-<version>-windows-x64.exe` | Windows |
| `Komparsendrehplanung-<version>-linux-x86_64.tar.gz` | Linux |

**macOS** — DMG öffnen, die App nach *Programme* ziehen. Beim ersten Start
meldet macOS, es könne die App nicht auf Schadsoftware prüfen, und stellt *In
den Papierkorb legen* als blauen Vorgabeknopf voran. Stattdessen:

1. **Fertig** klicken.
2. *Systemeinstellungen* → *Datenschutz & Sicherheit* → Abschnitt *Sicherheit*
   → **Dennoch öffnen**.
3. Mit Passwort oder Touch ID bestätigen, dann **Öffnen**.

Der Knopf erscheint erst nach dem Startversuch und steht dort etwa eine Stunde.
Danach ist die Ausnahme dauerhaft gesetzt und die App startet per Doppelklick.

Den früher üblichen Weg über Rechtsklick → *Öffnen* gibt es seit macOS 15 nicht
mehr. Wer lieber ein Terminal benutzt, kommt mit einem Befehl ans Ziel:

```bash
xattr -dr com.apple.quarantine /Applications/Komparsendrehplanung.app
```

Ganz verschwindet der Hinweis erst mit einer Apple-Developer-ID samt
Notarisierung — die kostet jährlich und ist bewusst nicht Teil des Projekts.

**Windows** — Setup ausführen. Es installiert ins Benutzerprofil und braucht
deshalb keine Administratorrechte; SmartScreen meldet aus demselben Grund einen
unbekannten Herausgeber (*Weitere Informationen* → *Trotzdem ausführen*).

**Linux** — Archiv entpacken und das mitgelieferte Skript starten:

```bash
tar -xzf Komparsendrehplanung-*-linux-x86_64.tar.gz
cd Komparsendrehplanung
./install.sh
```

`./install.sh --with-service` richtet zusätzlich eine systemd-User-Unit ein, die
die App bei jeder Anmeldung startet.

Nach dem Start öffnet sich der Browser auf http://localhost:3001.

Wie man die Anwendung wieder los wird, unterscheidet sich je System:

| System | Läuft sichtbar als | Beenden |
| --- | --- | --- |
| macOS | kleines Fenster „Komparsendrehplanung" | Fenster schließen oder darin „Beenden" |
| Windows | Konsolenfenster | Fenster schließen |
| Linux | Konsolenfenster, als Dienst gar nicht | `systemctl --user stop komparsendrehplanung` |

Den Browser-Tab zu schließen genügt in keinem Fall — der Server läuft dann
weiter. Auf dem Mac ist deshalb das kleine Fenster die Anwendung: Es hat einen
Eintrag im Dock, und solange es offen ist, ist der Drehplan erreichbar.

### Wo die Daten liegen

Nicht im Programmverzeichnis, sondern im Benutzerprofil — damit ein Update die
Datenbank nicht anfassen kann:

| System | Pfad |
| --- | --- |
| macOS | `~/Library/Application Support/Komparsendrehplanung/komparsen.sqlite` |
| Windows | `%LOCALAPPDATA%\Komparsendrehplanung\komparsen.sqlite` |
| Linux | `~/.local/share/Komparsendrehplanung/komparsen.sqlite` |

Auf dem Mac ist das der **Library-Ordner im Benutzerverzeichnis**, nicht der auf
der Festplatte — der Finder blendet ihn aus. Erreichbar über *Gehe zu ▸ Gehe zum
Ordner* oder aus dem Terminal:

```bash
open ~/Library/Application\ Support/Komparsendrehplanung/
```

**Zum Sichern gehören drei Dateien.** Neben der `komparsen.sqlite` liegen eine
`-wal` und eine `-shm`; SQLite schreibt neue Änderungen zuerst in die `-wal` und
räumt sie erst später in die Hauptdatei. Die kann deshalb winzig aussehen,
während die eigentliche Arbeit in der `-wal` steht. Wer nur die `.sqlite`
kopiert, sichert unter Umständen einen viel älteren Stand. Am sichersten kopiert
man alle drei, nachdem man die Anwendung beendet hat.

### Prüfsummen kontrollieren

Jedes Release enthält eine `SHA256SUMS.txt`. Wer die heruntergeladene Datei
prüfen will, legt beides in denselben Ordner:

```bash
sha256sum --check --ignore-missing SHA256SUMS.txt
```

Unter macOS heißt der Befehl `shasum -a 256 --check --ignore-missing SHA256SUMS.txt`,
unter Windows in der PowerShell `Get-FileHash <Datei> -Algorithm SHA256`.

Zusätzlich trägt jedes Artefakt eine von GitHub ausgestellte
Herkunftsbescheinigung. Mit der GitHub-CLI prüfbar:

```bash
gh attestation verify Komparsendrehplanung-<version>-windows-x64.exe --repo CPR-Production/Komparsendrehplanung
```

### Update

Sobald eine neuere Version vorliegt, erscheint oben im Fenster ein Banner mit
dem Knopf **Jetzt installieren**. Er lädt die neue Version, prüft ihre
Prüfsumme, tauscht sie aus und startet die Anwendung neu — danach lädt sich die
Seite von selbst neu. Passt die Prüfsumme nicht, wird nichts ausgetauscht.

Der Knopf fehlt, wenn das Programmverzeichnis dem eigenen Konto nicht gehört —
etwa bei einer Installation, die jemand anderes mit Administratorrechten
angelegt hat. Dann geht es wie beim ersten Mal: neues Paket von der
Releases-Seite laden und über die vorhandene Installation drüber installieren.

Die Datenbank liegt in beiden Fällen außerhalb des Programmverzeichnisses und
bleibt unberührt; Migrationen laufen beim ersten Start der neuen Version
automatisch.

## Weg 2: Docker

### Voraussetzung

- Docker Desktop (Mac/Windows) oder Docker Engine (Linux)

### Start

```bash
cd infra/docker
docker compose up -d
```

Die Anwendung ist danach unter http://localhost:3001 erreichbar. Alle Daten
liegen im Docker-Volume `komparsen-data` und bleiben über Neustarts und
Updates hinweg erhalten.

### Update auf eine neue Version

```bash
git pull
cd infra/docker
docker compose up -d --build
```

Datenbank-Migrationen laufen beim Start automatisch — es ist kein manueller
Migrationsschritt nötig.

## Update-Hinweis und Feedback

Beides hängt an einer einzigen Einstellung: `GITHUB_REPO` im Format `owner/repo`.
Sie ist auf das Repository dieses Projekts vorbelegt und muss nirgends
eingetragen werden — weder im Docker- noch im Installer-Betrieb. Wer die App
geforkt hat, setzt die Umgebungsvariable `GITHUB_REPO` auf sein eigenes
Repository; ein leerer Wert (`GITHUB_REPO=`) schaltet Banner und
Feedback-Formular ab.

Ist sie gesetzt, fragt der Server stündlich das neueste Release über die
GitHub-API ab und blendet bei einer neueren Version oben ein Banner ein. Unter
*Hilfe & Feedback* kann ein Nutzer außerdem eine Meldung vorbereiten, die auf
GitHub als Issue geöffnet wird — abgeschickt unter seinem eigenen Konto, es
liegt also **kein Token in der Installation**.

Ohne die Einstellung bleiben Banner und Feedback-Formular ausgeblendet; die App
funktioniert unverändert. Das Repository muss öffentlich sein, sonst kommen
weder Update-Abfrage noch Issue-Formular ohne Zugangsdaten aus.

Vorabversionen (Tags mit Suffix, etwa `v1.2.0-rc1`) lösen das Banner bewusst
nicht aus.

## Backup

Die einzige zu sichernde Datei ist die SQLite-Datenbank — im Docker-Betrieb im
Volume, sonst an den oben genannten Pfaden. Ein Kopier-Job für regelmäßige
Backups ist für eine spätere Phase vorgesehen (siehe Architektur-Plan, Phase 6).
