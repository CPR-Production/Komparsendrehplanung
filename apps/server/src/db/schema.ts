import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const createdAt = () => text("created_at").notNull().default(sql`(current_timestamp)`);
const timestamps = () => ({
  createdAt: createdAt(),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

export const projects = sqliteTable("project", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  ...timestamps(),
});

export const categoryGroups = sqliteTable("category_group", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

export const categories = sqliteTable("category", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  categoryGroupId: text("category_group_id")
    .notNull()
    .references(() => categoryGroups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
});

/* Ein Projekt hält mehrere Drehpläne — eine Fassung je Drehbuchstand, eine je
   Block, eine zum Durchspielen. Die Ebene sitzt zwischen Projekt und Set:
   Project → Schedule → Set → Scene → Role.

   Kategorien und Farben bleiben beim Projekt. Sie beschreiben, wie die
   Produktion zählt und aussieht, nicht einen einzelnen Plan — zwei Fassungen
   desselben Drehbuchs sollen nicht zwei Kategorielisten pflegen müssen. */
export const schedules = sqliteTable("schedule", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // Der Drehbuchstand, zu dem dieser Plan gehört („Weiß", „Blau vom 3.4."):
  // freier Text, weil jede Produktion ihn anders schreibt.
  scriptRevision: text("script_revision"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps(),
});

// Physical table name avoids the "set" reserved keyword; exported symbol stays `sets`.
export const sets = sqliteTable("shoot_set", {
  id: text("id").primaryKey(),
  /* `project_id` blieb beim Einzug der Drehplan-Ebene stehen, und zwar nicht
     aus Bequemlichkeit: die Spalte wegzunehmen hieße in SQLite, die Tabelle neu
     zu bauen, und der `DROP TABLE` darin löscht über ON DELETE CASCADE jede
     Szene, Rolle, Location und jeden Rollenwechsel mit. Das übliche
     `PRAGMA foreign_keys = OFF` davor hilft nicht — Drizzles Migrator fährt in
     einer Transaktion, und darin ignoriert SQLite das Pragma (nachgemessen).

     Der Server füllt sie weiter aus dem Drehplan, damit sie nicht auseinander
     läuft. Gelesen wird sie nirgends mehr. */
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  /* Nullable, weil `ALTER TABLE ADD COLUMN` mit `REFERENCES` in SQLite einen
     Vorgabewert von NULL verlangt. Die Migration füllt jede Bestandszeile, und
     angelegt wird nie ohne — die Anwendung darf sie als gesetzt lesen. */
  scheduleId: text("schedule_id").references(() => schedules.id, { onDelete: "cascade" }),
  sdNumber: text("sd_number"),
  shootDate: text("shoot_date"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps(),
});

/* Eine Zeile ist ein Motiv ODER eine Location, nicht beides: die beiden Listen
   sind voneinander unabhängig, weil drei Motive an einer einzigen Adresse
   liegen können. Vorher trug jede Zeile ein Paar aus `name` und `address`, was
   genau das verbot — `kind` sagt jetzt, was die Zeile ist, und `name` trägt in
   beiden Fällen den Text. Die Tabelle heißt weiter `shoot_set_location`, wie
   `scene.day_night`: eine Umbenennung wäre eine Migration ohne Gegenwert. */
export const setLocations = sqliteTable("shoot_set_location", {
  id: text("id").primaryKey(),
  setId: text("set_id")
    .notNull()
    .references(() => sets.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  kind: text("kind").notNull().default("motif"),
  name: text("name"),
});

export const scenes = sqliteTable("scene", {
  id: text("id").primaryKey(),
  setId: text("set_id")
    .notNull()
    .references(() => sets.id, { onDelete: "cascade" }),
  sceneNumber: text("scene_number"),
  intExt: text("int_ext"),
  dayNight: text("day_night"),
  scriptTime: text("script_time"),
  endTime: text("end_time"),
  location: text("location"),
  synopsis: text("synopsis"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps(),
});

export const changes = sqliteTable("change", {
  id: text("id").primaryKey(),
  setId: text("set_id")
    .notNull()
    .references(() => sets.id, { onDelete: "cascade" }),
  anchorAfterSceneId: text("anchor_after_scene_id").references(() => scenes.id, { onDelete: "set null" }),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps(),
});

export const roles = sqliteTable("role", {
  id: text("id").primaryKey(),
  sceneId: text("scene_id")
    .notNull()
    .references(() => scenes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  fuzzleId: text("fuzzle_id"),
  description: text("description"),
  costumeMakeupNote: text("costume_makeup_note"),
  propsNote: text("props_note"),
  note: text("note"),
  continuityNote: text("continuity_note"),
  genderF: integer("gender_f").notNull().default(0),
  genderM: integer("gender_m").notNull().default(0),
  genderD: integer("gender_d").notNull().default(0),
  ageNote: text("age_note"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps(),
});

export const roleCategoryCounts = sqliteTable(
  "role_category_count",
  {
    id: text("id").primaryKey(),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    count: integer("count").notNull().default(0),
    isNew: integer("is_new", { mode: "boolean" }).notNull().default(true),
  },
  (table) => ({
    roleCategoryUnique: uniqueIndex("role_category_unique").on(table.roleId, table.categoryId),
  }),
);

export const artists = sqliteTable("artist", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  fuzzleId: text("fuzzle_id"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  ...timestamps(),
});

export const roleAssignments = sqliteTable("role_assignment", {
  id: text("id").primaryKey(),
  roleId: text("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  artistId: text("artist_id")
    .notNull()
    .references(() => artists.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  note: text("note"),
  ...timestamps(),
});

export const changeLinks = sqliteTable("change_link", {
  id: text("id").primaryKey(),
  changeId: text("change_id")
    .notNull()
    .references(() => changes.id, { onDelete: "cascade" }),
  roleAssignmentId: text("role_assignment_id")
    .notNull()
    .references(() => roleAssignments.id, { onDelete: "cascade" }),
});

/* Only the states a project has actually changed are stored; everything else
   falls back to the defaults in @komparsen/shared. That way existing projects
   need no backfill, and a later change to the defaults still reaches everyone
   who never touched them. */
export const sceneColors = sqliteTable(
  "scene_color",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    stateKey: text("state_key").notNull(),
    backgroundColor: text("background_color").notNull(),
    textColor: text("text_color").notNull(),
    ...timestamps(),
  },
  (table) => ({
    projectStateUnique: uniqueIndex("scene_color_project_state_unique").on(
      table.projectId,
      table.stateKey,
    ),
  }),
);

export const translations = sqliteTable(
  "translation",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    locale: text("locale").notNull(),
    value: text("value").notNull(),
  },
  (table) => ({
    keyLocaleUnique: uniqueIndex("translation_key_locale_unique").on(table.key, table.locale),
  }),
);
