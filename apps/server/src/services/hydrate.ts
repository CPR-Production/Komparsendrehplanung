import { asc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { changes, roleCategoryCounts, roles, scenes, setLocations, sets } from "../db/schema.js";

export function hydrateSet(setId: string) {
  const set = db.select().from(sets).where(eq(sets.id, setId)).get();
  if (!set) return null;

  const locationRows = db
    .select()
    .from(setLocations)
    .where(eq(setLocations.setId, set.id))
    .orderBy(asc(setLocations.sortOrder))
    .all();

  const sceneRows = db
    .select()
    .from(scenes)
    .where(eq(scenes.setId, set.id))
    .orderBy(asc(scenes.sortOrder))
    .all();

  const changeRows = db
    .select()
    .from(changes)
    .where(eq(changes.setId, set.id))
    .orderBy(asc(changes.sortOrder))
    .all();

  const hydratedScenes = sceneRows.map((scene) => {
    const roleRows = db
      .select()
      .from(roles)
      .where(eq(roles.sceneId, scene.id))
      .orderBy(asc(roles.sortOrder))
      .all();

    const hydratedRoles = roleRows.map((role) => {
      const counts = db
        .select()
        .from(roleCategoryCounts)
        .where(eq(roleCategoryCounts.roleId, role.id))
        .all();
      return { ...role, counts };
    });

    return { ...scene, roles: hydratedRoles };
  });

  return { ...set, locations: locationRows, scenes: hydratedScenes, changes: changeRows };
}
