import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PLUS_EXPLAIN,
  clampRepeat,
  isPaidFocusJob,
  isPaidRelay,
  isPaidRepeat,
  plusCopyFor,
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
  it("keeps Mushaf and Focus views free, and lists practice tools as Plus", () => {
    assert.match(PLUS_EXPLAIN.lead, /Reading stays free/);
    assert.match(PLUS_EXPLAIN.lead, /Focus views stay free|Mushaf and Focus/i);
    assert.match(PLUS_EXPLAIN.lead, /Repeat/);
    assert.equal(
      PLUS_EXPLAIN.free.some((line) => /Mushaf view and Focus view/i.test(line)),
      true,
    );
    assert.equal(
      PLUS_EXPLAIN.plus.some((line) => /Word Reps, Masked, and Relay/.test(line)),
      true,
    );
    assert.equal(
      PLUS_EXPLAIN.plus.some((line) => /Occasion lists/.test(line)),
      true,
    );
    assert.equal(
      PLUS_EXPLAIN.plus.some((line) => /Best of/.test(line)),
      false,
    );
    assert.equal(
      PLUS_EXPLAIN.plus.some((line) => /3×, 5×, 10×/.test(line)),
      true,
    );
    assert.match(PLUS_EXPLAIN.rowSub, /Word Reps/);
    assert.equal(
      PLUS_EXPLAIN.free.some((line) => /Colour themes/.test(line)),
      true,
    );
    assert.equal(
      PLUS_EXPLAIN.plus.some((line) => /theme|palette|colour/i.test(line)),
      false,
    );
  });

  it("maps legacy focus asks onto practice copy", () => {
    assert.equal(plusCopyFor("focus").title, plusCopyFor("practice").title);
    assert.match(plusCopyFor("practice").body, /Focus views stay free|Mushaf and Focus/i);
  });
});

describe("Focus job gating", () => {
  it("treats Word Reps, Masked, and Relay as Plus", () => {
    assert.equal(isPaidFocusJob("word"), true);
    assert.equal(isPaidFocusJob("masked"), true);
    assert.equal(isPaidFocusJob("relay"), true);
  });

  it("leaves verse listen and the Focus view itself free to open", () => {
    assert.equal(isPaidFocusJob("verse"), false);
    assert.equal(isPaidFocusJob(""), false);
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
