#!/usr/bin/env node
// Baut die Ordner-Nutzlast für die Plattform, auf der dieses Skript läuft:
// eine Single-Executable-Application plus die Dateien, die sie zur Laufzeit von
// der Platte liest. Cross-Kompilieren geht bewusst nicht — das native Addon von
// better-sqlite3 entsteht nur auf der Zielplattform, deshalb die Runner-Matrix
// im Release-Workflow.
import { execFileSync, execSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { inject } from "postject";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = "true"] = arg.replace(/^--/, "").split("=");
    return [key, value];
  }),
);

// Der Tag ist die Wahrheit; ohne ihn (lokaler Probelauf) die Wurzel-package.json.
const version = (
  args.get("version") ??
  JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")).version
).replace(/^v/, "");

const isWindows = process.platform === "win32";
const exeName = isWindows ? "komparsen.exe" : "komparsen";
const workDir = join(repoRoot, "build", "release");
const payloadDir = join(workDir, "payload");

function run(command, commandArgs, options = {}) {
  execFileSync(command, commandArgs, { stdio: "inherit", cwd: repoRoot, ...options });
}

// Unter Windows ist npm eine .cmd, und seit dem Sicherheitsfix in Node
// (CVE-2024-27980) verweigert execFile das Starten von .cmd und .bat. execSync
// geht immer über die Shell und umgeht das; ein Argument-Array wäre dort der
// nächste Stolperstein (DEP0190), deshalb ein fertiger Befehl. Es kommt nichts
// von außen hinein — der Skriptname steht hier als Literal.
function runNpm(script) {
  execSync(`npm run ${script}`, { stdio: "inherit", cwd: repoRoot });
}

function step(message) {
  console.log(`\n▸ ${message}`);
}

// --- Workspaces bauen ------------------------------------------------------

if (!args.has("skip-build")) {
  step("Workspaces bauen");
  runNpm("build:shared");
  runNpm("build:web");
  runNpm("build:server");
}

// --- Server bündeln --------------------------------------------------------

step("Server zu einer CJS-Datei bündeln");
rmSync(workDir, { recursive: true, force: true });
mkdirSync(payloadDir, { recursive: true });

const bundlePath = join(workDir, "bundle.cjs");
await build({
  entryPoints: [join(repoRoot, "apps/server/dist/index.js")],
  bundle: true,
  platform: "node",
  // CommonJS, weil eine SEA nur damit umgehen kann.
  format: "cjs",
  target: `node${process.versions.node.split(".")[0]}`,
  outfile: bundlePath,
  define: { __APP_VERSION__: JSON.stringify(version), "import.meta.url": "__importMetaUrl" },
  // import.meta gibt es in CJS nicht. Die betroffenen Stellen laufen im
  // gepackten Betrieb ohnehin nicht, der Ausdruck muss nur auswertbar bleiben.
  banner: { js: 'const __importMetaUrl = require("node:url").pathToFileURL(__filename).href;' },
  logLevel: "info",
});

// --- SEA-Blob erzeugen -----------------------------------------------------

step("SEA-Blob erzeugen");
const seaConfigPath = join(workDir, "sea-config.json");
const blobPath = join(workDir, "sea-prep.blob");
writeFileSync(
  seaConfigPath,
  JSON.stringify(
    { main: bundlePath, output: blobPath, disableExperimentalSEAWarning: true },
    null,
    2,
  ),
);
run(process.execPath, ["--experimental-sea-config", seaConfigPath]);

// --- Node-Binary besorgen --------------------------------------------------

step("Node-Binary vorbereiten");
const exePath = join(payloadDir, exeName);
let sourceNode = process.env.NODE_BINARY ?? process.execPath;

// Ein Universal-Binary (so liefert der macOS-Installer von nodejs.org aus)
// enthält den Sentinel zweimal, einmal je Architektur — postject bricht dann
// ab. Der passende Slice ist ein Einzelarchitektur-Binary.
if (process.platform === "darwin") {
  const archs = execFileSync("lipo", ["-archs", sourceNode], { encoding: "utf8" }).trim().split(/\s+/);
  if (archs.length > 1) {
    const thinned = join(workDir, "node-thin");
    run("lipo", ["-thin", process.arch, sourceNode, "-output", thinned]);
    sourceNode = thinned;
  }
}

cpSync(sourceNode, exePath);
if (!isWindows) run("chmod", ["+x", exePath]);

// Die Injektion macht jede vorhandene Signatur ungültig; macOS verweigert dann
// den Start. Vorher entfernen, hinterher ad-hoc neu signieren.
if (process.platform === "darwin") {
  run("codesign", ["--remove-signature", exePath]);
}

step("Bundle in die Binary injizieren");
await inject(exePath, "NODE_SEA_BLOB", readFileSync(blobPath), {
  sentinelFuse: "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
  machoSegmentName: process.platform === "darwin" ? "NODE_SEA" : undefined,
});

if (process.platform === "darwin") {
  // Ad-hoc, nicht notariell: ohne Developer-ID bleibt der Gatekeeper-Hinweis
  // beim ersten Start bestehen. Ohne diese Signatur startet es gar nicht.
  run("codesign", ["--sign", "-", exePath]);
}

// --- Nutzlast zusammenstellen ----------------------------------------------

step("Nutzlast zusammenstellen");
cpSync(
  join(repoRoot, "node_modules/better-sqlite3/build/Release/better_sqlite3.node"),
  join(payloadDir, "better_sqlite3.node"),
);
cpSync(join(repoRoot, "apps/web/dist"), join(payloadDir, "web"), { recursive: true });
cpSync(join(repoRoot, "apps/server/src/db/migrations"), join(payloadDir, "migrations"), {
  recursive: true,
});

// --- Nutzlast-Archiv für das Selbst-Update -------------------------------

// Das Update lädt bewusst nicht den Installer nach: aus einem DMG, einem
// Inno-Setup und einem tar.gz zu aktualisieren wären drei Mechanismen. Mit
// diesem Archiv ist es überall derselbe Weg — entpacken und austauschen.
// Der Name trägt Plattform und Architektur so, wie Node sie meldet, damit der
// Updater ihn ohne Übersetzungstabelle bilden kann.
step("Nutzlast-Archiv für Selbst-Updates");
const distDir = join(repoRoot, "build", "release", "dist");
mkdirSync(distDir, { recursive: true });
const archiveName = `payload-${version}-${process.platform}-${process.arch}.tar.gz`;
run("tar", ["-czf", join(distDir, archiveName), "-C", payloadDir, "."], {
  // Ohne das legt das tar von macOS zu jeder Datei eine ._-Beidatei ins Archiv.
  env: { ...process.env, COPYFILE_DISABLE: "1" },
});

console.log(`\n✓ Nutzlast ${version} für ${process.platform}-${process.arch} in ${payloadDir}`);
console.log(`✓ Archiv ${archiveName}`);
