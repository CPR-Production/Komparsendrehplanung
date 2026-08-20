import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { LanguageSwitcher } from "../components/LanguageSwitcher.js";

const FEEDBACK_KINDS = [
  { value: "bug", label: "help.kind.bug", githubLabel: "bug" },
  { value: "idea", label: "help.kind.idea", githubLabel: "enhancement" },
  { value: "question", label: "help.kind.question", githubLabel: "question" },
];

export function HelpPage() {
  const { t } = useTranslation();
  const [kind, setKind] = useState("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const versionQuery = useQuery({ queryKey: ["version"], queryFn: api.getVersion });
  const repo = versionQuery.data?.repo ?? null;
  const version = versionQuery.data?.version ?? "?";

  // Attached verbatim so the reporter can see exactly what travels with the
  // issue before it goes anywhere — the issue itself is public.
  const diagnostics = [`App-Version: ${version}`, `Browser: ${navigator.userAgent}`].join("\n");

  const body = `${description}\n\n---\n${diagnostics}`;
  const selected = FEEDBACK_KINDS.find((k) => k.value === kind)!;
  const issueUrl = repo
    ? `https://github.com/${repo}/issues/new?${new URLSearchParams({
        title,
        body,
        labels: selected.githubLabel,
      }).toString()}`
    : null;

  return (
    <main className="container py-4" style={{ maxWidth: 760 }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Link to="/">&larr; {t("nav.backToProjects")}</Link>
        <LanguageSwitcher />
      </div>
      <h1 className="h3 mb-4">{t("help.title")}</h1>

      {!repo && <div className="alert alert-warning">{t("help.noRepo")}</div>}

      {repo && (
        <>
          <p className="text-body-secondary">{t("help.intro")}</p>

          <div className="card mb-3">
            <div className="card-body d-flex flex-column gap-3">
              <div>
                <label className="form-label" htmlFor="feedback-kind">
                  {t("help.kindLabel")}
                </label>
                <select
                  id="feedback-kind"
                  className="form-select"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                >
                  {FEEDBACK_KINDS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.label)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" htmlFor="feedback-title">
                  {t("help.titleLabel")}
                </label>
                <input
                  id="feedback-title"
                  className="form-control"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("help.titlePlaceholder")}
                />
              </div>

              <div>
                <label className="form-label" htmlFor="feedback-description">
                  {t("help.descriptionLabel")}
                </label>
                <textarea
                  id="feedback-description"
                  className="form-control"
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("help.descriptionPlaceholder")}
                />
              </div>

              <div>
                <div className="form-label">{t("help.attachedLabel")}</div>
                <pre className="bg-body-secondary rounded p-2 mb-1 small text-wrap">{diagnostics}</pre>
                <div className="form-text">{t("help.attachedHint")}</div>
              </div>
            </div>
            <div className="card-footer d-flex flex-wrap gap-2 align-items-center">
              <a
                className={`btn btn-primary${title.trim() ? "" : " disabled"}`}
                href={issueUrl ?? "#"}
                target="_blank"
                rel="noreferrer noopener"
                aria-disabled={!title.trim()}
              >
                {t("help.submit")}
              </a>
              <span className="form-text mb-0">{t("help.submitHint")}</span>
            </div>
          </div>

          <a
            href={`https://github.com/${repo}/issues`}
            target="_blank"
            rel="noreferrer noopener"
          >
            {t("help.browseIssues")}
          </a>
        </>
      )}

      <p className="text-body-secondary small mt-4 mb-0">{t("help.version", { version })}</p>
    </main>
  );
}
