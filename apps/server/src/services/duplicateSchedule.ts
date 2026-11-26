import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { changes, roleCategoryCounts, roles, scenes, setLocations, schedules, sets } from "../db/schema.js";

/* Ein Drehplan wird als Ganzes kopiert — Drehtage, Motive, Locations, Szenen,
   Rollen, Zählungen, Rollenwechsel. Sechs Tabellen, und zwei Dinge, die man
   dabei falsch machen kann:

   1. **Verweise müssen mitwandern.** Jede kopierte Zeile bekommt eine neue id,
      und alles, was auf die alte zeigte, muss auf die neue zeigen. Dafür die
      drei Maps unten. `change.anchorAfterSceneId` ist der stille Fall: er zeigt
      nicht auf das Set, sondern quer auf eine Szene — unbehandelt hinge jeder
      Rollenwechsel der Kopie an der Szene des Originals.
   2. **Alles oder nichts.** Ein halb kopierter Plan wäre schlimmer als keiner,
      deshalb eine Transaktion.

   Zeitstempel werden nicht mitkopiert: die Kopie entsteht jetzt. Deshalb fliegen
   `createdAt`/`updatedAt` je Zeile heraus, damit die Vorgabewerte greifen. Alles
   andere wird gespreizt statt aufgezählt — die Rolle trägt Felder, die das
   Raster noch gar nicht zeigt (Kostüm-, Requisiten-, Continuity-Notizen), und
   eine Aufzählung würde sie beim nächsten neuen Feld still vergessen. */
function withoutMeta<T extends { id: string; createdAt?: string; updatedAt?: string }>(row: T) {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = row;
  return rest;
}

export function duplicateSchedule(scheduleId: string, name: string, scriptRevision?: string) {
  const source = db.select().from(schedules).where(eq(schedules.id, scheduleId)).get();
  if (!source) return null;

  return db.transaction((tx) => {
    const siblings = tx
      .select()
      .from(schedules)
      .where(eq(schedules.projectId, source.projectId))
      .all();

    const [copy] = tx
      .insert(schedules)
      .values({
        id: randomUUID(),
        projectId: source.projectId,
        name,
        // Nicht angegeben heißt: den Stand des Originals übernehmen. Eine Kopie
        // entsteht meist für denselben Stand, und ein leeres Feld wäre ein
        // Verlust gegenüber dem, was dastand.
        scriptRevision: scriptRevision ?? source.scriptRevision,
        sortOrder: siblings.length,
      })
      .returning()
      .all();

    const setRows = tx
      .select()
      .from(sets)
      .where(eq(sets.scheduleId, source.id))
      .orderBy(asc(sets.sortOrder))
      .all();

    const newSetIds = new Map<string, string>();
    const newSceneIds = new Map<string, string>();

    for (const set of setRows) {
      const newSetId = randomUUID();
      newSetIds.set(set.id, newSetId);
      tx.insert(sets)
        .values({ ...withoutMeta(set), id: newSetId, scheduleId: copy.id })
        .run();

      for (const place of tx
        .select()
        .from(setLocations)
        .where(eq(setLocations.setId, set.id))
        .orderBy(asc(setLocations.sortOrder))
        .all()) {
        tx.insert(setLocations)
          .values({ ...withoutMeta(place), id: randomUUID(), setId: newSetId })
          .run();
      }

      for (const scene of tx
        .select()
        .from(scenes)
        .where(eq(scenes.setId, set.id))
        .orderBy(asc(scenes.sortOrder))
        .all()) {
        const newSceneId = randomUUID();
        newSceneIds.set(scene.id, newSceneId);
        tx.insert(scenes)
          .values({ ...withoutMeta(scene), id: newSceneId, setId: newSetId })
          .run();

        for (const role of tx
          .select()
          .from(roles)
          .where(eq(roles.sceneId, scene.id))
          .orderBy(asc(roles.sortOrder))
          .all()) {
          const newRoleId = randomUUID();
          tx.insert(roles)
            .values({ ...withoutMeta(role), id: newRoleId, sceneId: newSceneId })
            .run();

          for (const count of tx
            .select()
            .from(roleCategoryCounts)
            .where(eq(roleCategoryCounts.roleId, role.id))
            .all()) {
            // Die Kategorie bleibt dieselbe: sie gehört dem Projekt, nicht dem
            // Plan, und beide Pläne zählen in dieselben Spalten.
            tx.insert(roleCategoryCounts)
              .values({ ...withoutMeta(count), id: randomUUID(), roleId: newRoleId })
              .run();
          }
        }
      }
    }

    /* Die Rollenwechsel zuletzt, weil sie auf Szenen zeigen, die es erst jetzt
       alle gibt. Hängt einer an einer Szene, die nicht mitkam, bleibt der Anker
       leer statt auf das Original zu zeigen — eine Zeile ohne Platz ist besser
       als eine, die in den fremden Plan greift. */
    for (const set of setRows) {
      for (const change of tx
        .select()
        .from(changes)
        .where(eq(changes.setId, set.id))
        .orderBy(asc(changes.sortOrder))
        .all()) {
        tx.insert(changes)
          .values({
            ...withoutMeta(change),
            id: randomUUID(),
            setId: newSetIds.get(set.id)!,
            anchorAfterSceneId: change.anchorAfterSceneId
              ? (newSceneIds.get(change.anchorAfterSceneId) ?? null)
              : null,
          })
          .run();
      }
    }

    return copy;
  });
}
