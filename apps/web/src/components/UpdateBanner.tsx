import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api.js";

// Sits above the sticky app header in normal flow: at scroll 0 nothing is
// pinned yet, and once the banner scrolls away the header pins to the top as
// before — so this does not disturb the --app-header-height coupling that the
// sticky table head depends on.
export function UpdateBanner() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState<string | null>(null);

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
  if (!status?.configured || !status.updateAvailable || !status.latest) return null;
  // Dismissal is per version, so the next release speaks up again.
  if (dismissed === status.latest) return null;

  return (
    <div className="alert alert-info border-0 rounded-0 mb-0 py-2" role="status">
      <div className="container d-flex flex-wrap align-items-center gap-2">
        <span className="me-auto">
          {t("update.available", { version: status.latest, current: status.current })}
        </span>
        {status.releaseUrl && (
          <a
            className="btn btn-sm btn-primary"
            href={status.releaseUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            {t("update.action")}
          </a>
        )}
        <button
          type="button"
          className="btn btn-sm btn-link link-secondary"
          onClick={() => setDismissed(status.latest)}
        >
          {t("update.dismiss")}
        </button>
      </div>
    </div>
  );
}
