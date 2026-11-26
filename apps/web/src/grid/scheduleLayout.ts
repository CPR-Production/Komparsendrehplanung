import type { Category } from "../api.js";

// The Set header lays its SD field out against the same grid as the table body,
// so the scene-number width is shared rather than duplicated as a magic number.
export const SCENE_NUMBER_COLUMN_WIDTH = 56;

export const CATEGORY_COLUMN_WIDTH = 80;

// Both totals columns hold a number and nothing else, so they get half of a
// category column — which also brings the counts, the part that gets typed,
// closer to the names they belong to.
export const TOTAL_COLUMN_WIDTH = CATEGORY_COLUMN_WIDTH / 2;

/* The two fixed blocks of the grid, as widths rather than as counts: the table
   is laid out `fixed`, and under that rule the browser takes its columns from
   the first row alone — which here is the group header, whose cells span four
   columns and more. A <colgroup> is read ahead of that row and is the only place
   a per-column width actually lands; on a <th> of the second header row, where
   these used to sit, they are read by nobody.

   The column counts below are the lengths of these lists, so a column cannot be
   added to the grid without a width, or counted twice. Everything that spans the
   grid — Set header, Synopsis, Wechsel row, totals row — measures itself against
   them. */
export const SCENE_COLUMN_WIDTHS = [
  SCENE_NUMBER_COLUMN_WIDTH, // #
  130, // In/Ex + time of day, stacked
  // Script Time holds one start time and nothing else — the column used to
  // carry a second field for the end of the shooting day and was twice as wide.
  100, // Script Time
  160, // Location
] as const;

export const ROLE_META_COLUMN_WIDTHS = [
  80, // Fuzzle ID
  // The Role name wraps instead of running out of its column (see
  // AutoGrowTextarea), so this width is a line length, not a cut-off point.
  260, // Name
  TOTAL_COLUMN_WIDTH, // Total/Scene
  TOTAL_COLUMN_WIDTH, // Total
] as const;

export const SCENE_COLUMN_COUNT = SCENE_COLUMN_WIDTHS.length;
export const ROLE_META_COLUMN_COUNT = ROLE_META_COLUMN_WIDTHS.length;

/* The delete × has a column to itself, at the far right and without a heading:
   it is a control, not a value, and a fixed 1.6-rem square holds open whatever
   column it shares. It cannot join either list above — it sits behind the
   category columns, and those are as many as the project has. */
export const ROW_ACTION_COLUMN_WIDTH = 36;
export const ROW_ACTION_COLUMN_COUNT = 1;

export interface CategoryGroupView {
  id: string;
  name: string;
  categories: Category[];
}

export function groupCategories(categories: Category[]): CategoryGroupView[] {
  const groupIds = [...new Set(categories.map((c) => c.categoryGroupId))];
  return groupIds.map((groupId) => ({
    id: groupId,
    name: categories.find((c) => c.categoryGroupId === groupId)!.groupName,
    categories: categories.filter((c) => c.categoryGroupId === groupId),
  }));
}

export function totalColumnCount(categories: Category[]): number {
  return (
    SCENE_COLUMN_COUNT + ROLE_META_COLUMN_COUNT + categories.length + ROW_ACTION_COLUMN_COUNT
  );
}

// Name is the second of the role-meta columns. The Set totals row borrows it as
// its label cell so the numbers line up under their own category headers, which
// means everything left of Name collapses into a single spacer.
export const COLUMNS_BEFORE_ROLE_NAME = SCENE_COLUMN_COUNT + 1;
