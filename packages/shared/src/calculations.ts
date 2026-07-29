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
