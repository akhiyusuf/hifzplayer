import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLUS_EXPLAIN } from "./billing/gates.ts";
import {
  DEFAULT_PALETTE,
  PALETTE_IDS,
  PALETTES,
  isPaletteId,
  parsePalette,
} from "./palettes.ts";

describe("colour palettes", () => {
  it("ships orange, green, black and white, pink, and gold", () => {
    assert.deepEqual([...PALETTE_IDS], ["orange", "green", "ink", "pink", "gold"]);
    assert.equal(DEFAULT_PALETTE, "orange");
    assert.equal(PALETTES.length, 5);
    assert.equal(
      PALETTES.every((palette) => PALETTE_IDS.includes(palette.id)),
      true,
    );
  });

  it("accepts only the five ids", () => {
    assert.equal(isPaletteId("orange"), true);
    assert.equal(isPaletteId("green"), true);
    assert.equal(isPaletteId("ink"), true);
    assert.equal(isPaletteId("pink"), true);
    assert.equal(isPaletteId("gold"), true);
    assert.equal(isPaletteId("blue"), false);
    assert.equal(isPaletteId(""), false);
    assert.equal(isPaletteId(null), false);
  });

  it("falls back to orange when the stored value is unknown", () => {
    assert.equal(parsePalette("green"), "green");
    assert.equal(parsePalette("navy"), "orange");
    assert.equal(parsePalette(undefined), "orange");
    assert.equal(parsePalette('"gold"'), "orange");
  });
});

describe("colour themes stay free", () => {
  it("lists colour themes on the always-free side of Plus copy", () => {
    assert.equal(
      PLUS_EXPLAIN.free.some((line) => /colour themes/i.test(line)),
      true,
    );
    assert.equal(
      PLUS_EXPLAIN.plus.some((line) => /theme|palette|colour/i.test(line)),
      false,
    );
  });
});
