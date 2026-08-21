import { randomUUID } from "node:crypto";
import { HEX_COLOR_PATTERN, SCENE_COLOR_STATES } from "@komparsen/shared";
import { and, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { sceneColors } from "../db/schema.js";

export const sceneColorsRouter = Router();

const colorSchema = z.object({
  backgroundColor: z.string().regex(HEX_COLOR_PATTERN),
  textColor: z.string().regex(HEX_COLOR_PATTERN),
});

// The set of states is fixed by the domain, not by the caller. An unknown key
// would sit in the table forever without ever being read back.
function knownState(key: string) {
  return SCENE_COLOR_STATES.find((state) => state.key === key);
}

// Defaults first, the project's overrides on top. A project only stores what it
// actually changed, so this is the only place that knows both halves.
sceneColorsRouter.get("/projects/:projectId/scene-colors", (req, res) => {
  const stored = new Map(
    db
      .select()
      .from(sceneColors)
      .where(eq(sceneColors.projectId, req.params.projectId))
      .all()
      .map((row) => [row.stateKey, row] as const),
  );

  res.json(
    SCENE_COLOR_STATES.map((state) => {
      const override = stored.get(state.key);
      return {
        stateKey: state.key,
        intExt: state.intExt,
        timeOfDay: state.timeOfDay,
        backgroundColor: override?.backgroundColor ?? state.background,
        textColor: override?.textColor ?? state.textColor,
        isCustom: !!override,
      };
    }),
  );
});

sceneColorsRouter.put("/projects/:projectId/scene-colors/:stateKey", (req, res) => {
  const state = knownState(req.params.stateKey);
  if (!state) {
    res.status(404).json({ error: "unknown scene color state" });
    return;
  }

  const parsed = colorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const [row] = db
    .insert(sceneColors)
    .values({
      id: randomUUID(),
      projectId: req.params.projectId,
      stateKey: state.key,
      ...parsed.data,
    })
    .onConflictDoUpdate({
      target: [sceneColors.projectId, sceneColors.stateKey],
      set: { ...parsed.data, updatedAt: sql`(current_timestamp)` },
    })
    .returning()
    .all();

  res.json({
    stateKey: row.stateKey,
    intExt: state.intExt,
    timeOfDay: state.timeOfDay,
    backgroundColor: row.backgroundColor,
    textColor: row.textColor,
    isCustom: true,
  });
});

// Resetting is a delete, not a write of the default value: that way the state
// keeps following the defaults if those ever change.
sceneColorsRouter.delete("/projects/:projectId/scene-colors/:stateKey", (req, res) => {
  db.delete(sceneColors)
    .where(
      and(
        eq(sceneColors.projectId, req.params.projectId),
        eq(sceneColors.stateKey, req.params.stateKey),
      ),
    )
    .run();
  res.status(204).end();
});

sceneColorsRouter.delete("/projects/:projectId/scene-colors", (req, res) => {
  db.delete(sceneColors).where(eq(sceneColors.projectId, req.params.projectId)).run();
  res.status(204).end();
});
