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

// "owner/repo". Drives both the update check and the feedback issue links —
// empty means the app simply hides both features rather than guessing a repo.
export const GITHUB_REPO = process.env.GITHUB_REPO ?? "";
