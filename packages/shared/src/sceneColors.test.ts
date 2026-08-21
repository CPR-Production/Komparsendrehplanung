import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  formatIntExt,
  HEX_COLOR_PATTERN,
  isDarkColor,
  parseIntExt,
  COLOR_TARGET_KEYS,
  COLOR_TARGETS,
  SCENE_COLOR_STATES,
  sceneColorKey,
} from "./sceneColors.js";

describe("parseIntExt", () => {
  it("reads a single value", () => {
    expect(parseIntExt("intern")).toEqual(["intern"]);
  });

  it("reads both values", () => {
    expect(parseIntExt("intern;extern")).toEqual(["intern", "extern"]);
  });

  // The stored order depends on which box was ticked first; the state must not.
  it("normalises the order", () => {
    expect(parseIntExt("extern;intern")).toEqual(["intern", "extern"]);
  });

  it("ignores blanks and unknown values", () => {
    expect(parseIntExt(" intern ; ; unsinn ")).toEqual(["intern"]);
    expect(parseIntExt("")).toEqual([]);
    expect(parseIntExt(null)).toEqual([]);
  });
});

describe("formatIntExt", () => {
  it("round-trips through parseIntExt", () => {
    expect(formatIntExt(parseIntExt("extern;intern"))).toBe("intern;extern");
  });

  it("drops values that are not In or Ex", () => {
    expect(formatIntExt(["extern", "unsinn"])).toBe("extern");
  });
});

describe("sceneColorKey", () => {
  it("combines In/Ex with the time of day", () => {
    expect(sceneColorKey("intern", "nacht")).toBe("intern-nacht");
    expect(sceneColorKey("extern", "tag")).toBe("extern-tag");
  });

  it("joins the combination with a plus", () => {
    expect(sceneColorKey("intern;extern", "dim")).toBe("intern+extern-dim");
    expect(sceneColorKey("extern;intern", "dim")).toBe("intern+extern-dim");
  });

  // A half-filled Scene has nothing to colour by and keeps the neutral cell.
  it("is null while In/Ex or the time of day is missing", () => {
    expect(sceneColorKey(null, "tag")).toBeNull();
    expect(sceneColorKey("", "tag")).toBeNull();
    expect(sceneColorKey("intern", null)).toBeNull();
    expect(sceneColorKey("intern", "")).toBeNull();
  });

  it("is null for a time of day outside the list", () => {
    expect(sceneColorKey("intern", "mittag")).toBeNull();
  });

  it("only produces keys that exist in the target list", () => {
    for (const intExt of ["intern", "extern", "intern;extern"]) {
      for (const time of ["tag", "nacht", "morgen", "dim", "abend"]) {
        expect(COLOR_TARGET_KEYS).toContain(sceneColorKey(intExt, time));
      }
    }
  });
});

describe("COLOR_TARGETS", () => {
  it("covers every combination once, plus the frame colours", () => {
    expect(SCENE_COLOR_STATES).toHaveLength(15);
    expect(COLOR_TARGETS).toHaveLength(19);
    expect(new Set(COLOR_TARGET_KEYS).size).toBe(19);
  });

  // The frame is what a reader looks at first, so it is what the settings page
  // has to offer first.
  it("puts the frame ahead of the states", () => {
    expect(COLOR_TARGETS.slice(0, 4).map((t) => t.key)).toEqual(["header", "set", "role", "count"]);
  });

  // A missing default would reach the grid as `undefined` in a style attribute.
  it("gives every target both colours", () => {
    for (const target of COLOR_TARGETS) {
      expect(target.background).toMatch(HEX_COLOR_PATTERN);
      expect(target.textColor).toMatch(HEX_COLOR_PATTERN);
    }
  });
});

describe("isDarkColor", () => {
  it("calls the night blues dark", () => {
    expect(isDarkColor("#1f3d66")).toBe(true);
    expect(isDarkColor("#2e5c8a")).toBe(true);
    expect(isDarkColor("#000000")).toBe(true);
  });

  it("leaves the light defaults alone", () => {
    expect(isDarkColor("#ffffff")).toBe(false);
    expect(isDarkColor("#ffe14d")).toBe(false);
    expect(isDarkColor("#9dc3e6")).toBe(false);
  });

  // isDarkColor asks whether the fixed-colour controls still read on a
  // background, which is a lower bar than whether the text does — a mid blue can
  // be "dark" for the red × and still carry dark text comfortably.
  it("is about the controls, not about which text colour was chosen", () => {
    expect(isDarkColor("#6d94b8")).toBe(true);
    expect(contrastRatio("#6d94b8", "#212529")).toBeGreaterThan(4.5);
  });
});

describe("the default palette", () => {
  // The defaults ship before anyone opens the settings, so every pairing has to
  // be readable as delivered. AA for normal text is 4.5:1.
  it("clears WCAG AA on every target", () => {
    for (const target of COLOR_TARGETS) {
      expect(contrastRatio(target.background, target.textColor)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
