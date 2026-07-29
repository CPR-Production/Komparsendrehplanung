import type { Category } from "../api.js";

export const SCENE_COLUMN_COUNT = 6; // #, In/Ex, D/N, Script Time, Bis, Location (Synopsis is its own row)
export const ROLE_META_COLUMN_COUNT = 3; // Total/Scene, Fuzzle ID, Name

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
