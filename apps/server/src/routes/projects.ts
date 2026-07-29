import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { categories, categoryGroups, projects, sets } from "../db/schema.js";
import { hydrateSet } from "../services/hydrate.js";

export const projectsRouter = Router();

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
});
const updateSchema = createSchema.partial();

// Ships as a ready-to-use default so nobody has to recreate it per project;
// still fully editable afterwards via the category settings page.
const DEFAULT_CATEGORY_NAMES = ["normal", "special", "Feat.", "KD", "Double"];

function seedDefaultCategories(projectId: string) {
  const [group] = db
    .insert(categoryGroups)
    .values({ id: randomUUID(), projectId, name: "Supporting artists", sortOrder: 0 })
    .returning()
    .all();

  DEFAULT_CATEGORY_NAMES.forEach((name, index) => {
    db.insert(categories)
      .values({
        id: randomUUID(),
        projectId,
        categoryGroupId: group.id,
        name,
        isDefault: true,
        sortOrder: index,
      })
      .run();
  });
}

projectsRouter.get("/projects", (_req, res) => {
  res.json(db.select().from(projects).all());
});

projectsRouter.get("/projects/:id", (req, res) => {
  const project = db.select().from(projects).where(eq(projects.id, req.params.id)).get();
  if (!project) {
    res.status(404).end();
    return;
  }
  res.json(project);
});

// Full hydration for the schedule workspace: every Set of the project, each
// fully hydrated with its Scenes/Roles/counts (see services/hydrate.ts).
projectsRouter.get("/projects/:id/full", (req, res) => {
  const project = db.select().from(projects).where(eq(projects.id, req.params.id)).get();
  if (!project) {
    res.status(404).end();
    return;
  }

  const setRows = db
    .select()
    .from(sets)
    .where(eq(sets.projectId, project.id))
    .orderBy(asc(sets.sortOrder))
    .all();

  const hydratedSets = setRows.map((set) => hydrateSet(set.id)!);
  res.json({ ...project, sets: hydratedSets });
});

projectsRouter.post("/projects", (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const [project] = db
    .insert(projects)
    .values({ id: randomUUID(), name: parsed.data.name, code: parsed.data.code })
    .returning()
    .all();

  seedDefaultCategories(project.id);

  res.status(201).json(project);
});

projectsRouter.patch("/projects/:id", (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const [project] = db
    .update(projects)
    .set(parsed.data)
    .where(eq(projects.id, req.params.id))
    .returning()
    .all();

  if (!project) {
    res.status(404).end();
    return;
  }
  res.json(project);
});

projectsRouter.delete("/projects/:id", (req, res) => {
  db.delete(projects).where(eq(projects.id, req.params.id)).run();
  res.status(204).end();
});
