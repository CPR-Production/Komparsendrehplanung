import { useTranslation } from "react-i18next";
import type { Category } from "../api.js";
import {
  CATEGORY_COLUMN_WIDTH,
  groupCategories,
  ROLE_META_COLUMN_COUNT,
  ROLE_META_COLUMN_WIDTHS,
  SCENE_COLUMN_COUNT,
  SCENE_COLUMN_WIDTHS,
} from "./scheduleLayout.js";

/* "Total/Scene" is wider than its halved column and Chrome offers no line break
   of its own after a slash, so the tail would simply be cut off. A <wbr> marks
   the one place the words may fold — anywhere else and it breaks mid-word.
   Built from the translation, not around it: the term is the reference plan's
   and stays whatever the resource file says. */
function foldAfterSlash(label: string) {
  return label.split("/").flatMap((part, index) =>
    index === 0 ? [part] : ["/", <wbr key={index} />, part],
  );
}

export function ScheduleTableHead({ categories }: { categories: Category[] }) {
  const { t } = useTranslation();
  const groups = groupCategories(categories);

  return (
    <>
      {/* The table is laid out `fixed`, so the columns come from here rather
          than from a row: the first row is the group header, and its cells span
          four columns and more. */}
      <colgroup>
        {[...SCENE_COLUMN_WIDTHS, ...ROLE_META_COLUMN_WIDTHS].map((width, index) => (
          <col key={index} style={{ width }} />
        ))}
        {categories.map((category) => (
          <col key={category.id} style={{ width: CATEGORY_COLUMN_WIDTH }} />
        ))}
      </colgroup>
      <thead className="schedule-table-head">
        <tr>
          <th colSpan={SCENE_COLUMN_COUNT}>{t("grid.head.scene")}</th>
          {/* Both totals columns sit inside this block now, so the group headers
              end the row — there is no column left of their own. */}
          <th colSpan={ROLE_META_COLUMN_COUNT} />
          {groups.map((group) => (
            <th key={group.id} colSpan={group.categories.length}>
              {group.name}
            </th>
          ))}
        </tr>
        <tr>
          <th>#</th>
          {/* In/Ex and D/N share one column, stacked — see .scene-flags. */}
          <th>{t("grid.head.intExtDayNight")}</th>
          <th>{t("grid.head.scriptTime")}</th>
          <th>{t("grid.head.location")}</th>
          <th>{t("grid.head.fuzzleId")}</th>
          <th>{t("grid.head.name")}</th>
          {/* Both sums come before the counts: read the Role, then what it adds
              up to, and only then type into the category columns. */}
          <th className="col-total">{foldAfterSlash(t("grid.head.totalPerScene"))}</th>
          <th className="col-total">{t("grid.head.total")}</th>
          {groups.flatMap((group) =>
            group.categories.map((category) => <th key={category.id}>{category.name}</th>),
          )}
        </tr>
      </thead>
    </>
  );
}
