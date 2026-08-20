import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Release builds stamp the version in via the environment. The package.json
// read is the dev fallback; in a packaged binary that file may not be on disk,
// hence the last-resort literal rather than a throw.
function resolveVersion(): string {
  if (process.env.APP_VERSION) return process.env.APP_VERSION;
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
