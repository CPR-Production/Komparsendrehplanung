import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type UpdateProgress } from "../api.js";

// Sits above the sticky app header in normal flow: at scroll 0 nothing is
// pinned yet, and once the banner scrolls away the header pins to the top as
// before — so this does not disturb the --app-header-height coupling that the
// sticky table head depends on.
export function UpdateBanner() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);

  const statusQuery = useQuery({
    queryKey: ["updateStatus"],
    queryFn: api.getUpdateStatus,
    // The server caches the GitHub call for an hour; this just avoids refiring
    // on every window focus.
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const status = statusQuery.data;
  const target = status?.latest?.replace(/^v/, "") ?? null;

  const startUpdate = useMutation({
    mutationFn: api.startUpdate,
    onMutate: () => setProgress({ phase: "downloading", version: null, error: null }),
    onSuccess: setProgress,
    onError: async () => {
      // Die Anfrage selbst kennt nur den Statuscode — den Grund führt der
      // Server im Fortschritt mit.
      try {
        setProgress(await api.getUpdateProgress());
      } catch {
        setProgress({ phase: "failed", version: null, error: null });
      }
    },
  });

  const phase = progress?.phase;

  // Der Server tauscht sich gerade selbst aus und ist für ein paar Sekunden
  // nicht erreichbar. Sobald er sich mit der neuen Version meldet, lädt die
  // Seite neu — sonst liefe im Browser weiter das alte Frontend.
  useEffect(() => {
    if (phase !== "restarting" || !target) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const info = await api.getVersion();
        if (!cancelled && info.version === target) window.location.reload();
      } catch {
        // Noch unterwegs — weiter warten.
      }
    }, 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [phase, target]);

  if (!status?.configured || !status.updateAvailable || !status.latest) return null;
  // Dismissal is per version, so the next release speaks up again.
  if (dismissed === status.latest && !phase) return null;

  const busy = phase === "downloading" || phase === "verifying" || phase === "installing";
  const running = busy || phase === "restarting";
  const failed = phase === "failed";

  return (
    <div
      className={`alert ${failed ? "alert-warning" : "alert-info"} border-0 rounded-0 mb-0 py-2`}
      role="status"
    >
      <div className="container d-flex flex-wrap align-items-center gap-2">
        <span className="me-auto">
          {running && (
            <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
          )}
          {running
            ? t(`update.phase.${phase}`)
            : failed
              ? t("update.failed", { error: progress?.error ?? t("update.failedUnknown") })
              : t("update.available", { version: status.latest, current: status.current })}
        </span>

        {status.canSelfUpdate && !running && (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => startUpdate.mutate()}
          >
            {failed ? t("update.retry") : t("update.start")}
          </button>
        )}

        {status.selfUpdateReason === "container" && !running && (
          <span className="small text-body-secondary">{t("update.hintContainer")}</span>
        )}

        {status.releaseUrl && !running && (
          <a
            className={`btn btn-sm ${status.canSelfUpdate ? "btn-outline-secondary" : "btn-primary"}`}
            href={status.releaseUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            {t("update.action")}
          </a>
        )}

        {!running && (
          <button
            type="button"
            className="btn btn-sm btn-link link-secondary"
            onClick={() => setDismissed(status.latest)}
          >
            {t("update.dismiss")}
          </button>
        )}
      </div>
    </div>
  );
}
