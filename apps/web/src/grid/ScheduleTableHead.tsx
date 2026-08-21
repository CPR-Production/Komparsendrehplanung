import { useTranslation } from "react-i18next";
import type { Category } from "../api.js";
import {
  groupCategories,
  ROLE_META_COLUMN_COUNT,
  SCENE_COLUMN_COUNT,
  SCENE_NUMBER_COLUMN_WIDTH,
} from "./scheduleLayout.js";

export function ScheduleTableHead({ categories }: { categories: Category[] }) {
  const { t } = useTranslation();
  const groups = groupCategories(categories);

  return (
    <thead className="schedule-table-head">
      <tr>
        <th colSpan={SCENE_COLUMN_COUNT}>{t("grid.head.scene")}</th>
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
        <th style={{ width: 130 }}>{t("grid.head.intExtDayNight")}</th>
        <th style={{ width: 140 }}>{t("grid.head.scriptTime")}</th>
        <th style={{ width: 160 }}>{t("grid.head.location")}</th>
        <th style={{ width: 70 }}>{t("grid.head.totalPerScene")}</th>
        <th style={{ width: 80 }}>{t("grid.head.fuzzleId")}</th>
        <th style={{ width: 260 }}>{t("grid.head.name")}</th>
        {groups.flatMap((group) =>
          group.categories.map((category) => (
            <th key={category.id} style={{ width: 70 }}>
              {category.name}
            </th>
          )),
        )}
        <th style={{ width: 60 }}>{t("grid.head.total")}</th>
      </tr>
    </thead>
  );
}
