import type { Category } from "../api.js";

export const SCENE_COLUMN_COUNT = 4; // #, In/Ex + D/N, Script Time (von–bis), Location
export const ROLE_META_COLUMN_COUNT = 3; // Total/Scene, Fuzzle ID, Name

// The Set header lays its SD field out against the same grid as the table body,
// so the scene-number width is shared rather than duplicated as a magic number.
export const SCENE_NUMBER_COLUMN_WIDTH = 56;

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
  return SCENE_COLUMN_COUNT + ROLE_META_COLUMN_COUNT + categories.length + 1;
}

// Name is the last of the role-meta columns. The Set totals row borrows it as
// its label cell so the numbers line up under their own category headers, which
// means everything left of Name collapses into a single spacer.
export const COLUMNS_BEFORE_ROLE_NAME = SCENE_COLUMN_COUNT + ROLE_META_COLUMN_COUNT - 1;
