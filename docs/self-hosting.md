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

## Backup

Die einzige zu sichernde Datei ist die SQLite-Datenbank im Volume. Ein Kopier-Job
für regelmäßige Backups ist für eine spätere Phase vorgesehen (siehe Architektur-Plan,
Phase 6).
