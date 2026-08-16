import type { Category } from "../api.js";
import {
  groupCategories,
  ROLE_META_COLUMN_COUNT,
  SCENE_COLUMN_COUNT,
  SCENE_NUMBER_COLUMN_WIDTH,
} from "./scheduleLayout.js";

export function ScheduleTableHead({ categories }: { categories: Category[] }) {
  const groups = groupCategories(categories);

  return (
    <thead className="schedule-table-head">
      <tr>
        <th colSpan={SCENE_COLUMN_COUNT}>Scene</th>
        <th colSpan={ROLE_META_COLUMN_COUNT} />
        {groups.map((group) => (
          <th key={group.id} colSpan={group.categories.length}>
            {group.name}
          </th>
        ))}
        <th />
      </tr>
      <tr>
        <th style={{ width: SCENE_NUMBER_COLUMN_WIDTH }}>#</th>
        {/* In/Ex and D/N share one column, stacked — see .scene-flags. */}
        <th style={{ width: 130 }}>In/Ex · D/N</th>
        <th style={{ width: 140 }}>Script Time</th>
        <th style={{ width: 160 }}>Location</th>
        <th style={{ width: 70 }}>Total/Scene</th>
        <th style={{ width: 80 }}>Fuzzle ID</th>
        <th style={{ width: 260 }}>Name</th>
        {groups.flatMap((group) =>
          group.categories.map((category) => (
            <th key={category.id} style={{ width: 70 }}>
              {category.name}
            </th>
          )),
        )}
        <th style={{ width: 60 }}>Total</th>
      </tr>
    </thead>
  );
}
