import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Der Release-Build ersetzt diesen Bezeichner per esbuild-Define durch die
// Version aus dem Git-Tag — in der gepackten Binary liegt keine package.json
// mehr auf der Platte, aus der man sie lesen könnte. Im Dev-Betrieb existiert
// er nicht, daher das typeof-Gate statt eines direkten Zugriffs.
declare const __APP_VERSION__: string | undefined;

// Docker stempelt die Version weiterhin über die Umgebung ein. Die
// package.json-Lesung ist der Dev-Fallback, das Literal die letzte Rettung
// statt eines Absturzes beim Start.
function resolveVersion(): string {
  if (process.env.APP_VERSION) return process.env.APP_VERSION;
  if (typeof __APP_VERSION__ === "string") return __APP_VERSION__;
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = readFileSync(join(here, "../package.json"), "utf8");
    return (JSON.parse(pkg) as { version?: string }).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export const APP_VERSION = resolveVersion();

// "owner/repo". Drives both the update check and the feedback issue links.
// Vorbelegt mit dem Repository des Projekts, damit beides in jeder Installation
// ohne Konfiguration funktioniert — im Dev-Betrieb, im Container und in der
// gepackten Binary gleichermaßen, die gar keine Umgebung mitbekommt. Ein Fork
// setzt die Variable auf sein eigenes Repository, ein leerer Wert schaltet
// Banner und Feedback-Formular ab.
export const GITHUB_REPO = process.env.GITHUB_REPO ?? "CPR-Production/Komparsendrehplanung";

// Überschreibbar für GitHub-Enterprise-Installationen und für den Prüflauf des
// Updaters gegen eine lokale Nachbildung.
export const GITHUB_API_BASE = (process.env.GITHUB_API_BASE ?? "https://api.github.com").replace(
  /\/$/,
  "",
);
