import { isDarkColor } from "@komparsen/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CSSProperties, HTMLAttributes, TdHTMLAttributes } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { api, type ShootSet } from "../api.js";
import { EditLockToggle } from "../components/EditLockToggle.js";
import { LanguageSwitcher } from "../components/LanguageSwitcher.js";
import { StripSizeSelect } from "../components/StripSizeSelect.js";
import { VersionBadge } from "../components/VersionBadge.js";
import { moveBefore, SET_DRAG_TYPE } from "../dragReorder.js";
import { useEditLock } from "../editLock.js";
import { SCENE_LOCATIONS_DATALIST_ID } from "../grid/ScheduleTable.js";
import { ScheduleTableHead } from "../grid/ScheduleTableHead.js";
import { useStripSize } from "../stripSize.js";
import { SetSection } from "./SetSection.js";

const APP_HEADER_HEIGHT = 56;

export function ProjectSchedulePage() {
  const { t } = useTranslation();
  const { projectId, scheduleId } = useParams<{ projectId: string; scheduleId: string }>();
  const queryClient = useQueryClient();
  const { locked } = useEditLock();
  const { stripSize } = useStripSize();

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.getProject(projectId!),
    enabled: !!projectId,
  });
  const scheduleQuery = useQuery({
    queryKey: ["schedule", scheduleId],
    queryFn: () => api.getSchedule(scheduleId!),
    enabled: !!scheduleId,
  });
  // Die Sets hängen am Drehplan, nicht mehr am Projekt — der Schlüssel folgt
  // dem, damit zwei Pläne desselben Projekts sich keinen Cache teilen.
  const setsQuery = useQuery({
    queryKey: ["sets", scheduleId],
    queryFn: () => api.listSets(scheduleId!),
    enabled: !!scheduleId,
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories", projectId],
    queryFn: () => api.listCategories(projectId!),
    enabled: !!projectId,
  });
  const colorsQuery = useQuery({
    queryKey: ["colorSettings", projectId],
    queryFn: () => api.listColorSettings(projectId!),
    enabled: !!projectId,
  });
  const sceneLocationsQuery = useQuery({
    queryKey: ["sceneLocations", projectId],
    queryFn: () => api.listProjectSceneLocations(projectId!),
    enabled: !!projectId,
  });

  /* The four frame colours ride on the table as inherited custom properties:
     the header row, every Set header, every Role row and every count cell pick
     them up without a prop apiece. Per-Scene colours cannot work that way —
     they differ from row to row — and stay on their own cells. */
  const colorByKey = new Map((colorsQuery.data ?? []).map((color) => [color.key, color]));
  const frameVars: Record<string, string> = {};
  const frameClasses: string[] = [];
  for (const key of ["header", "set", "role", "count", "change"]) {
    const color = colorByKey.get(key);
    if (!color) continue;
    frameVars[`--${key}-bg`] = color.backgroundColor;
    frameVars[`--${key}-text`] = color.textColor;
    // Same reasoning as a Scene's has-dark-state: the controls in those cells
    // carry fixed colours that a dark background swallows. The Set header, the
    // Role rows and the Rollenwechsel row each hold a red × — the header row
    // holds nothing, and a count cell's only control paints its own
    // background — so only those three get a class.
    if (
      (key === "set" || key === "role" || key === "change") &&
      isDarkColor(color.backgroundColor)
    ) {
      frameClasses.push(`has-dark-${key}`);
    }
  }

  /* Anlegen und danach einsortieren — denselben Weg geht `addSceneAfter` für
     Szenen. Der Server hängt einen neuen Tagteiler immer hinten an; wohin er
     gehört, weiß nur die Liste hier, und die kennt der Server nicht.

     `afterSetId` null heißt „ans Ende": so ruft der Knopf in der Kopfleiste
     auf, der keinen Platz meint, sondern einen weiteren Drehtag. */
  const createSetMutation = useMutation({
    mutationFn: async (afterSetId: string | null) => {
      const created = await api.createSet(scheduleId!, {});
      const ids = (setsQuery.data ?? []).map((set) => set.id);
      const index = afterSetId ? ids.indexOf(afterSetId) + 1 : ids.length;
      // Hinter einen Tagteiler, den die Liste nicht kennt, kann nichts — dann
      // bleibt es beim Anhängen, statt den Neuen an Position 0 zu setzen.
      if (afterSetId && index > 0) {
        await api.reorderSets(scheduleId!, [
          ...ids.slice(0, index),
          created.id,
          ...ids.slice(index),
        ]);
      }
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["sets", scheduleId] }),
  });

  const deleteSetMutation = useMutation({
    mutationFn: (setId: string) => api.deleteSet(setId),
    // Die Liste lebt hier, deshalb auch das Nachladen: das Set entfernt sich
    // nicht selbst aus einer Liste, die es nicht kennt.
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["sets", scheduleId] }),
  });

  const reorderSetsMutation = useMutation({
    mutationFn: (ids: string[]) => api.reorderSets(scheduleId!, ids),
  });

  const moveSet = (draggedId: string, targetId: string) => {
    const current = setsQuery.data;
    if (!current) return;
    const ids = current.map((s) => s.id);
    const nextIds = moveBefore(ids, draggedId, targetId);
    if (nextIds === ids) return;
    queryClient.setQueryData<ShootSet[]>(["sets", scheduleId], () =>
      nextIds.map((id) => current.find((s) => s.id === id)!),
    );
    reorderSetsMutation.mutate(nextIds);
  };
  // Mirrors the Scene drag wiring in SetSection: the handle starts the drag, the
  // Set header cell accepts the drop, and the id travels in dataTransfer.
  const getSetDragHandleProps = (setId: string): HTMLAttributes<HTMLSpanElement> => ({
    // A drag has no `disabled`; taking the attribute away is the whole of it.
    // The drop targets can stay as they are — nothing can be dragged onto them.
    draggable: !locked,
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

  if (!projectId || !scheduleId) return null;

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
        {/* Der Weg zurück führt jetzt zu den Mappen des Projekts, nicht zur
            Projektliste — eine Stufe, nicht zwei. Welcher Plan offen ist, muss
            dabeistehen: zwei Fassungen desselben Projekts sehen sonst gleich
            aus. Der Drehbuchstand ist der Grund, aus dem es zwei gibt. */}
        <div className="d-flex align-items-baseline gap-2 text-truncate">
          <Link
            to={`/projects/${projectId}`}
            className="h5 mb-0 link-dark text-decoration-none text-truncate"
          >
            {projectQuery.data?.name}
          </Link>
          <span className="text-body-secondary">/</span>
          <span className="fw-semibold text-truncate">{scheduleQuery.data?.name}</span>
          {scheduleQuery.data?.scriptRevision && (
            <span className="badge text-bg-light text-nowrap">
              {scheduleQuery.data.scriptRevision}
            </span>
          )}
        </div>
        <div className="d-flex align-items-center gap-2">
          <VersionBadge />
          <StripSizeSelect />
          <LanguageSwitcher />
          <EditLockToggle />
          <button
            type="button"
            className="btn btn-sm btn-outline-dark"
            disabled={locked}
            onClick={() => createSetMutation.mutate(null)}
          >
            {t("nav.addSet")}
          </button>
          <Link to="/help" className="btn btn-sm btn-outline-secondary" title={t("nav.help")}>
            ?
          </Link>
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
          /* The strip size rides on the table, not on <main>: it scales the
             plan's own type and cell padding, and the sticky offset of the
             second header row is derived from the same class. */
          className={[
            "schedule-table table table-bordered table-sm mb-4",
            `strip-size-${stripSize}`,
            locked ? "is-locked" : "",
            ...frameClasses,
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ tableLayout: "fixed", ...frameVars } as CSSProperties}
        >
          <ScheduleTableHead categories={categoriesQuery.data ?? []} />
          {setsQuery.data?.map((set) => (
            <SetSection
              key={set.id}
              projectId={projectId}
              scheduleId={scheduleId}
              setId={set.id}
              categories={categoriesQuery.data ?? []}
              colors={colorsQuery.data ?? []}
              setDragHandleProps={getSetDragHandleProps(set.id)}
              setDropProps={getSetDropProps(set.id)}
              onRemoveSet={() => deleteSetMutation.mutate(set.id)}
              onAddSetAfter={() => createSetMutation.mutate(set.id)}
            />
          ))}
        </table>
      </div>
    </main>
  );
}
