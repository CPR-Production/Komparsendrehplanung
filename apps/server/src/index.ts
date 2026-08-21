import cors from "cors";
import express from "express";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { runMigrations } from "./db/client.js";
import { isPackaged, webDistDir } from "./paths.js";
import { cleanUpAfterUpdate, registerServer } from "./services/updater.js";
import { categoriesRouter } from "./routes/categories.js";
import { categoryGroupsRouter } from "./routes/categoryGroups.js";
import { changesRouter } from "./routes/changes.js";
import { projectsRouter } from "./routes/projects.js";
import { rolesRouter } from "./routes/roles.js";
import { sceneColorsRouter } from "./routes/sceneColors.js";
import { scenesRouter } from "./routes/scenes.js";
import { setLocationsRouter } from "./routes/setLocations.js";
import { setsRouter } from "./routes/sets.js";
import { updatesRouter } from "./routes/updates.js";

// Vor den Migrationen: Reste eines vorangegangenen Updates liegen noch im
// Programmverzeichnis, weil Windows die alte .exe erst mit dem Prozess freigibt.
cleanUpAfterUpdate();

runMigrations();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", projectsRouter);
app.use("/api", categoryGroupsRouter);
app.use("/api", categoriesRouter);
app.use("/api", setsRouter);
app.use("/api", setLocationsRouter);
app.use("/api", scenesRouter);
app.use("/api", sceneColorsRouter);
app.use("/api", rolesRouter);
app.use("/api", changesRouter);
app.use("/api", updatesRouter);

if (existsSync(webDistDir)) {
  app.use(express.static(webDistDir));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(join(webDistDir, "index.html"));
  });
}

// Aus einer Installation heraus gestartet, ist der Doppelklick die einzige
// Bedienung — ohne das hier sähe der Nutzer nur ein Terminalfenster. Im
// Dev- und Docker-Betrieb bleibt es aus, dort stört ein aufspringender
// Browser bei jedem Neustart.
function openBrowser(url: string) {
  if (!isPackaged || process.env.KOMPARSEN_NO_BROWSER) return;
  const command =
    process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  // Ein fehlender Öffner darf den Server nicht mitreißen: die App läuft auch
  // dann, der Nutzer muss die Adresse nur selbst eintippen.
  spawn(command, args, { detached: true, stdio: "ignore" }).on("error", () => {}).unref();
}

// Aus einem App-Bundle heraus gibt es kein Fenster, in dem eine
// Konsolenausgabe landen könnte — ohne Dialog verschwände die App wortlos.
// Einzeilig, weil AppleScript keine Zeilenumbrüche in Zeichenketten kennt.
function showFailureDialog(message: string) {
  if (!isPackaged || process.platform !== "darwin") return;
  const script = `display dialog ${JSON.stringify(message.replace(/\s+/g, " "))} buttons {"OK"} with icon caution with title "Komparsendrehplanung"`;
  spawn("osascript", ["-e", script], { detached: true, stdio: "ignore" })
    .on("error", () => {})
    .unref();
}

// Antwortet auf dem Port bereits eine Komparsendrehplanung? Gibt deren Version
// zurück, damit die Meldung sagen kann, welche dort läuft — bei einer
// Entwicklungsumgebung neben einer Installation ist genau das die Frage.
async function runningVersionAt(url: string): Promise<string | null> {
  try {
    const res = await fetch(`${url}/api/version`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return null;
    const body = (await res.json()) as { version?: unknown };
    return typeof body.version === "string" ? body.version : null;
  } catch {
    return null;
  }
}

async function reportPortInUse(url: string) {
  // Der häufige Fall: jemand hat zweimal geklickt. Dann ist das Fenster zur
  // schon laufenden Instanz die richtige Antwort, nicht eine Fehlermeldung.
  const running = await runningVersionAt(url);
  if (running) {
    console.log(`Komparsendrehplanung ${running} läuft bereits auf ${url} — öffne das Fenster dorthin.`);
    openBrowser(url);
    // Kurz Luft, damit der Browser-Aufruf den Prozess noch verlässt.
    setTimeout(() => process.exit(0), 500);
    return;
  }

  const message =
    `Port ${port} ist von einem anderen Programm belegt, deshalb kann ` +
    `Komparsendrehplanung nicht starten. Beenden Sie das andere Programm, ` +
    `oder starten Sie die App mit einem anderen Port (Umgebungsvariable PORT).`;
  console.error(message);
  showFailureDialog(message);
  setTimeout(() => process.exit(1), 500);
}

const port = Number(process.env.PORT ?? 3001);
const url = `http://localhost:${port}`;

const server = app.listen(port, () => {
  console.log(`Server listening on ${url}`);
  openBrowser(url);
});

// Nach einem Selbst-Update startet der Nachfolger, während der Vorgänger seinen
// Listener gerade erst schließt. Ohne diese Versuche hielte die neue Version
// den Vorgänger für eine laufende Instanz und beendete sich sofort wieder —
// das Update sähe dann aus, als hätte es die App abgeschossen.
const BIND_ATTEMPTS = 20;
const BIND_RETRY_MS = 300;
let bindAttempts = 0;

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code !== "EADDRINUSE") throw error;
  if (++bindAttempts <= BIND_ATTEMPTS) {
    setTimeout(() => server.listen(port), BIND_RETRY_MS);
    return;
  }
  void reportPortInUse(url);
});

// Der Updater schließt den Listener selbst, bevor er den Nachfolger startet.
registerServer(server);
