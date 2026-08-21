/* Fuzzle colours a Scene by what it shows, not by where it sits in the
   hierarchy: Int, Ext or both, combined with the time of day. That makes
   fifteen states, and each carries a background and a text colour separately.

   The list lives here because three places need the same one: the server
   validates against it, the settings page lists it, and the grid looks up a
   Scene's colour in it. */

export const INT_EXT_VALUES = ["intern", "extern"] as const;
export const TIME_OF_DAY_VALUES = ["tag", "nacht", "morgen", "dim", "abend"] as const;

export type IntExt = (typeof INT_EXT_VALUES)[number];
export type TimeOfDay = (typeof TIME_OF_DAY_VALUES)[number];

// Int and Ext do not exclude each other, so `scene.int_ext` carries one or both
// values separated by ";". Parsing lives next to the colour key so the grid and
// the key derive a Scene's state from exactly the same rule.
export const INT_EXT_SEPARATOR = ";";

/** Reads `scene.int_ext`. Order follows INT_EXT_VALUES rather than the stored
    order, so "extern;intern" and "intern;extern" describe the same state. */
export function parseIntExt(value: string | null | undefined): IntExt[] {
  const parts = (value ?? "").split(INT_EXT_SEPARATOR).map((part) => part.trim());
  return INT_EXT_VALUES.filter((known) => parts.includes(known));
}

/** Builds the value for `scene.int_ext`, normalised the same way. */
export function formatIntExt(values: readonly string[]): string {
  return INT_EXT_VALUES.filter((known) => values.includes(known)).join(INT_EXT_SEPARATOR);
}

/** The state a Scene is in, or null when In/Ex or the time of day is still
    unset — an incomplete Scene has no colour to look up and keeps the neutral
    background.

    The key travels as a URL path segment when a colour is saved, so it must not
    contain "/": In and Ex join with "+", the time of day follows after "-". */
export function sceneColorKey(
  intExt: string | null | undefined,
  dayNight: string | null | undefined,
): string | null {
  const sides = parseIntExt(intExt);
  if (sides.length === 0) return null;

  const time = (dayNight ?? "").trim();
  if (!(TIME_OF_DAY_VALUES as readonly string[]).includes(time)) return null;

  return `${sides.join("+")}-${time}`;
}

export interface SceneColorState {
  key: string;
  intExt: IntExt[];
  timeOfDay: TimeOfDay;
  background: string;
  textColor: string;
}

/* Only four of the fifteen are named in the brief — Int/Night light blue,
   Ext/Day yellow, Ext/Night dark blue, Int+Ext/Night darker still. The rest
   fill in around them: interiors run from white through pale blue into that
   light blue, exteriors from yellow through a dusky grey-blue into dark blue,
   and the combination sits between the two. They are starting points, not
   findings — the whole point of the settings section is that a production
   changes them.

   Text colours are picked to clear WCAG AA against their background, so the
   defaults are readable before anyone touches them. */
const DEFAULTS: Record<string, { background: string; textColor: string }> = {
  "intern-tag": { background: "#ffffff", textColor: "#212529" },
  "intern-nacht": { background: "#9dc3e6", textColor: "#212529" },
  "intern-morgen": { background: "#eef5fc", textColor: "#212529" },
  "intern-dim": { background: "#cfe0f0", textColor: "#212529" },
  "intern-abend": { background: "#b4d1ea", textColor: "#212529" },

  "extern-tag": { background: "#ffe14d", textColor: "#212529" },
  "extern-nacht": { background: "#2e5c8a", textColor: "#ffffff" },
  "extern-morgen": { background: "#fff3b0", textColor: "#212529" },
  "extern-dim": { background: "#9fb3c4", textColor: "#212529" },
  "extern-abend": { background: "#6d94b8", textColor: "#212529" },

  "intern+extern-tag": { background: "#f2e6a0", textColor: "#212529" },
  "intern+extern-nacht": { background: "#1f3d66", textColor: "#ffffff" },
  "intern+extern-morgen": { background: "#f4f0d8", textColor: "#212529" },
  "intern+extern-dim": { background: "#b7bfc9", textColor: "#212529" },
  "intern+extern-abend": { background: "#4a6f95", textColor: "#ffffff" },
};

// Int, then Ext, then both — the row order of the table in the brief. Within a
// row the times of day keep the order of TIME_OF_DAY_VALUES, which is the one
// the Auswahlliste in the grid uses.
const INT_EXT_COMBINATIONS: IntExt[][] = [["intern"], ["extern"], ["intern", "extern"]];

export const SCENE_COLOR_STATES: SceneColorState[] = INT_EXT_COMBINATIONS.flatMap((sides) =>
  TIME_OF_DAY_VALUES.map((timeOfDay) => {
    const key = `${sides.join("+")}-${timeOfDay}`;
    return { key, intExt: sides, timeOfDay, ...DEFAULTS[key] };
  }),
);

export const SCENE_COLOR_KEYS: string[] = SCENE_COLOR_STATES.map((state) => state.key);

/** WCAG relative luminance of a "#rrggbb" colour. */
export function relativeLuminance(hex: string): number {
  const value = hex.replace("#", "");
  const channel = (index: number) => {
    const raw = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16) / 255;
    return raw <= 0.04045 ? raw / 12.92 : ((raw + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

/** WCAG contrast ratio between two "#rrggbb" colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Whether a background is dark enough that the controls sitting on it can no
    longer keep their own fixed colours — the red delete ×, the grey drag handle,
    the dark button outlines all disappear against a night blue. On anything
    lighter they read fine and are left alone. */
export function isDarkColor(hex: string): boolean {
  return relativeLuminance(hex) < 0.35;
}

/** Hex colours only, and always six digits — the settings page stores what a
    native colour input produces, and the grid drops the value straight into a
    style attribute. */
export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
