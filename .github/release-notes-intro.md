## Installation

Die passende Datei unter **Assets** herunterladen:

| Datei | Für |
| --- | --- |
| `…-macos-arm64.dmg` | Mac mit Apple Silicon (M1 und neuer) |
| `…-macos-x86_64.dmg` | Mac mit Intel-Prozessor |
| `…-windows-x64.exe` | Windows |
| `…-linux-x86_64.tar.gz` | Linux |

Die `payload-…`-Archive gehören zur eingebauten Update-Funktion und sind nicht
zum Installieren von Hand gedacht.

### Der erste Start braucht einen Handgriff

Diese App ist quelloffen und nicht bei Apple oder Microsoft registriert. Beide
Systeme melden das beim ersten Start — einmalig.

**macOS:** Der Dialog sagt, Apple könne die App nicht auf Schadsoftware prüfen,
und bietet *In den Papierkorb legen* als blauen Vorgabeknopf an. **Nicht den
nehmen.**

1. **Fertig** klicken.
2. *Systemeinstellungen* → *Datenschutz & Sicherheit* → hinunterscrollen zum
   Abschnitt *Sicherheit*. Dort steht die App mit dem Knopf **Dennoch öffnen**.
3. Mit Passwort oder Touch ID bestätigen, dann **Öffnen**.

Der Knopf erscheint erst nach dem Startversuch und bleibt etwa eine Stunde
stehen. Danach startet die App per Doppelklick wie jedes andere Programm.

**Windows:** SmartScreen meldet einen unbekannten Herausgeber — *Weitere
Informationen* → *Trotzdem ausführen*.

**Linux:** Archiv entpacken, `./install.sh` ausführen.

Danach läuft die App unter <http://localhost:3001> und der Browser öffnet sich
von selbst. Ausführlich: [Selbst hosten](https://github.com/CPR-Production/Komparsendrehplanung/blob/master/docs/self-hosting.md).

---
