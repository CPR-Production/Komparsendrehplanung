import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CSSProperties, HTMLAttributes, TdHTMLAttributes } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { api, type ShootSet } from "../api.js";
import { LanguageSwitcher } from "../components/LanguageSwitcher.js";
import { moveBefore, SET_DRAG_TYPE } from "../dragReorder.js";
import { SCENE_LOCATIONS_DATALIST_ID } from "../grid/ScheduleTable.js";
import { ScheduleTableHead } from "../grid/ScheduleTableHead.js";
import { SetSection } from "./SetSection.js";

const APP_HEADER_HEIGHT = 56;

export function ProjectSchedulePage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.getProject(projectId!),
    enabled: !!projectId,
  });
  const setsQuery = useQuery({
    queryKey: ["sets", projectId],
    queryFn: () => api.listSets(projectId!),
    enabled: !!projectId,
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories", projectId],
    queryFn: () => api.listCategories(projectId!),
    enabled: !!projectId,
  });
  const sceneLocationsQuery = useQuery({
    queryKey: ["sceneLocations", projectId],
    queryFn: () => api.listProjectSceneLocations(projectId!),
    enabled: !!projectId,
  });

  const createSetMutation = useMutation({
    mutationFn: () => api.createSet(projectId!, {}),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["sets", projectId] }),
  });

  const reorderSetsMutation = useMutation({
    mutationFn: (ids: string[]) => api.reorderSets(projectId!, ids),
  });

  const moveSet = (draggedId: string, targetId: string) => {
    const current = setsQuery.data;
    if (!current) return;
    const ids = current.map((s) => s.id);
    const nextIds = moveBefore(ids, draggedId, targetId);
    if (nextIds === ids) return;
    queryClient.setQueryData<ShootSet[]>(["sets", projectId], () =>
      nextIds.map((id) => current.find((s) => s.id === id)!),
    );
    reorderSetsMutation.mutate(nextIds);
  };
  // Mirrors the Scene drag wiring in SetSection: the handle starts the drag, the
  // Set header cell accepts the drop, and the id travels in dataTransfer.
  const getSetDragHandleProps = (setId: string): HTMLAttributes<HTMLSpanElement> => ({
    draggable: true,
    onDragStart: (e) => {
      e.dataTransfer.setData(SET_DRAG_TYPE, setId);
      e.dataTransfer.effectAllowed = "move";
    },
  });

  const getSetDropProps = (setId: string): TdHTMLAttributes<HTMLTableCellElement> => ({
    onDragOver: (e) => {
      if (!e.dataTransfer.types.includes(SET_DRAG_TYPE)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },
    onDrop: (e) => {
      const draggedId = e.dataTransfer.getData(SET_DRAG_TYPE);
      if (!draggedId) return;
      e.preventDefault();
      moveSet(draggedId, setId);
    },
  });

  if (!projectId) return null;

  return (
    <main
      style={
        {
          fontFamily: "sans-serif",
          "--app-header-height": `${APP_HEADER_HEIGHT}px`,
        } as CSSProperties
      }
    >
      {/* Height and stickiness stay inline: the sticky table head offsets itself
          by --app-header-height, so the two have to agree on one number. */}
      <header
        className="d-flex justify-content-between align-items-center px-3 border-bottom bg-white"
        style={{ height: APP_HEADER_HEIGHT, position: "sticky", top: 0, zIndex: 3 }}
      >
        <Link to="/" className="h5 mb-0 link-dark text-decoration-none">
          {projectQuery.data?.name}
        </Link>
        <div className="d-flex align-items-center gap-2">
          <LanguageSwitcher />
          <button
            type="button"
            className="btn btn-sm btn-outline-dark"
            onClick={() => createSetMutation.mutate()}
          >
            {t("nav.addSet")}
          </button>
          <Link
            to={`/projects/${projectId}/settings`}
            className="btn btn-sm btn-outline-secondary"
            title={t("nav.settings")}
            aria-label={t("nav.settings")}
          >
            ⚙
          </Link>
        </div>
      </header>

      <datalist id={SCENE_LOCATIONS_DATALIST_ID}>
        {sceneLocationsQuery.data?.map((location) => <option key={location} value={location} />)}
      </datalist>

      <div style={{ padding: "0 1rem" }}>
        <table
          className="schedule-table table table-bordered table-sm mb-4"
          style={{ tableLayout: "fixed" }}
        >
          <ScheduleTableHead categories={categoriesQuery.data ?? []} />
          {setsQuery.data?.map((set) => (
            <SetSection
              key={set.id}
              projectId={projectId}
              setId={set.id}
              categories={categoriesQuery.data ?? []}
              setDragHandleProps={getSetDragHandleProps(set.id)}
              setDropProps={getSetDropProps(set.id)}
            />
          ))}
        </table>
      </div>
    </main>
  );
}
