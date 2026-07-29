import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CSSProperties, HTMLAttributes } from "react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type ShootSet } from "../api.js";
import { moveBefore } from "../dragReorder.js";
import { SCENE_LOCATIONS_DATALIST_ID } from "../grid/ScheduleTable.js";
import { ScheduleTableHead } from "../grid/ScheduleTableHead.js";
import { SetSection } from "./SetSection.js";

const APP_HEADER_HEIGHT = 56;

export function ProjectSchedulePage() {
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

  const [draggedSetId, setDraggedSetId] = useState<string | null>(null);
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
  const getSetDragHandleProps = (setId: string): HTMLAttributes<HTMLSpanElement> => ({
    draggable: true,
    onDragStart: () => setDraggedSetId(setId),
    onDragOver: (e) => e.preventDefault(),
    onDrop: (e) => {
      e.preventDefault();
      if (draggedSetId) moveSet(draggedSetId, setId);
      setDraggedSetId(null);
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
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: APP_HEADER_HEIGHT,
          padding: "0 1rem",
          borderBottom: "1px solid #ccc",
          position: "sticky",
          top: 0,
          background: "white",
          zIndex: 3,
        }}
      >
        <Link to="/" style={{ fontSize: "1.25rem", fontWeight: "bold", color: "inherit" }}>
          {projectQuery.data?.name}
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button type="button" onClick={() => createSetMutation.mutate()}>
            + Set
          </button>
          <Link
            to={`/projects/${projectId}/settings`}
            title="Einstellungen"
            style={{ fontSize: "1.25rem", textDecoration: "none" }}
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
            />
          ))}
        </table>
      </div>
    </main>
  );
}
