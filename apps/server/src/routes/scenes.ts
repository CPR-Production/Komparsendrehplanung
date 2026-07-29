import { randomUUID } from "node:crypto";
import { and, asc, eq, isNotNull, ne } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { scenes, sets } from "../db/schema.js";
import { reorderRows } from "../services/reorder.js";

export const scenesRouter = Router();

const createSchema = z.object({
  sceneNumber: z.string().optional(),
  intExt: z.string().optional(),
  dayNight: z.string().optional(),
  scriptTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  synopsis: z.string().optional(),
});
const updateSchema = createSchema.partial();
const reorderSchema = z.object({ ids: z.array(z.string()) });

// Distinct, non-empty scene locations across the whole project — used to
// power the location autocomplete suggestions in the schedule grid.
scenesRouter.get("/projects/:projectId/scene-locations", (req, res) => {
  const rows = db
    .select({ location: scenes.location })
    .from(scenes)
    .innerJoin(sets, eq(scenes.setId, sets.id))
    .where(
      and(eq(sets.projectId, req.params.projectId), isNotNull(scenes.location), ne(scenes.location, "")),
    )
    .all();

  res.json([...new Set(rows.map((r) => r.location as string))]);
});

scenesRouter.get("/sets/:setId/scenes", (req, res) => {
  const rows = db
    .select()
    .from(scenes)
    .where(eq(scenes.setId, req.params.setId))
    .orderBy(asc(scenes.sortOrder))
    .all();
  res.json(rows);
});

scenesRouter.post("/sets/:setId/scenes", (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existing = db.select().from(scenes).where(eq(scenes.setId, req.params.setId)).all();

  const [scene] = db
    .insert(scenes)
    .values({
      id: randomUUID(),
      setId: req.params.setId,
      ...parsed.data,
      sortOrder: existing.length,
    })
    .returning()
    .all();

  res.status(201).json(scene);
});

scenesRouter.patch("/scenes/:id", (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const [scene] = db
    .update(scenes)
    .set(parsed.data)
    .where(eq(scenes.id, req.params.id))
    .returning()
    .all();

  if (!scene) {
    res.status(404).end();
    return;
  }
  res.json(scene);
});

scenesRouter.delete("/scenes/:id", (req, res) => {
  db.delete(scenes).where(eq(scenes.id, req.params.id)).run();
  res.status(204).end();
});

scenesRouter.post("/sets/:setId/scenes/reorder", (req, res) => {
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  reorderRows(scenes, scenes.id, eq(scenes.setId, req.params.setId), parsed.data.ids, (sortOrder) => ({
    sortOrder,
  }));
  res.status(204).end();
});
