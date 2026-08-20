import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { databasePath, migrationsDir, nativeBindingPath } from "../paths.js";
import * as schema from "./schema.js";

mkdirSync(dirname(databasePath), { recursive: true });

// better-sqlite3 sucht sein Addon sonst über `bindings` im Dateibaum des
// Pakets — den es im gebündelten Release nicht gibt. Das geladene Modul selbst
// durchzureichen ist der dafür vorgesehene Weg; createRequire hängt am
// Programmpfad, weil das require() der SEA-Runtime nur Builtins kennt.
function loadNativeBinding(): object | undefined {
  if (!nativeBindingPath) return undefined;
  return createRequire(process.execPath)(nativeBindingPath) as object;
}

// Die Typen kennen nur den String-Pfad, die Laufzeit nimmt aber auch das
// fertig geladene Addon entgegen. Der String-Weg wäre hier wirkungslos: er
// löst intern genau das require() aus, das in der SEA-Runtime scheitert.
const nativeBinding = loadNativeBinding() as unknown as string | undefined;
const sqlite = nativeBinding
  ? new Database(databasePath, { nativeBinding })
  : new Database(databasePath);

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export function runMigrations() {
  migrate(db, { migrationsFolder: migrationsDir });
}
