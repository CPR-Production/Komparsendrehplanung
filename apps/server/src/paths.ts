import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { isSea } from "node:sea";
import { fileURLToPath } from "node:url";

// Der Release-Build ist eine Single-Executable-Application: Migrationen, Web-
// Assets und das SQLite-Addon liegen dann als Ordner-Nutzlast neben der Binary
// statt im Quellbaum. isSea() unterscheidet beide Fälle zur Laufzeit, damit der
// Build keine Flags einbacken muss.
export const isPackaged = isSea();

// Im Bundle zeigt das auf die Binary; deshalb wird es nur im Dev-Zweig benutzt.
const sourceDir = dirname(fileURLToPath(import.meta.url));

export const appDir = isPackaged ? dirname(process.execPath) : sourceDir;

export const migrationsDir = isPackaged
  ? join(appDir, "migrations")
  : join(sourceDir, "db/migrations");

export const webDistDir = isPackaged ? join(appDir, "web") : join(sourceDir, "../../web/dist");

// Nur im gepackten Betrieb gesetzt: dort löst weder `bindings` noch das
// require() der SEA-Runtime eine Datei auf der Platte auf, das Addon muss von
// Hand geladen werden. Im Dev-Betrieb findet better-sqlite3 es selbst.
export const nativeBindingPath = isPackaged ? join(appDir, "better_sqlite3.node") : null;

// Das Programmverzeichnis ist nach einer Installation nicht verlässlich
// beschreibbar — unter Windows liegt es unter Programme, unter macOS im
// App-Bundle. Die Datenbank gehört deshalb ins Benutzerverzeichnis.
function userDataDir(): string {
  const name = "Komparsendrehplanung";
  if (process.platform === "win32") {
    return join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), name);
  }
  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", name);
  }
  return join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"), name);
}

// DATABASE_PATH gewinnt immer — darüber hängt das Docker-Volume. Ohne sie
// bleibt der Dev-Betrieb bei ./data neben dem Arbeitsverzeichnis.
export const databasePath =
  process.env.DATABASE_PATH ??
  (isPackaged ? join(userDataDir(), "komparsen.sqlite") : "./data/komparsen.sqlite");
