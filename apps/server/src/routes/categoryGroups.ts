import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { categoryGroups } from "../db/schema.js";
import { reorderRows } from "../services/reorder.js";

export const categoryGroupsRouter = Router();

const upsertSchema = z.object({ name: z.string().min(1) });
const reorderSchema = z.object({ ids: z.array(z.string()) });

categoryGroupsRouter.get("/projects/:projectId/category-groups", (req, res) => {
  const rows = db
    .select()
    .from(categoryGroups)
    .where(eq(categoryGroups.projectId, req.params.projectId))
    .orderBy(asc(categoryGroups.sortOrder))
    .all();
  res.json(rows);
});

categoryGroupsRouter.post("/projects/:projectId/category-groups", (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existing = db
    .select()
    .from(categoryGroups)
    .where(eq(categoryGroups.projectId, req.params.projectId))
    .all();

  const [group] = db
    .insert(categoryGroups)
    .values({
      id: randomUUID(),
      projectId: req.params.projectId,
      name: parsed.data.name,
      sortOrder: existing.length,
    })
    .returning()
    .all();

  res.status(201).json(group);
});

categoryGroupsRouter.patch("/category-groups/:id", (req, res) => {
  const parsed = upsertSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const [group] = db
    .update(categoryGroups)
    .set(parsed.data)
    .where(eq(categoryGroups.id, req.params.id))
    .returning()
    .all();

  if (!group) {
    res.status(404).end();
    return;
  }
  res.json(group);
});

categoryGroupsRouter.delete("/category-groups/:id", (req, res) => {
  db.delete(categoryGroups).where(eq(categoryGroups.id, req.params.id)).run();
  res.status(204).end();
});

categoryGroupsRouter.post("/projects/:projectId/category-groups/reorder", (req, res) => {
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  reorderRows(
    categoryGroups,
    categoryGroups.id,
    eq(categoryGroups.projectId, req.params.projectId),
    parsed.data.ids,
    (sortOrder) => ({ sortOrder }),
  );
  res.status(204).end();
});
