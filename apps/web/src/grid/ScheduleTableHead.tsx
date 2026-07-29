import type { Category } from "../api.js";
import { groupCategories, ROLE_META_COLUMN_COUNT, SCENE_COLUMN_COUNT } from "./scheduleLayout.js";

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
        <th style={{ width: 40 }}>#</th>
        <th style={{ width: 110 }}>In/Ex</th>
        <th style={{ width: 110 }}>D/N</th>
        <th style={{ width: 80 }}>Script Time</th>
        <th style={{ width: 80 }}>Bis</th>
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
