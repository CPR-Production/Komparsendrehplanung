import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { changes, scenes } from "../db/schema.js";

export const changesRouter = Router();

const createSchema = z.object({ description: z.string().optional() });
const updateSchema = createSchema.partial();

changesRouter.post("/scenes/:sceneId/changes", (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const scene = db.select().from(scenes).where(eq(scenes.id, req.params.sceneId)).get();
  if (!scene) {
    res.status(404).end();
    return;
  }

  const existing = db.select().from(changes).where(eq(changes.setId, scene.setId)).all();

  const [change] = db
    .insert(changes)
    .values({
      id: randomUUID(),
      setId: scene.setId,
      anchorAfterSceneId: scene.id,
      ...parsed.data,
      sortOrder: existing.length,
    })
    .returning()
    .all();

  res.status(201).json(change);
});

changesRouter.patch("/changes/:id", (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const [change] = db
    .update(changes)
    .set(parsed.data)
    .where(eq(changes.id, req.params.id))
    .returning()
    .all();

  if (!change) {
    res.status(404).end();
    return;
  }
  res.json(change);
});

changesRouter.delete("/changes/:id", (req, res) => {
  db.delete(changes).where(eq(changes.id, req.params.id)).run();
  res.status(204).end();
});
