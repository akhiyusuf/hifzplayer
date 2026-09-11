import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampRepeat, isPaidRelay, isPaidRepeat, qariCount } from "./gates.ts";

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
