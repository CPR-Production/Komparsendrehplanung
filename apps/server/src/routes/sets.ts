import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { schedules, sets } from "../db/schema.js";
import { hydrateSet } from "../services/hydrate.js";
import { reorderRows } from "../services/reorder.js";

export const setsRouter = Router();

const createSchema = z.object({
  sdNumber: z.string().optional(),
  shootDate: z.string().optional(),
});
const updateSchema = createSchema.partial();
const reorderSchema = z.object({ ids: z.array(z.string()) });

// Ein Set hängt am Drehplan, nicht mehr am Projekt — das Projekt erreicht es
// nur noch über den Plan.
setsRouter.get("/schedules/:scheduleId/sets", (req, res) => {
  const rows = db
    .select()
    .from(sets)
    .where(eq(sets.scheduleId, req.params.scheduleId))
    .orderBy(asc(sets.sortOrder))
    .all();
  res.json(rows);
});

setsRouter.post("/schedules/:scheduleId/sets", (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  // `shoot_set.project_id` lässt sich nicht entfernen, ohne die Tabelle neu zu
  // bauen (siehe schema.ts), und die Spalte ist NOT NULL. Also wird sie aus dem
  // Drehplan gefüllt, damit sie nicht von ihm abweicht.
  const schedule = db
    .select()
    .from(schedules)
    .where(eq(schedules.id, req.params.scheduleId))
    .get();
  if (!schedule) {
    res.status(404).end();
    return;
  }

  const existing = db.select().from(sets).where(eq(sets.scheduleId, schedule.id)).all();

  const [set] = db
    .insert(sets)
    .values({
      id: randomUUID(),
      projectId: schedule.projectId,
      scheduleId: schedule.id,
      ...parsed.data,
      sortOrder: existing.length,
    })
    .returning()
    .all();

  res.status(201).json(set);
});

setsRouter.patch("/sets/:id", (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const [set] = db
    .update(sets)
    .set(parsed.data)
    .where(eq(sets.id, req.params.id))
    .returning()
    .all();

  if (!set) {
    res.status(404).end();
    return;
  }
  res.json(set);
});

setsRouter.delete("/sets/:id", (req, res) => {
  db.delete(sets).where(eq(sets.id, req.params.id)).run();
  res.status(204).end();
});

setsRouter.post("/schedules/:scheduleId/sets/reorder", (req, res) => {
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  reorderRows(
    sets,
    sets.id,
    eq(sets.scheduleId, req.params.scheduleId),
    parsed.data.ids,
    (sortOrder) => ({ sortOrder }),
  );
  res.status(204).end();
});

// Full hydration for the schedule workspace: one Set with its Scenes, each
// Scene with its Roles, each Role with its category counts.
setsRouter.get("/sets/:id/full", (req, res) => {
  const full = hydrateSet(req.params.id);
  if (!full) {
    res.status(404).end();
    return;
  }
  res.json(full);
});
