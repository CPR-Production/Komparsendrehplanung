import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { api, type Project } from "../api.js";
import { LanguageSwitcher } from "../components/LanguageSwitcher.js";
import { VersionBadge } from "../components/VersionBadge.js";

// Up to two initials stand in for cover artwork. Spread rather than charAt so a
// name starting with an emoji or a surrogate pair doesn't get cut in half.
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words
    .slice(0, 2)
    .map((word) => [...word][0]!.toUpperCase())
    .join("");
}

// Deterministic hue per project id, so a project keeps the same tile colour
// across reloads and machines without storing anything.
function hueFromId(id: string): number {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}

// SQLite's current_timestamp is UTC and space-separated ("2026-07-28 20:03:44"),
// which Date only parses by browser-specific extension — normalise to ISO first.
function parseTimestamp(value: string): Date {
  return new Date(`${value.replace(" ", "T")}Z`);
}

// Timestamps sort correctly as plain strings in this format, so newest-first
// needs no Date parsing and no fallback for a malformed value.
function newestFirst(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function ProjectListPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: api.listProjects });
  const createMutation = useMutation({
    mutationFn: api.createProject,
    onSuccess: () => {
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const dateFormat = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
    dateStyle: "medium",
  });
  const projects = projectsQuery.data ? newestFirst(projectsQuery.data) : [];

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">{t("project.list.title")}</h1>
        <div className="d-flex align-items-center gap-2">
          <VersionBadge />
          <LanguageSwitcher />
          <Link to="/help" className="btn btn-sm btn-outline-secondary">
            {t("nav.help")}
          </Link>
        </div>
      </div>

      <form
        className="row g-2 align-items-center mb-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) createMutation.mutate(name.trim());
        }}
      >
        <div className="col-12 col-sm">
          <input
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("project.create.namePlaceholder")}
          />
        </div>
        <div className="col-12 col-sm-auto">
          <button type="submit" className="btn btn-primary w-100" disabled={createMutation.isPending}>
            {t("project.create.submit")}
          </button>
        </div>
      </form>

      {projectsQuery.isLoading && <p className="text-body-secondary">{t("project.list.loading")}</p>}
      {projectsQuery.isError && <div className="alert alert-danger">{t("project.list.error")}</div>}
      {projectsQuery.data?.length === 0 && (
        <div className="alert alert-light border">{t("project.list.empty")}</div>
      )}

      {/* Two tiles on phones, three from md, four once there is room for them. */}
      <div className="row row-cols-2 row-cols-md-3 row-cols-xl-4 g-3">
        {projects.map((project) => {
          const hue = hueFromId(project.id);
          return (
            <div className="col" key={project.id}>
              <Link
                to={`/projects/${project.id}`}
                className="project-card card h-100 text-decoration-none"
              >
                <div
                  className="project-card-icon"
                  style={{
                    background: `linear-gradient(135deg, hsl(${hue} 58% 52%), hsl(${(hue + 28) % 360} 62% 38%))`,
                  }}
                  aria-hidden="true"
                >
                  <span className="project-card-initials">{initials(project.name)}</span>
                </div>
                <div className="card-body">
                  <h2 className="project-card-name h6 mb-1">{project.name}</h2>
                  {project.code && <div className="small text-body-secondary">{project.code}</div>}
                  <div className="small text-body-secondary">
                    {t("project.list.created", {
                      date: dateFormat.format(parseTimestamp(project.createdAt)),
                    })}
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </main>
  );
}
