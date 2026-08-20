import cors from "cors";
import express from "express";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { runMigrations } from "./db/client.js";
import { isPackaged, webDistDir } from "./paths.js";
import { categoriesRouter } from "./routes/categories.js";
import { categoryGroupsRouter } from "./routes/categoryGroups.js";
import { changesRouter } from "./routes/changes.js";
import { projectsRouter } from "./routes/projects.js";
import { rolesRouter } from "./routes/roles.js";
import { scenesRouter } from "./routes/scenes.js";
import { setLocationsRouter } from "./routes/setLocations.js";
import { setsRouter } from "./routes/sets.js";
import { updatesRouter } from "./routes/updates.js";

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

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  const url = `http://localhost:${port}`;
  console.log(`Server listening on ${url}`);
  openBrowser(url);
});
