import { describe, expect, it } from "vitest";
import { calcSceneTotal, calcSetTotalShoots } from "./calculations.js";
import type { SceneWithRoles, SetWithScenes } from "./types.js";

function role(counts: { count: number; isNew?: boolean }[]) {
  return {
    id: crypto.randomUUID(),
    counts: counts.map((c, i) => ({ categoryId: `cat-${i}`, count: c.count, isNew: c.isNew ?? true })),
  };
}

describe("calcSceneTotal", () => {
  it("sums all role category counts in a scene, regardless of isNew", () => {
    const scene: SceneWithRoles = {
      id: "scene-1",
      roles: [role([{ count: 10 }, { count: 3, isNew: false }]), role([{ count: 1 }])],
    };
    expect(calcSceneTotal(scene)).toBe(14);
  });

  it("returns 0 for a scene with no roles", () => {
    expect(calcSceneTotal({ id: "scene-1", roles: [] })).toBe(0);
  });
});

describe("calcSetTotalShoots", () => {
  it("sums only counts marked as new", () => {
    const set: SetWithScenes = {
      id: "set-1",
      scenes: [{ id: "scene-1", roles: [role([{ count: 10 }]), role([{ count: 3, isNew: false }])] }],
    };
    expect(calcSetTotalShoots(set)).toBe(10);
  });

  it("excludes reused (wiederverwendet) slots across roles/scenes", () => {
    const set: SetWithScenes = {
      id: "set-1",
      scenes: [
        { id: "scene-1", roles: [role([{ count: 1 }])] },
        { id: "scene-2", roles: [role([{ count: 1, isNew: false }])] },
      ],
    };
    expect(calcSetTotalShoots(set)).toBe(1);
  });

  it("sums across multiple categories within the same role", () => {
    const set: SetWithScenes = {
      id: "set-1",
      scenes: [
        {
          id: "scene-1",
          roles: [role([{ count: 2, isNew: true }, { count: 1, isNew: false }])],
        },
      ],
    };
    expect(calcSetTotalShoots(set)).toBe(2);
  });

  it("returns 0 for a set with no scenes", () => {
    expect(calcSetTotalShoots({ id: "set-1", scenes: [] })).toBe(0);
  });
});
