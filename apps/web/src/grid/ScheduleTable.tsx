import { calcSceneTotal } from "@komparsen/shared";
import { Fragment, type HTMLAttributes, type TdHTMLAttributes } from "react";
import type { Category, ChangeRow, RoleRow, SceneRow, SetLocation, ShootSet } from "../api.js";
import { groupCategories, SCENE_NUMBER_COLUMN_WIDTH, totalColumnCount } from "./scheduleLayout.js";

export const SCENE_LOCATIONS_DATALIST_ID = "scene-locations";

interface ScheduleTableProps {
  set: ShootSet;
  locations: SetLocation[];
  scenes: SceneRow[];
  changes: ChangeRow[];
  categories: Category[];
  totalShoots: number;
  setDragHandleProps: HTMLAttributes<HTMLSpanElement>;
  setDropProps: TdHTMLAttributes<HTMLTableCellElement>;
  getSceneDragHandleProps: (sceneId: string) => HTMLAttributes<HTMLSpanElement>;
  getSceneDropProps: (sceneId: string) => TdHTMLAttributes<HTMLTableCellElement>;
  draggedSceneId: string | null;
  onSetFieldChange: (field: keyof ShootSet, value: string) => void;
  onLocationFieldChange: (locationId: string, field: "name" | "address", value: string) => void;
  onAddLocation: () => void;
  onRemoveLocation: (locationId: string) => void;
  onAddSceneAfter: (sceneId: string | null) => void;
  onCountChange: (roleId: string, categoryId: string, count: number) => void;
  onToggleIsNew: (roleId: string, categoryId: string) => void;
  onRoleNameChange: (roleId: string, name: string) => void;
  onFuzzleIdChange: (roleId: string, fuzzleId: string) => void;
  onSceneFieldChange: (sceneId: string, field: keyof SceneRow, value: string) => void;
  onAddRole: (sceneId: string) => void;
  onRemoveRole: (roleId: string) => void;
  onRemoveScene: (sceneId: string) => void;
  onAddChange: (sceneId: string) => void;
  onChangeDescriptionChange: (changeId: string, description: string) => void;
  onRemoveChange: (changeId: string) => void;
}

const INT_EXT_OPTIONS = [
  { value: "intern", label: "Intern" },
  { value: "extern", label: "Extern" },
];
const DAY_NIGHT_OPTIONS = [
  { value: "tag", label: "Tag" },
  { value: "nacht", label: "Nacht" },
];

function RadioGroup({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="btn-group btn-group-sm" role="group">
      {options.map((option) => (
        <Fragment key={option.value}>
          <input
            type="radio"
            className="btn-check"
            autoComplete="off"
            name={name}
            id={`${name}-${option.value}`}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <label className="btn btn-outline-dark" htmlFor={`${name}-${option.value}`}>
            {option.label}
          </label>
        </Fragment>
      ))}
    </div>
  );
}

function sceneTotal(scene: SceneRow): number {
  return calcSceneTotal({
    id: scene.id,
    roles: scene.roles.map((r) => ({
      id: r.id,
      counts: r.counts.map((c) => ({ categoryId: c.categoryId, count: c.count, isNew: c.isNew })),
    })),
  });
}

function roleTotal(role: RoleRow): number {
  return role.counts.reduce((sum, c) => sum + c.count, 0);
}

function distinctSceneLocations(scenes: SceneRow[]): string[] {
  const values = scenes.map((s) => s.location?.trim()).filter((v): v is string => !!v);
  return [...new Set(values)];
}

