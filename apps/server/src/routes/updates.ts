import { Router } from "express";
import { APP_VERSION, GITHUB_API_BASE, GITHUB_REPO } from "../config.js";
import {
  getUpdateProgress,
  startUpdate,
  updateCapability,
  type UpdateCapability,
} from "../services/updater.js";

export const updatesRouter = Router();

export interface UpdateStatus {
  configured: boolean;
  current: string;
  latest: string | null;
  updateAvailable: boolean;
  releaseUrl: string | null;
  publishedAt: string | null;
  // Set when the check itself failed (offline, rate limited). The UI stays
  // quiet in that case rather than claiming the app is up to date.
  checkFailed: boolean;
  // Ob diese Installation sich selbst austauschen kann. Docker- und
  // Entwicklungsbetrieb können es nicht, dort bleibt es beim Link.
  canSelfUpdate: boolean;
  selfUpdateReason: UpdateCapability["reason"];
}

// Unauthenticated GitHub API calls are limited to 60/hour per IP, and every
// open browser tab would otherwise trigger one. One shared result per hour is
// far more than enough for a check that looks for a new release.
const CACHE_TTL_MS = 60 * 60 * 1000;
let cached: { at: number; status: CachedStatus } | null = null;

// Compares "1.10.0" above "1.9.0" — a plain string compare gets that wrong.
// Anything non-numeric (pre-release suffixes) is ignored for ordering.
function compareVersions(a: string, b: string): number {
  const parse = (v: string) => v.replace(/^v/, "").split(/[.\-+]/).map(Number);
  const left = parse(a);
  const right = parse(b);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const l = Number.isFinite(left[i]) ? left[i] : 0;
    const r = Number.isFinite(right[i]) ? right[i] : 0;
    if (l !== r) return l > r ? 1 : -1;
  }
  return 0;
}

type CachedStatus = Omit<UpdateStatus, "canSelfUpdate" | "selfUpdateReason">;

// Die Eignung zum Selbst-Update hängt nicht am GitHub-Ergebnis und gehört
// deshalb nicht in den stündlichen Cache — sie kommt bei jeder Antwort frisch
// dazu, sonst überlebte etwa ein Rechteproblem eine Stunde lang seine Ursache.
function withCapability(status: CachedStatus): UpdateStatus {
  const capability = updateCapability();
  return { ...status, canSelfUpdate: capability.supported, selfUpdateReason: capability.reason };
}

async function fetchLatestRelease(): Promise<CachedStatus> {
  const base: CachedStatus = {
    configured: true,
    current: APP_VERSION,
    latest: null,
    updateAvailable: false,
    releaseUrl: null,
    publishedAt: null,
    checkFailed: false,
  };

  try {
    const res = await fetch(`${GITHUB_API_BASE}/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "komparsendrehplanung" },
      signal: AbortSignal.timeout(10_000),
    });
    // A repo with no releases yet answers 404 — that is a valid "nothing to
    // update to", not a failure worth surfacing.
    if (res.status === 404) return base;
    if (!res.ok) return { ...base, checkFailed: true };

    const release = (await res.json()) as {
      tag_name?: string;
      html_url?: string;
      published_at?: string;
      draft?: boolean;
      prerelease?: boolean;
    };
    if (!release.tag_name || release.draft || release.prerelease) return base;

    return {
      ...base,
      latest: release.tag_name,
      updateAvailable: compareVersions(release.tag_name, APP_VERSION) > 0,
      releaseUrl: release.html_url ?? null,
      publishedAt: release.published_at ?? null,
    };
  } catch (error) {
    // Logged rather than swallowed: on a self-hosted box this is the only clue
    // why the update banner never appears.
    console.warn("Update check failed:", error instanceof Error ? error.message : error);
    return { ...base, checkFailed: true };
  }
}

updatesRouter.get("/version", (_req, res) => {
  res.json({ version: APP_VERSION, repo: GITHUB_REPO || null });
});

updatesRouter.get("/update/status", async (_req, res) => {
  if (!GITHUB_REPO) {
    res.json(
      withCapability({
        configured: false,
        current: APP_VERSION,
        latest: null,
        updateAvailable: false,
        releaseUrl: null,
        publishedAt: null,
        checkFailed: false,
      }),
    );
    return;
  }

  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    res.json(withCapability(cached.status));
    return;
  }

  const status = await fetchLatestRelease();
  // A failed check is not cached, so a brief outage doesn't blind the app for
  // an hour; a successful one is.
  if (!status.checkFailed) cached = { at: Date.now(), status };
  res.json(withCapability(status));
});

updatesRouter.get("/update/progress", (_req, res) => {
  res.json(getUpdateProgress());
});

updatesRouter.post("/update/start", async (_req, res) => {
  try {
    // Bewusst abgewartet: Erst wenn Download, Prüfsumme und Austausch durch
    // sind, antwortet der Server — der Neustart hängt danach an einem Timer,
    // sodass diese Antwort den Client noch erreicht.
    await startUpdate();
    res.json(getUpdateProgress());
  } catch {
    // Der Grund steht bereits im Fortschritt, den der Client hier bekommt.
    res.status(409).json(getUpdateProgress());
  }
});
