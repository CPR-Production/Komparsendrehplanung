import type { RoleWithCounts, SceneWithRoles, SetWithScenes } from "./types.js";

function roleSlotTotal(role: RoleWithCounts): number {
  return role.counts.reduce((sum, c) => sum + c.count, 0);
}

function roleNewSlotTotal(role: RoleWithCounts): number {
  return role.counts.reduce((sum, c) => sum + (c.isNew ? c.count : 0), 0);
}

export function calcSceneTotal(scene: SceneWithRoles): number {
  return scene.roles.reduce((sum, role) => sum + roleSlotTotal(role), 0);
}

// Total Shoots only counts slots marked "neu": a Komparse reused in a later
// role/scene is marked "wiederverwendet" and must not inflate the day's total.
export function calcSetTotalShoots(set: SetWithScenes): number {
  let total = 0;
  for (const scene of set.scenes) {
    for (const role of scene.roles) {
      total += roleNewSlotTotal(role);
    }
  }
  return total;
}

// Breakdown of Total Shoots per category — same "neu only" rule, kept split by
// category so the Set header can show where the day's Komparsen actually go
// (e.g. Supporting artists/normal vs. Stunt). Categories with no new slots are
// absent from the map; callers fall back to 0 so they can list every category.
export function calcSetNewCountsByCategory(set: SetWithScenes): Map<string, number> {
  const totals = new Map<string, number>();
  for (const scene of set.scenes) {
    for (const role of scene.roles) {
      for (const cell of role.counts) {
        if (!cell.isNew) continue;
        totals.set(cell.categoryId, (totals.get(cell.categoryId) ?? 0) + cell.count);
      }
    }
  }
  return totals;
}
