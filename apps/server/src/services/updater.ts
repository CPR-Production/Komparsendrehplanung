import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { accessSync, constants, existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import type { Server } from "node:http";
import { join } from "node:path";
import { promisify } from "node:util";
import { APP_VERSION, GITHUB_API_BASE, GITHUB_REPO } from "../config.js";
import { appDir, isPackaged } from "../paths.js";

const execFileAsync = promisify(execFile);

export type UpdatePhase =
  | "idle"
  | "downloading"
  | "verifying"
  | "installing"
  | "restarting"
  | "failed";

export interface UpdateProgress {
  phase: UpdatePhase;
  version: string | null;
  error: string | null;
}

// Der Fortschritt lebt bewusst nur im Speicher: Ein Update dauert eine Minute,
// und nach dem Neustart ist die Frage nach dem Fortschritt ohnehin durch die
// neue Versionsnummer beantwortet.
let progress: UpdateProgress = { phase: "idle", version: null, error: null };
let httpServer: Server | null = null;

export function getUpdateProgress(): UpdateProgress {
  return progress;
}

// index.ts reicht den Server durch, damit der Updater den Port freigeben kann,
// bevor der Nachfolger ihn belegen will.
export function registerServer(server: Server) {
  httpServer = server;
}

export interface UpdateCapability {
  supported: boolean;
  // Wird der UI gezeigt, damit sie erklären kann, warum der Knopf fehlt.
  reason: "container" | "notPackaged" | "readOnly" | null;
}

export function updateCapability(): UpdateCapability {
  // Ein Container kann sich nicht selbst ersetzen, ohne Zugriff auf den
  // Docker-Socket zu bekommen — den will eine Büro-Installation nicht haben.
  if (existsSync("/.dockerenv")) return { supported: false, reason: "container" };
  if (!isPackaged) return { supported: false, reason: "notPackaged" };
  try {
    accessSync(appDir, constants.W_OK);
  } catch {
    // Etwa eine Installation unter /Applications, die einem anderen Konto
    // gehört, oder ein systemweit installiertes Programmverzeichnis.
    return { supported: false, reason: "readOnly" };
  }
  return { supported: true, reason: null };
}

// Liegt innerhalb des Programmverzeichnisses, weil das Austauschen über
// renameSync läuft — über Dateisystemgrenzen hinweg scheitert das.
const STAGING_DIR = ".update-staging";

// Denselben Namen bildet scripts/build-release.mjs beim Verpacken.
function archiveName(version: string): string {
  return `payload-${version}-${process.platform}-${process.arch}.tar.gz`;
}

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

async function fetchLatestRelease(): Promise<{ tag: string; assets: ReleaseAsset[] }> {
  const res = await fetch(`${GITHUB_API_BASE}/repos/${GITHUB_REPO}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "komparsendrehplanung" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`GitHub antwortete mit ${res.status}`);
  const release = (await res.json()) as { tag_name?: string; assets?: ReleaseAsset[] };
  if (!release.tag_name) throw new Error("Release ohne Tag");
  return { tag: release.tag_name.replace(/^v/, ""), assets: release.assets ?? [] };
}

async function download(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { "User-Agent": "komparsendrehplanung" },
    redirect: "follow",
    signal: AbortSignal.timeout(10 * 60_000),
  });
  if (!res.ok) throw new Error(`Download fehlgeschlagen (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

// Die Prüfsumme ist der einzige Schutz davor, sich etwas Fremdes ins
// Programmverzeichnis zu holen — ohne sie wird nicht ausgetauscht.
function verifyChecksum(archive: Buffer, sums: string, name: string) {
  const actual = createHash("sha256").update(archive).digest("hex");
  const line = sums
    .split("\n")
    .map((entry) => entry.trim().split(/\s+/))
    .find(([, file]) => file?.replace(/^\*/, "") === name);
  if (!line) throw new Error(`Keine Prüfsumme für ${name} im Release`);
  if (line[0] !== actual) {
    throw new Error(`Prüfsumme stimmt nicht: erwartet ${line[0]}, berechnet ${actual}`);
  }
}

// Tauscht die Nutzlast aus, indem die laufenden Dateien umbenannt statt
// überschrieben werden: Windows lässt eine laufende .exe nicht überschreiben,
// wohl aber umbenennen. Nebeneffekt ist ein Rückweg — die alten Dateien liegen
// bis zum nächsten Start noch da.
function swapIn(stagedDir: string) {
  const retired: Array<{ live: string; retiredPath: string }> = [];
  const moved: string[] = [];
  try {
    for (const name of readdirSync(stagedDir)) {
      const live = join(appDir, name);
      if (existsSync(live)) {
        const retiredPath = `${live}.old`;
        rmSync(retiredPath, { recursive: true, force: true });
        renameSync(live, retiredPath);
        retired.push({ live, retiredPath });
      }
      renameSync(join(stagedDir, name), live);
      moved.push(live);
    }
  } catch (error) {
    // Halb getauscht ist schlimmer als gar nicht getauscht: zurückdrehen, was
    // schon bewegt wurde, damit die alte Version weiterläuft.
    for (const live of moved) rmSync(live, { recursive: true, force: true });
    for (const { live, retiredPath } of retired.reverse()) renameSync(retiredPath, live);
    throw error;
  }
}

// Reste eines vorangegangenen Updates. Läuft beim Start, weil Windows die alte
// .exe erst freigibt, wenn der Prozess weg ist, der sie ausgeführt hat.
export function cleanUpAfterUpdate() {
  if (!isPackaged) return;
  try {
    for (const name of readdirSync(appDir)) {
      if (name.endsWith(".old")) rmSync(join(appDir, name), { recursive: true, force: true });
    }
    rmSync(join(appDir, STAGING_DIR), { recursive: true, force: true });
  } catch (error) {
    // Kein Grund, den Start abzubrechen — beim nächsten Mal klappt es.
    console.warn("Aufräumen nach Update unvollständig:", error instanceof Error ? error.message : error);
  }
}

function restart() {
  const relaunch = () => {
    // process.execPath zeigt auf den Pfad, an dem jetzt die neue Binary liegt.
    spawn(process.execPath, process.argv.slice(1), {
      detached: true,
      stdio: "ignore",
      cwd: appDir,
    }).unref();
    process.exit(0);
  };
  // Erst den Port freigeben, sonst findet der Nachfolger ihn belegt vor.
  if (httpServer) httpServer.close(relaunch);
  else relaunch();
}

export async function startUpdate(): Promise<void> {
  const capability = updateCapability();
  if (!capability.supported) throw new Error(`Update hier nicht möglich (${capability.reason})`);
  if (!GITHUB_REPO) throw new Error("Kein GITHUB_REPO hinterlegt");
  if (progress.phase !== "idle" && progress.phase !== "failed") {
    throw new Error("Es läuft bereits ein Update");
  }

  progress = { phase: "downloading", version: null, error: null };
  const staging = join(appDir, STAGING_DIR);

  try {
    const release = await fetchLatestRelease();
    progress = { ...progress, version: release.tag };
    if (release.tag === APP_VERSION) throw new Error("Diese Version läuft bereits");

    const wanted = archiveName(release.tag);
    const archiveAsset = release.assets.find((asset) => asset.name === wanted);
    const sumsAsset = release.assets.find((asset) => asset.name === "SHA256SUMS.txt");
    if (!archiveAsset) throw new Error(`Das Release enthält kein ${wanted}`);
    if (!sumsAsset) throw new Error("Das Release enthält keine SHA256SUMS.txt");

    const [archive, sums] = await Promise.all([
      download(archiveAsset.browser_download_url),
      download(sumsAsset.browser_download_url).then((buffer) => buffer.toString("utf8")),
    ]);

    progress = { ...progress, phase: "verifying" };
    verifyChecksum(archive, sums, wanted);

    progress = { ...progress, phase: "installing" };
    // Entpackt wird innerhalb des Programmverzeichnisses, weil das Austauschen
    // über renameSync läuft — über Dateisystemgrenzen hinweg scheitert das.
    rmSync(staging, { recursive: true, force: true });
    mkdirSync(staging, { recursive: true });
    // Beide Pfade relativ zum Programmverzeichnis: Liegt unter Windows eine
    // GNU tar im Pfad (Git for Windows bringt eine mit), liest sie ein
    // "C:\..." als host:path im rsh-Stil und scheitert. Ein
    // Laufwerksbuchstabe darf im Argument also nicht vorkommen.
    const archivePath = join(appDir, wanted);
    writeFileSync(archivePath, archive);
    await execFileAsync("tar", ["-xzf", wanted, "-C", STAGING_DIR], { cwd: appDir });
    rmSync(archivePath, { force: true });

    swapIn(staging);
    rmSync(staging, { recursive: true, force: true });

    progress = { ...progress, phase: "restarting" };
    // Kurz Luft lassen, damit die Antwort auf die Anfrage noch rausgeht, bevor
    // der Prozess sich beendet.
    setTimeout(restart, 500);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Update fehlgeschlagen:", message);
    rmSync(staging, { recursive: true, force: true });
    progress = { phase: "failed", version: progress.version, error: message };
    throw error;
  }
}
