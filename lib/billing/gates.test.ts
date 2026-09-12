import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PLUS_EXPLAIN,
  clampRepeat,
  isPaidRelay,
  isPaidRepeat,
  qariCount,
} from "./gates.ts";

describe("repeat gating", () => {
  it("keeps one and two passes free", () => {
    assert.equal(isPaidRepeat(1), false);
    assert.equal(isPaidRepeat(2), false);
  });

  it("locks three or more and unlimited", () => {
    assert.equal(isPaidRepeat(3), true);
    assert.equal(isPaidRepeat(5), true);
    assert.equal(isPaidRepeat(10), true);
    assert.equal(isPaidRepeat(0), true);
  });

  it("clamps paid repeats unless Plus is on", () => {
    assert.equal(clampRepeat(5, false), 2);
    assert.equal(clampRepeat(0, false), 2);
    assert.equal(clampRepeat(5, true), 5);
    assert.equal(clampRepeat(1, false), 1);
  });
});

describe("Plus explanation copy", () => {
  it("keeps reading, Focus, and verse Repeat free in the sheet", () => {
    assert.match(PLUS_EXPLAIN.lead, /Reading stays free/);
    assert.match(PLUS_EXPLAIN.lead, /Focus stays free/);
    assert.match(PLUS_EXPLAIN.lead, /Repeat/);
    assert.equal(
      PLUS_EXPLAIN.free.some((line) => /Drill, Masked, and Relay with one qari/.test(line)),
      true,
    );
    assert.equal(
      PLUS_EXPLAIN.plus.some((line) => /3×, 5×, 10×/.test(line)),
      true,
    );
    assert.equal(
      PLUS_EXPLAIN.plus.some((line) => /more than one qari/.test(line)),
      true,
    );
    assert.doesNotMatch(PLUS_EXPLAIN.rowSub, /Practise stays free/);
    assert.equal(
      PLUS_EXPLAIN.free.some((line) => /Colour themes/.test(line)),
      true,
    );
    assert.equal(
      PLUS_EXPLAIN.plus.some((line) => /theme|palette|colour/i.test(line)),
      false,
    );
  });
});

describe("relay qari gating", () => {
  it("allows you plus one qari", () => {
    assert.equal(qariCount([{ kind: "qari" }, { kind: "you" }]), 1);
    assert.equal(isPaidRelay([{ kind: "qari" }, { kind: "you" }]), false);
  });

  it("locks a second qari", () => {
    assert.equal(
      isPaidRelay([{ kind: "qari" }, { kind: "you" }, { kind: "qari" }]),
      true,
    );
  });
});
