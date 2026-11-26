import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { categories, categoryGroups, projects, schedules, sets } from "../db/schema.js";
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

/* Vollständige Ausgabe des Projekts: jeder Drehplan mit seinen Sets, jedes Set
   mit Szenen, Rollen und Zählungen (siehe services/hydrate.ts). Seit der
   Drehplan-Ebene hängen die Sets eine Stufe tiefer — die Form bildet das ab,
   statt alle Sets des Projekts in einen Topf zu werfen. */
projectsRouter.get("/projects/:id/full", (req, res) => {
  const project = db.select().from(projects).where(eq(projects.id, req.params.id)).get();
  if (!project) {
    res.status(404).end();
    return;
  }

  const scheduleRows = db
    .select()
    .from(schedules)
    .where(eq(schedules.projectId, project.id))
    .orderBy(asc(schedules.sortOrder))
    .all();

  const hydratedSchedules = scheduleRows.map((schedule) => {
    const setRows = db
      .select()
      .from(sets)
      .where(eq(sets.scheduleId, schedule.id))
      .orderBy(asc(sets.sortOrder))
      .all();
    return { ...schedule, sets: setRows.map((set) => hydrateSet(set.id)!) };
  });

  res.json({ ...project, schedules: hydratedSchedules });
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
  /* Wie die Standardkategorien: ein frisches Projekt soll nicht mit einer
     leeren Mappenliste beginnen, durch die man sich erst klicken muss. Der Name
     ist ein Anfang und umbenennbar — derselbe, den die Migration den
     Bestandsprojekten gegeben hat. */
  db.insert(schedules)
    .values({ id: randomUUID(), projectId: project.id, name: "Drehplan 1", sortOrder: 0 })
    .run();

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
