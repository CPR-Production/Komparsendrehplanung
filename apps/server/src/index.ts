import cors from "cors";
import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { runMigrations } from "./db/client.js";
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const webDist = join(__dirname, "../../web/dist");
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(join(webDist, "index.html"));
  });
}

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
