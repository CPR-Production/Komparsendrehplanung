# Selbst hosten

Diese Anleitung ist für Endnutzer gedacht, die die Anwendung auf ihrem eigenen
Rechner betreiben möchten, ohne einen separaten Datenbankserver zu installieren.
Die App speichert alle Daten in einer einzelnen SQLite-Datei.

## Voraussetzung

- Docker Desktop (Mac/Windows) oder Docker Engine (Linux)

## Start

```bash
cd infra/docker
docker compose up -d
```

Die Anwendung ist danach unter http://localhost:3001 erreichbar. Alle Daten
liegen im Docker-Volume `komparsen-data` und bleiben über Neustarts und
Updates hinweg erhalten.

## Update auf eine neue Version

```bash
git pull
cd infra/docker
docker compose up -d --build
```

Datenbank-Migrationen laufen beim Start automatisch — es ist kein manueller
Migrationsschritt nötig.

## Update-Hinweis und Feedback einschalten

Beides hängt an einer einzigen Einstellung: `GITHUB_REPO` im Format `owner/repo`.

```yaml
# infra/docker/docker-compose.yml
services:
  app:
    environment:
      - GITHUB_REPO=owner/repo
```

Ist sie gesetzt, fragt der Server stündlich das neueste Release über die
GitHub-API ab und blendet bei einer neueren Version oben ein Banner ein. Unter
*Hilfe & Feedback* kann ein Nutzer außerdem eine Meldung vorbereiten, die auf
GitHub als Issue geöffnet wird — abgeschickt unter seinem eigenen Konto, es
liegt also **kein Token in der Installation**.

Ohne die Einstellung bleiben Banner und Feedback-Formular ausgeblendet; die App
funktioniert unverändert. Das Repository muss öffentlich sein, sonst kommen
weder Update-Abfrage noch Issue-Formular ohne Zugangsdaten aus.

## Backup

Die einzige zu sichernde Datei ist die SQLite-Datenbank im Volume. Ein Kopier-Job
für regelmäßige Backups ist für eine spätere Phase vorgesehen (siehe Architektur-Plan,
Phase 6).
