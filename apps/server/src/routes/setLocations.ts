import { randomUUID } from "node:crypto";
import { SET_PLACE_KINDS } from "@komparsen/shared";
import { and, asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { setLocations } from "../db/schema.js";

export const setLocationsRouter = Router();

// Zwei Listen in einer Tabelle: `kind` entscheidet, in welche die Zeile
// gehört, `name` trägt in beiden den Text. Geprüft wird gegen die Liste aus
// @komparsen/shared, dieselbe, aus der das Grid seine beiden Zeilen baut.
const createSchema = z.object({
  kind: z.enum(SET_PLACE_KINDS).default("motif"),
  name: z.string().optional(),
});

const updateSchema = z.object({ name: z.string().optional() });

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
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  /* Die Reihenfolge zählt je Liste: ein zweites Motiv steht hinter dem ersten
     Motiv, nicht hinter der letzten Location.

     Hinter den höchsten bisherigen Wert, nicht auf die Anzahl der Zeilen: nach
     einem Löschen ist die Anzahl wieder kleiner als ein schon vergebener Wert,
     und der neue Eintrag bekäme dieselbe Position wie ein bestehender — welcher
     der beiden dann zuerst steht, entscheidet nichts mehr. */
  const existing = db
    .select()
    .from(setLocations)
    .where(
      and(eq(setLocations.setId, req.params.setId), eq(setLocations.kind, parsed.data.kind)),
    )
    .all();
  const nextSortOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0);

  const [location] = db
    .insert(setLocations)
    .values({
      id: randomUUID(),
      setId: req.params.setId,
      ...parsed.data,
      sortOrder: nextSortOrder,
    })
    .returning()
    .all();

  res.status(201).json(location);
});

// Die Art einer Zeile ändert sich nie — ein Motiv wird nicht zur Location.
// Deshalb nimmt PATCH nur den Text entgegen.
setLocationsRouter.patch("/set-locations/:id", (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
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
