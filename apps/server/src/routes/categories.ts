import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { categories, categoryGroups } from "../db/schema.js";
import { reorderRows } from "../services/reorder.js";

export const categoriesRouter = Router();

const createSchema = z.object({ name: z.string().min(1), isDefault: z.boolean().optional() });
const updateSchema = createSchema.partial();
const reorderSchema = z.object({ ids: z.array(z.string()) });

categoriesRouter.get("/projects/:projectId/categories", (req, res) => {
  const rows = db
    .select({
      id: categories.id,
      categoryGroupId: categories.categoryGroupId,
      name: categories.name,
      sortOrder: categories.sortOrder,
      isDefault: categories.isDefault,
      groupSortOrder: categoryGroups.sortOrder,
      groupName: categoryGroups.name,
    })
    .from(categories)
    .innerJoin(categoryGroups, eq(categories.categoryGroupId, categoryGroups.id))
    .where(eq(categories.projectId, req.params.projectId))
    .all();

  rows.sort((a, b) => a.groupSortOrder - b.groupSortOrder || a.sortOrder - b.sortOrder);
  res.json(rows);
});

categoriesRouter.get("/category-groups/:groupId/categories", (req, res) => {
  const rows = db
    .select()
    .from(categories)
    .where(eq(categories.categoryGroupId, req.params.groupId))
    .orderBy(asc(categories.sortOrder))
    .all();
  res.json(rows);
});

categoriesRouter.post("/category-groups/:groupId/categories", (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const group = db
    .select()
    .from(categoryGroups)
    .where(eq(categoryGroups.id, req.params.groupId))
    .get();
  if (!group) {
    res.status(404).json({ error: "category group not found" });
    return;
  }

  const existing = db
    .select()
    .from(categories)
    .where(eq(categories.categoryGroupId, req.params.groupId))
    .all();

  const [category] = db
    .insert(categories)
    .values({
      id: randomUUID(),
      projectId: group.projectId,
      categoryGroupId: req.params.groupId,
      name: parsed.data.name,
      isDefault: parsed.data.isDefault ?? false,
      sortOrder: existing.length,
    })
    .returning()
    .all();

  res.status(201).json(category);
});

categoriesRouter.patch("/categories/:id", (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const [category] = db
    .update(categories)
    .set(parsed.data)
    .where(eq(categories.id, req.params.id))
    .returning()
    .all();

  if (!category) {
    res.status(404).end();
    return;
  }
  res.json(category);
});

categoriesRouter.delete("/categories/:id", (req, res) => {
  db.delete(categories).where(eq(categories.id, req.params.id)).run();
  res.status(204).end();
});

categoriesRouter.post("/category-groups/:groupId/categories/reorder", (req, res) => {
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  reorderRows(
    categories,
    categories.id,
    eq(categories.categoryGroupId, req.params.groupId),
    parsed.data.ids,
    (sortOrder) => ({ sortOrder }),
  );
  res.status(204).end();
});
