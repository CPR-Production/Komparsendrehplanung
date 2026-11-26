import {
  calcSceneTotal,
  formatIntExt,
  INT_EXT_VALUES,
  type IntExt,
  isDarkColor,
  parseIntExt,
  sceneColorKey,
  type SetPlaceKind,
  TIME_OF_DAY_VALUES,
} from "@komparsen/shared";
import { Fragment, type CSSProperties, type HTMLAttributes, type TdHTMLAttributes } from "react";
import { useTranslation } from "react-i18next";
import type {
  Category,
  ChangeRow,
  RoleRow,
  ColorSetting,
  SceneRow,
  SetLocation,
  ShootSet,
} from "../api.js";
import { useEditLock } from "../editLock.js";
import { AutoGrowTextarea } from "./AutoGrowTextarea.js";
import {
  COLUMNS_BEFORE_ROLE_NAME,
  groupCategories,
  SCENE_COLUMN_COUNT,
  SCENE_NUMBER_COLUMN_WIDTH,
  totalColumnCount,
} from "./scheduleLayout.js";

export const SCENE_LOCATIONS_DATALIST_ID = "scene-locations";

interface ScheduleTableProps {
  set: ShootSet;
  locations: SetLocation[];
  scenes: SceneRow[];
  changes: ChangeRow[];
  categories: Category[];
  colors: ColorSetting[];
  totalShoots: number;
  newCountsByCategory: Map<string, number>;
  setDragHandleProps: HTMLAttributes<HTMLSpanElement>;
  setDropProps: TdHTMLAttributes<HTMLTableCellElement>;
  getSceneDragHandleProps: (sceneId: string) => HTMLAttributes<HTMLSpanElement>;
  getSceneDropProps: (sceneId: string) => TdHTMLAttributes<HTMLTableCellElement>;
  draggedSceneId: string | null;
  onSetFieldChange: (field: keyof ShootSet, value: string) => void;
  onLocationFieldChange: (locationId: string, value: string) => void;
  onAddLocation: (kind: SetPlaceKind) => void;
  onRemoveLocation: (locationId: string) => void;
  onRemoveSet: () => void;
  onAddSetAfter: () => void;
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

/* The values come from @komparsen/shared — the same list the server validates
   against and the colour keys are built from, so the grid cannot drift from
   either. Only the labels live here, and only as keys: they are the same words
   the colour settings put on their rows, so both read from `sceneState.*` and
   cannot end up naming one state two ways.

   Five stages, not two — the column `scene.day_night` keeps its historic name.
   Order follows the reference plan (Day, Night, Morn, Dim, Eve) rather than the
   course of a day, because the planned digit shortcuts number the entries in
   exactly that order. "Dim" stays "Dim" in German too: „halb dunkel" is too
   long for the column and does not shorten well. */

/* Intern and Extern do not exclude each other — a Scene can start inside and
   end outside, and the reference plan uses that combination. Both values go
   into the existing `scene.int_ext` text column, separated by ";".

   The format itself lives in @komparsen/shared, next to the colour key that has
   to read a Scene's state from exactly the same string. */
function toggleIntExt(value: string | null, option: IntExt): string {
  const selected = parseIntExt(value);
  const next = selected.includes(option)
    ? selected.filter((entry) => entry !== option)
    : [...selected, option];

  // formatIntExt orders by the shared value list, so the stored value stays
  // "intern;extern" no matter which box was ticked first.
  return formatIntExt(next);
}

// Generic over the option value so the caller keeps its narrow value type —
// otherwise the toggle handler would hand a bare string back to toggleIntExt.
function CheckboxGroup<T extends string>({
  name,
  selected,
  options,
  disabled,
  onToggle,
}: {
  name: string;
  selected: readonly T[];
  options: { value: T; label: string }[];
  disabled: boolean;
  onToggle: (value: T) => void;
}) {
  return (
    <div className="btn-group btn-group-sm" role="group">
      {options.map((option) => (
        <Fragment key={option.value}>
          <input
            type="checkbox"
            className="btn-check"
            autoComplete="off"
            name={name}
            id={`${name}-${option.value}`}
            checked={selected.includes(option.value)}
            disabled={disabled}
            onChange={() => onToggle(option.value)}
          />
          <label className="btn btn-outline-dark" htmlFor={`${name}-${option.value}`}>
            {option.label}
          </label>
        </Fragment>
      ))}
    </div>
  );
}

/* Eine der beiden Listen eines Sets, als eigene Zeile mit ihrem eigenen „+".
   Beide sehen gleich aus und verhalten sich gleich — sie unterscheiden sich nur
   in Beschriftung und `kind`, also steht das hier einmal.

   Sechs je Liste — so viele Motive bekommt ein voller Drehtag zusammen. Eine
   Grenze bleibt es, weil die Zeile sonst den halben Set-Kopf füllt; sie steht
   hier und nicht im Server, denn sie ist eine Frage des Platzes, nicht der
   Daten. */
const MAX_PLACES_PER_KIND = 6;

function SetPlaceList({
  kind,
  places,
  label,
  addLabel,
  deleteLabel,
  locked,
  onFieldChange,
  onAdd,
  onRemove,
}: {
  kind: SetPlaceKind;
  places: SetLocation[];
  label: string;
  addLabel: string;
  deleteLabel: string;
  locked: boolean;
  onFieldChange: (placeId: string, value: string) => void;
  onAdd: (kind: SetPlaceKind) => void;
  onRemove: (placeId: string) => void;
}) {
  return (
    <div className="d-flex flex-wrap gap-1 align-items-center set-place-row">
      {places.map((place) => (
        <div key={place.id} className="d-flex gap-1 align-items-center">
          <input
            className="form-control form-control-sm set-place-input"
            placeholder={label}
            aria-label={label}
            disabled={locked}
            value={place.name ?? ""}
            onChange={(e) => onFieldChange(place.id, e.target.value)}
          />
          <button
            type="button"
            className="row-delete"
            disabled={locked}
            title={deleteLabel}
            onClick={() => onRemove(place.id)}
          >
            &times;
          </button>
        </div>
      ))}
      {places.length < MAX_PLACES_PER_KIND && (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          disabled={locked}
          onClick={() => onAdd(kind)}
        >
          {addLabel}
        </button>
      )}
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

export function ScheduleTable({
  set,
  locations,
  scenes,
  changes,
  categories,
  colors,
  totalShoots,
  newCountsByCategory,
  setDragHandleProps,
  setDropProps,
  getSceneDragHandleProps,
  getSceneDropProps,
  draggedSceneId,
  onSetFieldChange,
  onLocationFieldChange,
  onAddLocation,
  onRemoveLocation,
  onRemoveSet,
  onAddSetAfter,
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
  const { t } = useTranslation();
  /* Read from the context, not handed down: the lock belongs to the app, not to
     this Set, and a prop would have to travel through SetSection — which has no
     other use for it — into all thirty-odd controls below. */
  const { locked } = useEditLock();
  const groups = groupCategories(categories);
  const totalColumns = totalColumnCount(categories);
  // Labelled here rather than at module level: the wording depends on the
  // language, and that is not known until render.
  const intExtOptions = INT_EXT_VALUES.map((value) => ({
    value,
    label: t(`sceneState.intExt.${value}`),
  }));
  const timeOfDayOptions = TIME_OF_DAY_VALUES.map((value) => ({
    value,
    label: t(`sceneState.timeOfDay.${value}`),
  }));
  // Zwei Listen, eine Tabelle: `kind` trennt sie. Hier und nicht im Server,
  // weil der Set-Kopf beide ohnehin zusammen lädt.
  const motifs = locations.filter((place) => place.kind === "motif");
  const shootLocations = locations.filter((place) => place.kind === "location");
  // Only the per-Scene colours are looked up here; the frame colours ride on
  // the table element and reach these cells by inheritance.
  const colorByKey = new Map(colors.map((color) => [color.key, color]));

  return (
    <tbody>
      <tr>
        <td colSpan={totalColumns - 1} className="cell-set" {...setDropProps}>
          {/* SD and the date at the left, the day's places beside them. Two
              derived readouts used to stand here as well — the shoot time taken
              from the first and last Scene, and the Locations collected from the
              Scenes; both are gone. The day's times are entered per Scene, and
              the Set names its own places. */}
          <div className="d-flex flex-wrap gap-3 align-items-start">
            <span className="drag-handle" title={t("grid.set.move")} {...setDragHandleProps}>
              ⠿
            </span>
            {/* Beschriftung neben das Feld, nicht darüber: dann ist jeder Block
                dieser Reihe genau eine Feldhöhe hoch, und die erste Ortszeile
                steht ohne gerechneten Versatz auf einer Linie mit SD und
                Datum — die Zeilenhöhe schwankt sonst damit, ob die Liste schon
                Einträge hat oder nur ihren „+"-Knopf. */}
            <label className="mb-0 d-flex align-items-center gap-1">
              {t("grid.set.sd")}
              <input
                className="form-control form-control-sm"
                style={{ width: SCENE_NUMBER_COLUMN_WIDTH }}
                disabled={locked}
                value={set.sdNumber ?? ""}
                onChange={(e) => onSetFieldChange("sdNumber", e.target.value)}
              />
            </label>
            <input
              type="date"
              aria-label={t("grid.set.shootDate")}
              className="form-control form-control-sm set-date-input"
              disabled={locked}
              value={set.shootDate ?? ""}
              onChange={(e) => onSetFieldChange("shootDate", e.target.value)}
            />
            {/* Motive above, Locations below — two lists, not pairs. Three
                Motive can share a single address, and the same address carries
                a different Motiv on another day; a row holding both would have
                forced one to be invented whenever only the other was known. */}
            <div className="set-places">
              <SetPlaceList
                kind="motif"
                places={motifs}
                label={t("grid.set.motif")}
                addLabel={t("grid.set.addMotif")}
                deleteLabel={t("grid.set.deleteMotif")}
                locked={locked}
                onFieldChange={onLocationFieldChange}
                onAdd={onAddLocation}
                onRemove={onRemoveLocation}
              />
              <SetPlaceList
                kind="location"
                places={shootLocations}
                label={t("grid.set.location")}
                addLabel={t("grid.set.addLocation")}
                deleteLabel={t("grid.set.deleteLocation")}
                locked={locked}
                onFieldChange={onLocationFieldChange}
                onAdd={onAddLocation}
                onRemove={onRemoveLocation}
              />
            </div>
          </div>
        </td>
        {/* Dieselbe Spalte wie bei Szene und Rolle — alle drei Löschknöpfe
            stehen an einer Kante.

            Gesperrt, solange der Tagteiler Szenen hält: genau die Regel, die
            eine Szene vor ihren Rollen schützt, eine Ebene höher. Ein Fehlklick
            nähme hier einen ganzen Drehtag mit, Besetzung inbegriffen. Ein
            versehentlich angelegter, noch leerer Tagteiler lässt sich dagegen
            sofort wieder wegklicken. */}
        <td className="cell-set text-center" {...setDropProps}>
          <button
            type="button"
            className="row-delete"
            disabled={locked || scenes.length > 0}
            title={scenes.length > 0 ? t("grid.set.deleteBlocked") : t("grid.set.delete")}
            onClick={onRemoveSet}
          >
            &times;
          </button>
        </td>
      </tr>

      {/* Set totals, laid out on the grid rather than as free text: each sum
          sits in its own category column, so it reads straight down from the
          category header and — via the group header above it — per group. */}
      <tr className="set-totals-row">
        <td colSpan={COLUMNS_BEFORE_ROLE_NAME} className="cell-set" />
        <td className="cell-set set-totals-label">{t("grid.set.totalsLabel")}</td>
        {/* Total/Scene sums a single Scene, so the Set has nothing to put
            there; the day's total does sit under its own Total header. */}
        <td className="cell-set" />
        <td className="cell-set set-totals-value">{totalShoots}</td>
        {groups.flatMap((group) =>
          group.categories.map((category) => {
            const count = newCountsByCategory.get(category.id) ?? 0;
            return (
              <td
                key={category.id}
                className={`cell-set set-totals-value${count === 0 ? " is-zero" : ""}`}
              >
                {count}
              </td>
            );
          }),
        )}
        {/* Nothing to delete on this row, but the column has to be filled. */}
        <td className="cell-set" />
      </tr>

      {scenes.length === 0 && (
        <tr>
          <td colSpan={totalColumns} className="text-center">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={locked}
              onClick={() => onAddSceneAfter(null)}
            >
              {t("grid.scene.add")}
            </button>
          </td>
        </tr>
      )}

      {scenes.map((scene) => {
        const roleCount = scene.roles.length;
        const sceneRowSpan = roleCount + 1; // +1 for the trailing "+ Rolle" row
        const total = sceneTotal(scene);
        const sceneChanges = changes.filter((c) => c.anchorAfterSceneId === scene.id);
        // Every Scene cell accepts the drop, so the drop zone is the whole
        // Scene block rather than just the drag handle glyph.
        const dropProps = getSceneDropProps(scene.id);
        // Coloured by what the Scene shows, not by where it sits in the
        // hierarchy. Both colours go through Bootstrap's own cell variables —
        // it paints `background-color` and `color` on every cell itself, so
        // setting those properties directly means fighting it. A Scene without
        // In/Ex or a time of day has no state yet and keeps the neutral Scene
        // colour from the stylesheet.
        const stateColor = colorByKey.get(sceneColorKey(scene.intExt, scene.dayNight) ?? "");
        const sceneCellStyle = stateColor
          ? ({
              "--bs-table-bg": stateColor.backgroundColor,
              "--bs-table-color": stateColor.textColor,
            } as CSSProperties)
          : undefined;
        // The controls inside the cell carry fixed colours of their own — a red
        // ×, a grey handle, dark button outlines — and a dark background
        // swallows all three. Only then do they give way to the cell's text
        // colour: on a light state the red still reads, and losing it would
        // weaken the one delete affordance the app has.
        const sceneCellClass = [
          "cell-scene",
          draggedSceneId === scene.id ? "is-dragging" : "",
          stateColor && isDarkColor(stateColor.backgroundColor) ? "has-dark-state" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <Fragment key={scene.id}>
            {/* The Scene's own fields, each in its own column: number, In/Ex
                with the time of day, Script Time, Location. The Location takes
                everything to its right with it — that stretch sits above the
                Roles and would otherwise stay empty, and the location is the
                one Scene field regularly too long for its column. */}
            <tr>
              <td className={sceneCellClass} style={sceneCellStyle} {...dropProps}>
                <div className="scene-cell-tools">
                  <span
                    className="drag-handle"
                    title={t("grid.scene.move")}
                    {...getSceneDragHandleProps(scene.id)}
                  >
                    ⠿
                  </span>
                </div>
                <input
                  placeholder={t("grid.scene.numberPlaceholder")}
                  disabled={locked}
                  value={scene.sceneNumber ?? ""}
                  onChange={(e) => onSceneFieldChange(scene.id, "sceneNumber", e.target.value)}
                />
              </td>
              {/* Intern/Extern and the time of day share one column, stacked
                  with In/Ex on top. */}
              <td className={sceneCellClass} style={sceneCellStyle} {...dropProps}>
                <div className="scene-flags">
                  <CheckboxGroup
                    name={`intExt-${scene.id}`}
                    selected={parseIntExt(scene.intExt)}
                    options={intExtOptions}
                    disabled={locked}
                    onToggle={(value) =>
                      onSceneFieldChange(scene.id, "intExt", toggleIntExt(scene.intExt, value))
                    }
                  />
                  {/* Five mutually exclusive stages no longer fit the column as
                      buttons, and a list is what the reference plan uses.
                      Distinct first letters keep it fast: T, N, M, D and A each
                      select in one keystroke. */}
                  <select
                    aria-label={t("grid.scene.timeOfDay")}
                    disabled={locked}
                    value={scene.dayNight ?? ""}
                    onChange={(e) => onSceneFieldChange(scene.id, "dayNight", e.target.value)}
                  >
                    <option value="">&ndash;</option>
                    {timeOfDayOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
              {/* One time, the Scene's start. The column used to hold a second
                  field on the last Scene and feed a Von–Bis readout in the Set
                  header; nothing is computed from these times any more, so an
                  empty Scene reads --:-- and means exactly that. */}
              <td className={sceneCellClass} style={sceneCellStyle} {...dropProps}>
                <input
                  type="time"
                  aria-label={t("grid.head.scriptTime")}
                  disabled={locked}
                  value={scene.scriptTime ?? ""}
                  onChange={(e) => onSceneFieldChange(scene.id, "scriptTime", e.target.value)}
                />
              </td>
              {/* Its own column plus everything after it, bar the last: the
                  stretch above the Roles would otherwise stay empty, and an
                  address is regularly longer than its column. */}
              <td
                colSpan={totalColumns - SCENE_COLUMN_COUNT}
                className={sceneCellClass}
                style={sceneCellStyle}
                {...dropProps}
              >
                <input
                  list={SCENE_LOCATIONS_DATALIST_ID}
                  aria-label={t("grid.head.location")}
                  disabled={locked}
                  value={scene.location ?? ""}
                  onChange={(e) => onSceneFieldChange(scene.id, "location", e.target.value)}
                />
              </td>
              {/* Deleting sits in one column for the whole grid — the Role's ×
                  is already there, and an eye running down that edge finds
                  every delete in the plan at the same place. The Scene used to
                  keep its × beside the Scene number, where it shared a corner
                  with the drag handle. */}
              <td
                className={`${sceneCellClass} text-center`}
                style={sceneCellStyle}
                {...dropProps}
              >
                <button
                  type="button"
                  className="row-delete"
                  disabled={locked || roleCount > 0}
                  title={roleCount > 0 ? t("grid.scene.deleteBlocked") : t("grid.scene.delete")}
                  onClick={() => onRemoveScene(scene.id)}
                >
                  &times;
                </button>
              </td>
            </tr>

            {Array.from({ length: sceneRowSpan }).map((_, rowIndex) => {
              // No Role for the last row: that is the trailing "+ Rolle" row.
              const role = rowIndex < roleCount ? scene.roles[rowIndex] : undefined;
              return (
                <tr key={role?.id ?? `${scene.id}-row-${rowIndex}`}>
                  {/* The Synopsis, under the Scene's own fields and across the
                      same four columns. It lost its label with the move: one
                      italic line below the Scene number reads as the Scene's
                      description without being announced, and the plans it comes
                      from write it that way too. The room for it is the Role rows
                      it spans — nothing else claims that corner of the grid. */}
                  {rowIndex === 0 && (
                    <td
                      colSpan={SCENE_COLUMN_COUNT}
                      rowSpan={sceneRowSpan}
                      className={`${sceneCellClass} cell-synopsis`}
                      style={sceneCellStyle}
                      {...dropProps}
                    >
                      {/* A textarea, not a one-line field: four columns are
                          narrower than the full-width row this used to be, and a
                          locked field cannot even be scrolled to read its tail.
                          The Role rows give the cell the height, so the text
                          wraps into space that is already there. */}
                      <textarea
                        rows={1}
                        aria-label={t("grid.scene.synopsis")}
                        disabled={locked}
                        value={scene.synopsis ?? ""}
                        onChange={(e) => onSceneFieldChange(scene.id, "synopsis", e.target.value)}
                      />
                    </td>
                  )}
                  {/* Fuzzle ID and Name first — a Role is read by who it is,
                      not by what it adds up to. */}
                  {role ? (
                    <>
                      <td className="cell-role">
                        <input
                          disabled={locked}
                          value={role.fuzzleId ?? ""}
                          onChange={(e) => onFuzzleIdChange(role.id, e.target.value)}
                        />
                      </td>
                      {/* The name wraps and the row grows with it: a Role is
                          found by its name, and a name cut off at the column
                          edge cannot be read back at all once the grid is
                          locked. Enter is swallowed — the break comes from the
                          width, and a stored newline would be invisible. */}
                      <td className="cell-role cell-role-name">
                        <AutoGrowTextarea
                          aria-label={t("grid.head.name")}
                          disabled={locked}
                          value={role.name}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.preventDefault();
                          }}
                          onChange={(e) => onRoleNameChange(role.id, e.target.value)}
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="cell-role" />
                      <td className="cell-role text-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          disabled={locked}
                          onClick={() => onAddRole(scene.id)}
                        >
                          {t("grid.role.add")}
                        </button>
                      </td>
                    </>
                  )}
                  {/* Total/Scene follows the names and spans the Role rows, so
                      it has to be emitted between them and the Role's own
                      Total rather than ahead of both. */}
                  {rowIndex === 0 && (
                    <td rowSpan={sceneRowSpan} className="cell-role text-center fw-bold">
                      {total}
                    </td>
                  )}
                  {role ? (
                    <>
                      <td className="cell-role text-center">{roleTotal(role)}</td>
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
                                disabled={locked}
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
                                disabled={locked}
                                title={
                                  isNew
                                    ? t("grid.count.toggleToReused")
                                    : t("grid.count.toggleToNew")
                                }
                                onClick={() => onToggleIsNew(role.id, category.id)}
                              >
                                {isNew ? t("grid.count.new") : t("grid.count.reused")}
                              </button>
                            </td>
                          );
                        }),
                      )}
                      {/* The delete column, last in the row and headerless: the
                          × is a control, not a value, and a fixed square holds
                          open whatever column it shares. */}
                      <td className="cell-role text-center">
                        <button
                          type="button"
                          className="row-delete"
                          disabled={locked}
                          title={t("grid.role.delete")}
                          onClick={() => onRemoveRole(role.id)}
                        >
                          &times;
                        </button>
                      </td>
                    </>
                  ) : (
                    // The Role's own Total, every category column and the delete
                    // column: the Total/Scene cell between them comes from the
                    // rowSpan above.
                    <td className="cell-role" colSpan={categories.length + 2} />
                  )}
                </tr>
              );
            })}

            {sceneChanges.map((change) => (
              <tr key={change.id}>
                <td colSpan={totalColumns} className="cell-change">
                  <div className="cell-change-row">
                    <strong>{t("grid.change.label")}</strong>
                    <input
                      disabled={locked}
                      value={change.description ?? ""}
                      onChange={(e) => onChangeDescriptionChange(change.id, e.target.value)}
                    />
                    <button
                      type="button"
                      className="row-delete"
                      disabled={locked}
                      title={t("grid.change.delete")}
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
                  disabled={locked}
                  onClick={() => onAddSceneAfter(scene.id)}
                >
                  {t("grid.scene.add")}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={locked}
                  onClick={() => onAddChange(scene.id)}
                >
                  {t("grid.change.add")}
                </button>
              </td>
            </tr>
          </Fragment>
        );
      })}

      {/* Am Ende jedes Tagteilers, vor dem Abstand zum nächsten: hier gedrückt
          entsteht der neue genau an dieser Stelle. Der Knopf in der Kopfleiste
          hängt weiter hinten an — er meint keinen Platz, sondern einen
          weiteren Drehtag. Wie bei „+ Szene", das dieselbe Rolle eine Ebene
          tiefer spielt. */}
      <tr className="set-add-row">
        <td colSpan={totalColumns} className="text-center">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={locked}
            onClick={onAddSetAfter}
          >
            {t("nav.addSet")}
          </button>
        </td>
      </tr>

      <tr className="schedule-set-spacer">
        <td colSpan={totalColumns} />
      </tr>
    </tbody>
  );
}
