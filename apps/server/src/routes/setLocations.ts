import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { setLocations } from "../db/schema.js";

export const setLocationsRouter = Router();

const upsertSchema = z.object({ name: z.string().optional(), address: z.string().optional() });

setLocationsRouter.get("/sets/:setId/locations", (req, res) => {
  const rows = db
    .select()
    .from(setLocations)
    .where(eq(setLocations.setId, req.params.setId))
    .orderBy(asc(setLocations.sortOrder))
    .all();
  res.json(rows);
});

setLocationsRouter.post("/sets/:setId/locations", (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existing = db
    .select()
    .from(setLocations)
    .where(eq(setLocations.setId, req.params.setId))
    .all();

  const [location] = db
    .insert(setLocations)
    .values({
      id: randomUUID(),
      setId: req.params.setId,
      ...parsed.data,
      sortOrder: existing.length,
    })
    .returning()
    .all();

  res.status(201).json(location);
});

setLocationsRouter.patch("/set-locations/:id", (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const [location] = db
    .update(setLocations)
    .set(parsed.data)
    .where(eq(setLocations.id, req.params.id))
    .returning()
    .all();

  if (!location) {
    res.status(404).end();
    return;
  }
  res.json(location);
});

setLocationsRouter.delete("/set-locations/:id", (req, res) => {
  db.delete(setLocations).where(eq(setLocations.id, req.params.id)).run();
  res.status(204).end();
});