export function ScheduleTable({
  set,
  locations,
  scenes,
  changes,
  categories,
  totalShoots,
  setDragHandleProps,
  setDropProps,
  getSceneDragHandleProps,
  getSceneDropProps,
  draggedSceneId,
  onSetFieldChange,
  onLocationFieldChange,
  onAddLocation,
  onRemoveLocation,
  onAddSceneAfter,
  onCountChange,
  onToggleIsNew,
  onRoleNameChange,
  onFuzzleIdChange,
  onSceneFieldChange,
  onAddRole,
  onRemoveRole,
  onRemoveScene,
  onAddChange,
  onChangeDescriptionChange,
  onRemoveChange,
}: ScheduleTableProps) {
  const groups = groupCategories(categories);
  const totalColumns = totalColumnCount(categories);
  const sceneLocations = distinctSceneLocations(scenes);

  // Drehzeit is derived, not entered directly on the Set: "Von" comes from the
  // first Scene's Script Time, "Bis" from the last Scene's own end time (the
  // scenes in between don't need one — they can be inferred from the schedule).
  const firstShootTime = scenes[0]?.scriptTime;
  const lastScene = scenes[scenes.length - 1];
  const lastShootTime = lastScene?.endTime || lastScene?.scriptTime;

  return (
    <tbody>
      <tr>
        <td colSpan={totalColumns} className="cell-set" {...setDropProps}>
          <div className="d-flex flex-wrap gap-3 align-items-end mb-2">
            <span className="drag-handle" title="Set verschieben" {...setDragHandleProps}>
              ⠿
            </span>
            <label className="mb-0">
              SD
              <input
                className="form-control form-control-sm"
                style={{ width: SCENE_NUMBER_COLUMN_WIDTH }}
                value={set.sdNumber ?? ""}
                onChange={(e) => onSetFieldChange("sdNumber", e.target.value)}
              />
            </label>
            <input
              type="date"
              aria-label="Drehdatum"
              className="form-control form-control-sm set-date-input"
              value={set.shootDate ?? ""}
              onChange={(e) => onSetFieldChange("shootDate", e.target.value)}
            />
            <div>
              <strong>
                {firstShootTime || "?"} &ndash; {lastShootTime || "?"}
              </strong>
              <div className="form-text mb-0">aus erster/letzter Szene</div>
            </div>
            {sceneLocations.length > 0 && (
              <div>
                <strong>{sceneLocations.join(" · ")}</strong>
                <div className="form-text mb-0">Locations aus Szenen</div>
              </div>
            )}
            <strong className="ms-auto">Total Shoots: {totalShoots}</strong>
          </div>

          {locations.map((location, i) => (
            <div key={location.id} className="d-flex gap-2 mb-1">
              <input
                className="form-control form-control-sm"
                style={{ maxWidth: 200 }}
                placeholder={`Set-Name ${i + 1}`}
                value={location.name ?? ""}
                onChange={(e) => onLocationFieldChange(location.id, "name", e.target.value)}
              />
              <input
                className="form-control form-control-sm"
                placeholder="Adresse"
                value={location.address ?? ""}
                onChange={(e) => onLocationFieldChange(location.id, "address", e.target.value)}
              />
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => onRemoveLocation(location.id)}
              >
                &times;
              </button>
            </div>
          ))}
          {locations.length < 3 && (
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onAddLocation}>
              + Set-Name
            </button>
          )}
        </td>
      </tr>

      {scenes.length === 0 && (
        <tr>
          <td colSpan={totalColumns} className="text-center">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => onAddSceneAfter(null)}>
              + Szene
            </button>
          </td>
        </tr>
      )}

      {scenes.map((scene, sceneIndex) => {
        const roleCount = scene.roles.length;
        const sceneRowSpan = roleCount + 1; // +1 for the trailing "+ Rolle" row
        const total = sceneTotal(scene);
        const isLastScene = sceneIndex === scenes.length - 1;
        const sceneChanges = changes.filter((c) => c.anchorAfterSceneId === scene.id);
        // Every rowSpan'd Scene cell accepts the drop, so the drop zone is the
        // whole Scene block rather than just the drag handle glyph.
        const dropProps = getSceneDropProps(scene.id);
        const sceneCellClass = `cell-scene${draggedSceneId === scene.id ? " is-dragging" : ""}`;

        return (
          <Fragment key={scene.id}>
            <tr>
              <td
                colSpan={totalColumns}
                className={`${sceneCellClass} cell-synopsis`}
                {...dropProps}
              >
                <span className="cell-synopsis-label">Synopsis</span>
                <input
                  value={scene.synopsis ?? ""}
                  onChange={(e) => onSceneFieldChange(scene.id, "synopsis", e.target.value)}
                />
              </td>
            </tr>

            {Array.from({ length: sceneRowSpan }).map((_, rowIndex) => {
              const role = rowIndex < roleCount ? scene.roles[rowIndex] : undefined;
              const isAddRoleRow = rowIndex === roleCount;
              return (
                <tr key={role?.id ?? `${scene.id}-row-${rowIndex}`}>
                  {rowIndex === 0 && (
                    <>
                      <td rowSpan={sceneRowSpan} className={sceneCellClass} {...dropProps}>
                        <div className="scene-cell-tools">
                          <span
                            className="drag-handle"
                            title="Szene verschieben"
                            {...getSceneDragHandleProps(scene.id)}
                          >
                            ⠿
                          </span>
                          <button
                            type="button"
                            className="row-delete"
                            disabled={roleCount > 0}
                            title={
                              roleCount > 0
                                ? "Erst alle Rollen dieser Szene löschen"
                                : "Szene löschen"
                            }
                            onClick={() => onRemoveScene(scene.id)}
                          >
                            &times;
                          </button>
                        </div>
                        <input
                          placeholder="#"
                          value={scene.sceneNumber ?? ""}
                          onChange={(e) => onSceneFieldChange(scene.id, "sceneNumber", e.target.value)}
                        />
                      </td>
                      <td rowSpan={sceneRowSpan} className={sceneCellClass} {...dropProps}>
                        <RadioGroup
                          name={`intExt-${scene.id}`}
                          value={scene.intExt}
                          options={INT_EXT_OPTIONS}
                          onChange={(value) => onSceneFieldChange(scene.id, "intExt", value)}
                        />
                      </td>
                      <td rowSpan={sceneRowSpan} className={sceneCellClass} {...dropProps}>
                        <RadioGroup
                          name={`dayNight-${scene.id}`}
                          value={scene.dayNight}
                          options={DAY_NIGHT_OPTIONS}
                          onChange={(value) => onSceneFieldChange(scene.id, "dayNight", value)}
                        />
                      </td>
                      {/* Von and Bis share one column; Bis only applies to the
                          last Scene, which is what closes out the shooting day. */}
                      <td rowSpan={sceneRowSpan} className={sceneCellClass} {...dropProps}>
                        <div className="scene-time-range">
                          <input
                            type="time"
                            aria-label="Script Time von"
                            value={scene.scriptTime ?? ""}
                            onChange={(e) => onSceneFieldChange(scene.id, "scriptTime", e.target.value)}
                          />
                          {isLastScene && (
                            <>
                              <span className="scene-time-separator">&ndash;</span>
                              <input
                                type="time"
                                aria-label="Script Time bis"
                                value={scene.endTime ?? ""}
                                onChange={(e) => onSceneFieldChange(scene.id, "endTime", e.target.value)}
                              />
                            </>
                          )}
                        </div>
                      </td>
                      <td rowSpan={sceneRowSpan} className={sceneCellClass} {...dropProps}>
                        <input
                          list={SCENE_LOCATIONS_DATALIST_ID}
                          value={scene.location ?? ""}
                          onChange={(e) => onSceneFieldChange(scene.id, "location", e.target.value)}
                        />
                      </td>
                      <td rowSpan={sceneRowSpan} className="cell-role text-center fw-bold">
                        {total}
                      </td>
                    </>
                  )}
                  {isAddRoleRow ? (
                    <>
                      <td className="cell-role" />
                      <td className="cell-role text-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => onAddRole(scene.id)}
                        >
                          + Rolle
                        </button>
                      </td>
                      <td className="cell-role" colSpan={categories.length + 1} />
                    </>
                  ) : (
                    role && (
                      <>
                        <td className="cell-role">
                          <input
                            value={role.fuzzleId ?? ""}
                            onChange={(e) => onFuzzleIdChange(role.id, e.target.value)}
                          />
                        </td>
                        <td className="cell-role">
                          <input
                            value={role.name}
                            onChange={(e) => onRoleNameChange(role.id, e.target.value)}
                          />
                        </td>
                        {groups.flatMap((group) =>
                          group.categories.map((category) => {
                            const cell = role.counts.find((c) => c.categoryId === category.id);
                            const count = cell?.count ?? 0;
                            const isNew = cell?.isNew ?? true;
                            return (
                              <td key={category.id} className="cell-count">
                                <input
                                  type="number"
                                  min={0}
                                  value={count}
                                  onChange={(e) =>
                                    onCountChange(
                                      role.id,
                                      category.id,
                                      Math.max(0, Number(e.target.value) || 0),
                                    )
                                  }
                                />
                                <button
                                  type="button"
                                  className={`isnew-toggle ${isNew ? "is-new" : "is-reused"}`}
                                  title={
                                    isNew
                                      ? "neu – klicken für wiederverwendet"
                                      : "wiederverwendet – klicken für neu"
                                  }
                                  onClick={() => onToggleIsNew(role.id, category.id)}
                                >
                                  {isNew ? "neu" : "wdh."}
                                </button>
                              </td>
                            );
                          }),
                        )}
                        <td className="cell-role">
                          <div className="role-total-cell">
                            <span>{roleTotal(role)}</span>
                            <button
                              type="button"
                              className="row-delete"
                              title="Rolle löschen"
                              onClick={() => onRemoveRole(role.id)}
                            >
                              &times;
                            </button>
                          </div>
                        </td>
                      </>
                    )
                  )}
                </tr>
              );
            })}

            {sceneChanges.map((change) => (
              <tr key={change.id}>
                <td colSpan={totalColumns} className="cell-change">
                  <div className="cell-change-row">
                    <strong>Change</strong>
                    <input
                      value={change.description ?? ""}
                      onChange={(e) => onChangeDescriptionChange(change.id, e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => onRemoveChange(change.id)}
                    >
                      &times;
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            <tr>
              <td colSpan={totalColumns} className="text-center scene-add-row">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => onAddSceneAfter(scene.id)}
                >
                  + Szene
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => onAddChange(scene.id)}
                >
                  + Wechsel
                </button>
              </td>
            </tr>
          </Fragment>
        );
      })}

      <tr className="schedule-set-spacer">
        <td colSpan={totalColumns} />
      </tr>
    </tbody>
  );
}
