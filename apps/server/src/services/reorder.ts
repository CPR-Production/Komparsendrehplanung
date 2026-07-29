import { and, eq, type SQL } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import { db } from "../db/client.js";

export function reorderRows<TSet extends Record<string, unknown>>(
  table: SQLiteTable,
  idColumn: SQLiteColumn,
  scopeFilter: SQL,
  orderedIds: string[],
  buildSet: (index: number) => TSet,
) {
  db.transaction((tx) => {
    orderedIds.forEach((id, index) => {
      tx.update(table)
        .set(buildSet(index))
        .where(and(eq(idColumn, id), scopeFilter))
        .run();
    });
  });
}
