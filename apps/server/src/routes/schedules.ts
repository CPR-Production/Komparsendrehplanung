import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { schedules, sets } from "../db/schema.js";
import { duplicateSchedule } from "../services/duplicateSchedule.js";

export const schedulesRouter = Router();

const createSchema = z.object({
  name: z.string().min(1),
  // Der Drehbuchstand ist freier Text — jede Produktion schreibt ihn anders
  // („Weiß", „Blau 03.04.", „v2").
  scriptRevision: z.string().optional(),
});
const updateSchema = createSchema.partial();
const duplicateBodySchema = z.object({
  name: z.string().min(1),
  scriptRevision: z.string().optional(),
});

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

/* Kopiert den Plan samt allem, was darunter hängt (siehe
   services/duplicateSchedule.ts). Den Namen gibt der Client vor: er allein
   kennt die Sprache der Oberfläche, und „(Kopie)" ist Oberfläche. Ohne Angabe
   erbt die Kopie den Drehbuchstand des Originals. */
schedulesRouter.post("/schedules/:id/duplicate", (req, res) => {
  const parsed = duplicateBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const copy = duplicateSchedule(req.params.id, parsed.data.name, parsed.data.scriptRevision);
  if (!copy) {
    res.status(404).end();
    return;
  }
  res.status(201).json(copy);
});

/* Die Sets zuerst, dann der Plan — und beides in einer Transaktion.

   Nicht aus Vorsicht, sondern weil es anders gar nicht geht: `schedule_id`
   trägt in der Datenbank **keine** Kaskade (siehe schema.ts), ein Plan mit
   Drehtagen ließe sich also nicht löschen und der Server antwortete mit
   „FOREIGN KEY constraint failed". Von den Sets abwärts greifen die Kaskaden
   wieder, die bei `CREATE TABLE` entstanden sind: Szenen, Rollen, Zählungen,
   Motive, Locations und Rollenwechsel gehen von selbst mit.

   Die Oberfläche fragt vorher nach und benennt die Folge. */
schedulesRouter.delete("/schedules/:id", (req, res) => {
  db.transaction((tx) => {
    tx.delete(sets).where(eq(sets.scheduleId, req.params.id)).run();
    tx.delete(schedules).where(eq(schedules.id, req.params.id)).run();
  });
  res.status(204).end();
});
