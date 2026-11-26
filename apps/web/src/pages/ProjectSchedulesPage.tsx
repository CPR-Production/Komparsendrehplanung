import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { LanguageSwitcher } from "../components/LanguageSwitcher.js";
import { VersionBadge } from "../components/VersionBadge.js";

/* Die Mappen eines Projekts. Ein Projekt hält mehrere Drehpläne — eine Fassung
   je Drehbuchstand, eine je Block —, und diese Seite ist die Ebene dazwischen:
   vom Projekt hierher, von hier in einen Plan.

   Als Mappen und nicht als Liste, weil die Projektübersicht es schon so macht;
   wer von dort kommt, sieht dasselbe Muster eine Stufe tiefer. Jede Seite baut
   ihre Kopfleiste selbst — die Seiten teilen sich keine. */
export function ProjectSchedulesPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [scriptRevision, setScriptRevision] = useState("");

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.getProject(projectId!),
    enabled: !!projectId,
  });
  const schedulesQuery = useQuery({
    queryKey: ["schedules", projectId],
    queryFn: () => api.listSchedules(projectId!),
    enabled: !!projectId,
  });

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ["schedules", projectId] });

  const createMutation = useMutation({
    mutationFn: () =>
      api.createSchedule(projectId!, {
        name: name.trim(),
        scriptRevision: scriptRevision.trim() || undefined,
      }),
    onSuccess: () => {
      setName("");
      setScriptRevision("");
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; scriptRevision?: string }) =>
      api.updateSchedule(id, data),
    onSuccess: invalidate,
  });

  const duplicateMutation = useMutation({
    mutationFn: (schedule: { id: string; name: string }) =>
      api.duplicateSchedule(schedule.id, { name: t("schedule.copyName", { name: schedule.name }) }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSchedule(id),
    onSuccess: invalidate,
  });

  if (!projectId) return null;

  const schedules = schedulesQuery.data ?? [];

  return (
    <main className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <h1 className="h3 mb-0">{projectQuery.data?.name}</h1>
        <div className="d-flex align-items-center gap-2">
          <VersionBadge />
          <LanguageSwitcher />
          <Link
            to={`/projects/${projectId}/settings`}
            className="btn btn-sm btn-outline-secondary"
            title={t("nav.settings")}
            aria-label={t("nav.settings")}
          >
            ⚙
          </Link>
          <Link to="/help" className="btn btn-sm btn-outline-secondary" title={t("nav.help")}>
            ?
          </Link>
        </div>
      </div>
      <Link to="/" className="small text-decoration-none d-inline-block mb-4">
        ← {t("nav.backToProjects")}
      </Link>

      <h2 className="h5">{t("schedule.list.title")}</h2>
      <p className="text-body-secondary">{t("schedule.list.intro")}</p>

      <form
        className="row g-2 align-items-center mb-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) createMutation.mutate();
        }}
      >
        <div className="col-12 col-sm">
          <input
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("schedule.create.namePlaceholder")}
            aria-label={t("schedule.name")}
          />
        </div>
        <div className="col-12 col-sm">
          <input
            className="form-control"
            value={scriptRevision}
            onChange={(e) => setScriptRevision(e.target.value)}
            placeholder={t("schedule.create.revisionPlaceholder")}
            aria-label={t("schedule.scriptRevision")}
          />
        </div>
        <div className="col-12 col-sm-auto">
          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={createMutation.isPending}
          >
            {t("schedule.create.submit")}
          </button>
        </div>
      </form>

      {schedulesQuery.isLoading && (
        <p className="text-body-secondary">{t("project.list.loading")}</p>
      )}
      {schedulesQuery.isError && (
        <div className="alert alert-danger">{t("schedule.list.error")}</div>
      )}
      {schedulesQuery.data?.length === 0 && (
        <div className="alert alert-light border">{t("schedule.list.empty")}</div>
      )}

      <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
        {schedules.map((schedule) => (
          <div className="col" key={schedule.id}>
            {/* Die Mappe öffnet den Plan; Name und Drehbuchstand lassen sich
                aber hier bearbeiten. Deshalb ist nicht die ganze Karte der
                Link — sonst finge jeder Klick ins Namensfeld die Navigation
                ein. Das unterscheidet sie von den Projektkacheln, die nichts
                Schreibbares tragen. */}
            <div className="schedule-card card h-100">
              <Link
                to={`/projects/${projectId}/schedules/${schedule.id}`}
                className="schedule-card-open text-decoration-none"
                aria-label={t("schedule.open", { name: schedule.name })}
              >
                <span className="schedule-card-folder" aria-hidden="true">
                  📁
                </span>
                <span className="schedule-card-open-label">{t("schedule.open.short")}</span>
              </Link>
              <div className="card-body">
                <label className="form-label small text-body-secondary mb-1">
                  {t("schedule.name")}
                  <input
                    className="form-control form-control-sm"
                    defaultValue={schedule.name}
                    onBlur={(e) => {
                      const next = e.target.value.trim();
                      if (next && next !== schedule.name) {
                        updateMutation.mutate({ id: schedule.id, name: next });
                      }
                    }}
                  />
                </label>
                <label className="form-label small text-body-secondary mb-1">
                  {t("schedule.scriptRevision")}
                  <input
                    className="form-control form-control-sm"
                    defaultValue={schedule.scriptRevision ?? ""}
                    placeholder={t("schedule.create.revisionPlaceholder")}
                    onBlur={(e) => {
                      const next = e.target.value.trim();
                      if (next !== (schedule.scriptRevision ?? "")) {
                        updateMutation.mutate({ id: schedule.id, scriptRevision: next });
                      }
                    }}
                  />
                </label>
                <div className="d-flex justify-content-end align-items-center gap-2">
                  {/* Neben dem Löschen, weil beide dasselbe Ziel haben: diesen
                      Plan als Ganzes. Mit Beschriftung statt als Zeichen — ein
                      Symbol fürs Duplizieren liest niemand zuverlässig, und
                      anders als beim × gibt es dafür keine eingeführte Form. */}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    title={t("schedule.duplicate")}
                    disabled={duplicateMutation.isPending}
                    onClick={() =>
                      duplicateMutation.mutate({ id: schedule.id, name: schedule.name })
                    }
                  >
                    {t("schedule.duplicate.short")}
                  </button>
                  <button
                    type="button"
                    className="row-delete"
                    title={t("schedule.delete")}
                    onClick={() => {
                      // Löschen nimmt den ganzen Plan mit, bis in die
                      // eingetragenen Zahlen — wie bei den Kategorien steht
                      // deshalb eine Rückfrage davor, die die Folge benennt.
                      if (window.confirm(t("schedule.confirmDelete", { name: schedule.name }))) {
                        deleteMutation.mutate(schedule.id);
                      }
                    }}
                  >
                    &times;
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
