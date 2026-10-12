import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PLUS_EXPLAIN,
  clampRepeat,
  isFreePracticeJob,
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

  it("keeps three or more and unlimited free too", () => {
    assert.equal(isPaidRepeat(3), false);
    assert.equal(isPaidRepeat(5), false);
    assert.equal(isPaidRepeat(10), false);
    assert.equal(isPaidRepeat(0), false);
  });

  it("never clamps repeats", () => {
    assert.equal(clampRepeat(5, false), 5);
    assert.equal(clampRepeat(0, false), 0);
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
      PLUS_EXPLAIN.plus.some((line) => /Memorization planner/.test(line)),
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
      PLUS_EXPLAIN.free.some((line) => /3×, 5×, 10×/.test(line)),
      true,
    );
    assert.equal(
      PLUS_EXPLAIN.plus.some((line) => /3×|qari/.test(line)),
      false,
    );
    assert.match(PLUS_EXPLAIN.rowSub, /Memorization planner/);
    assert.doesNotMatch(PLUS_EXPLAIN.rowSub, /Word Reps/);
    assert.equal(
      PLUS_EXPLAIN.free.some((line) => /Colour themes/.test(line)),
      true,
    );
    assert.equal(
      PLUS_EXPLAIN.plus.some((line) => /theme|palette|colour/i.test(line)),
      false,
    );
    assert.equal(
      PLUS_EXPLAIN.free.some((line) => /AI Ustadh/i.test(line)),
      false,
    );
    assert.equal(
      PLUS_EXPLAIN.plus.some((line) => /AI Ustadh/i.test(line)),
      true,
    );
  });

  it("maps legacy focus asks onto practice copy", () => {
    assert.equal(plusCopyFor("focus").title, plusCopyFor("practice").title);
    assert.match(plusCopyFor("practice").body, /Focus views stay free|Mushaf and Focus/i);
  });

  it("pitches the memorization planner as Plus", () => {
    assert.match(plusCopyFor("planner").title, /planner/i);
    assert.match(plusCopyFor("planner").body, /New|Review|Revision|hifz/i);
  });
});

describe("Focus job gating", () => {
  it("treats Word Reps, Masked, and Relay as free", () => {
    assert.equal(isPaidFocusJob("word"), false);
    assert.equal(isPaidFocusJob("masked"), false);
    assert.equal(isPaidFocusJob("relay"), false);
    assert.equal(isFreePracticeJob("word"), true);
    assert.equal(isFreePracticeJob("masked"), true);
    assert.equal(isFreePracticeJob("relay"), true);
    assert.ok(PLUS_EXPLAIN.free.some((l) => /Word Reps, Masked, and Relay/.test(l)));
    assert.ok(!PLUS_EXPLAIN.plus.some((l) => /Word Reps|Masked/.test(l)));
  });

  it("leaves verse listen and the Focus view itself free to open", () => {
    assert.equal(isPaidFocusJob("verse"), false);
    assert.equal(isPaidFocusJob("ustadh"), false);
    assert.equal(isPaidFocusJob(""), false);
    assert.equal(isFreePracticeJob("ustadh"), false); // USTADH_ENABLED=false
    assert.equal(isFreePracticeJob("verse"), true);
  });
});

describe("relay qari gating", () => {
  it("allows you plus one qari", () => {
    assert.equal(qariCount([{ kind: "qari" }, { kind: "you" }]), 1);
    assert.equal(isPaidRelay([{ kind: "qari" }, { kind: "you" }]), false);
  });

  it("keeps a second qari free", () => {
    assert.equal(
      isPaidRelay([{ kind: "qari" }, { kind: "you" }, { kind: "qari" }]),
      false,
    );
  });
});
