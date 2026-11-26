import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { schedules } from "../db/schema.js";

export const schedulesRouter = Router();

const createSchema = z.object({
  name: z.string().min(1),
  // Der Drehbuchstand ist freier Text — jede Produktion schreibt ihn anders
  // („Weiß", „Blau 03.04.", „v2").
  scriptRevision: z.string().optional(),
});
const updateSchema = createSchema.partial();

schedulesRouter.get("/projects/:projectId/schedules", (req, res) => {
  const rows = db
    .select()
    .from(schedules)
    .where(eq(schedules.projectId, req.params.projectId))
    .orderBy(asc(schedules.sortOrder))
    .all();
  res.json(rows);
});

schedulesRouter.get("/schedules/:id", (req, res) => {
  const schedule = db.select().from(schedules).where(eq(schedules.id, req.params.id)).get();
  if (!schedule) {
    res.status(404).end();
    return;
  }
  res.json(schedule);
});

schedulesRouter.post("/projects/:projectId/schedules", (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existing = db
    .select()
    .from(schedules)
    .where(eq(schedules.projectId, req.params.projectId))
    .all();

  const [schedule] = db
    .insert(schedules)
    .values({
      id: randomUUID(),
      projectId: req.params.projectId,
      ...parsed.data,
      sortOrder: existing.length,
    })
    .returning()
    .all();

  res.status(201).json(schedule);
});

schedulesRouter.patch("/schedules/:id", (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const [schedule] = db
    .update(schedules)
    .set(parsed.data)
    .where(eq(schedules.id, req.params.id))
    .returning()
    .all();

  if (!schedule) {
    res.status(404).end();
    return;
  }
  res.json(schedule);
});

// Kaskadiert bis in die Zählungen: Sets, Szenen, Rollen, alles darunter. Die
// Oberfläche fragt deshalb nach und gibt die Zahl der Drehtage dazu.
schedulesRouter.delete("/schedules/:id", (req, res) => {
  db.delete(schedules).where(eq(schedules.id, req.params.id)).run();
  res.status(204).end();
});
