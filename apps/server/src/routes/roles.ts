import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { roleCategoryCounts, roles } from "../db/schema.js";
import { reorderRows } from "../services/reorder.js";

export const rolesRouter = Router();

const createSchema = z.object({
  name: z.string().min(1),
  fuzzleId: z.string().optional(),
  description: z.string().optional(),
  costumeMakeupNote: z.string().optional(),
  propsNote: z.string().optional(),
  note: z.string().optional(),
  continuityNote: z.string().optional(),
  genderF: z.number().int().min(0).optional(),
  genderM: z.number().int().min(0).optional(),
  genderD: z.number().int().min(0).optional(),
  ageNote: z.string().optional(),
});
const updateSchema = createSchema.partial();
const reorderSchema = z.object({ ids: z.array(z.string()) });
const countsSchema = z.object({
  counts: z.array(
    z.object({ categoryId: z.string(), count: z.number().int().min(0), isNew: z.boolean().optional() }),
  ),
});

function withCounts(role: typeof roles.$inferSelect) {
  const counts = db
    .select()
    .from(roleCategoryCounts)
    .where(eq(roleCategoryCounts.roleId, role.id))
    .all();
  return { ...role, counts };
}

rolesRouter.get("/scenes/:sceneId/roles", (req, res) => {
  const rows = db
    .select()
    .from(roles)
    .where(eq(roles.sceneId, req.params.sceneId))
    .orderBy(asc(roles.sortOrder))
    .all();
  res.json(rows.map(withCounts));
});

rolesRouter.post("/scenes/:sceneId/roles", (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existing = db.select().from(roles).where(eq(roles.sceneId, req.params.sceneId)).all();

  const [role] = db
    .insert(roles)
    .values({
      id: randomUUID(),
      sceneId: req.params.sceneId,
      ...parsed.data,
      sortOrder: existing.length,
    })
    .returning()
    .all();

  res.status(201).json(withCounts(role));
});

rolesRouter.patch("/roles/:id", (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const [role] = db
    .update(roles)
    .set(parsed.data)
    .where(eq(roles.id, req.params.id))
    .returning()
    .all();

  if (!role) {
    res.status(404).end();
    return;
  }
  res.json(withCounts(role));
});

rolesRouter.delete("/roles/:id", (req, res) => {
  db.delete(roles).where(eq(roles.id, req.params.id)).run();
  res.status(204).end();
});

rolesRouter.post("/scenes/:sceneId/roles/reorder", (req, res) => {
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  reorderRows(roles, roles.id, eq(roles.sceneId, req.params.sceneId), parsed.data.ids, (sortOrder) => ({
    sortOrder,
  }));
  res.status(204).end();
});

rolesRouter.put("/roles/:id/counts", (req, res) => {
  const parsed = countsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  db.transaction((tx) => {
    for (const { categoryId, count, isNew } of parsed.data.counts) {
      const existing = tx
        .select()
        .from(roleCategoryCounts)
        .where(
          and(eq(roleCategoryCounts.roleId, req.params.id), eq(roleCategoryCounts.categoryId, categoryId)),
        )
        .get();

      if (existing) {
        tx.update(roleCategoryCounts)
          .set({ count, ...(isNew !== undefined ? { isNew } : {}) })
          .where(eq(roleCategoryCounts.id, existing.id))
          .run();
      } else {
        tx.insert(roleCategoryCounts)
          .values({ id: randomUUID(), roleId: req.params.id, categoryId, count, isNew: isNew ?? true })
          .run();
      }
    }
  });

  const counts = db
    .select()
    .from(roleCategoryCounts)
    .where(eq(roleCategoryCounts.roleId, req.params.id))
    .all();
  res.json({ counts });
});
