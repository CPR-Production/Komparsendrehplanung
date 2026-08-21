import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../api.js";

// Shares the query key with the Help page's version lookup, so both read the
// same answer and one request serves the whole session.
export function VersionBadge({ className = "" }: { className?: string }) {
  const { t } = useTranslation();

  const versionQuery = useQuery({
    queryKey: ["version"],
    queryFn: api.getVersion,
    // The running server cannot change its version under us: a self-update
    // ends with the banner reloading the page. Refetching on every focus would
    // ask a question that only a reload can answer differently.
    staleTime: Infinity,
    retry: false,
  });

  const version = versionQuery.data?.version;
  // Nothing until it arrives — a placeholder would only make the nav jump.
  if (!version) return null;

  return (
    <span
      className={`small text-body-secondary text-nowrap ${className}`.trim()}
      title={t("nav.version", { version })}
    >
      v{version}
    </span>
  );
}
