import { randomUUID } from "node:crypto";
import { COLOR_TARGETS, HEX_COLOR_PATTERN } from "@komparsen/shared";
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

// The set of targets is fixed by the domain, not by the caller. An unknown key
// would sit in the table forever without ever being read back.
function knownTarget(key: string) {
  return COLOR_TARGETS.find((target) => target.key === key);
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

  // Only the key and the two colours go over the wire: labels and grouping come
  // from the same shared list on the other side, so repeating them here would
  // just be a second version of the truth.
  res.json(
    COLOR_TARGETS.map((target) => {
      const override = stored.get(target.key);
      return {
        key: target.key,
        backgroundColor: override?.backgroundColor ?? target.background,
        textColor: override?.textColor ?? target.textColor,
        isCustom: !!override,
      };
    }),
  );
});

sceneColorsRouter.put("/projects/:projectId/scene-colors/:stateKey", (req, res) => {
  const target = knownTarget(req.params.stateKey);
  if (!target) {
    res.status(404).json({ error: "unknown color target" });
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
      stateKey: target.key,
      ...parsed.data,
    })
    .onConflictDoUpdate({
      target: [sceneColors.projectId, sceneColors.stateKey],
      set: { ...parsed.data, updatedAt: sql`(current_timestamp)` },
    })
    .returning()
    .all();

  res.json({
    key: row.stateKey,
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
