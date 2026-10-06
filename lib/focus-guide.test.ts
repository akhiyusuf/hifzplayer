import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FOCUS_JOBS } from "./constants.ts";
import { nextFocusGuideStep } from "./focus-guide.ts";

describe("focus guide steps", () => {
  it("walks Word Reps, Masked, and Relay, then repeats", () => {
    assert.equal(FOCUS_JOBS.map((job) => job.id).join(","), "word,masked,relay");
    assert.equal(nextFocusGuideStep(0), 1);
    assert.equal(nextFocusGuideStep(1), 2);
    assert.equal(nextFocusGuideStep(2), 0);
  });

  it("starts over from a bad step", () => {
    assert.equal(nextFocusGuideStep(-1), 0);
    assert.equal(nextFocusGuideStep(Number.NaN), 0);
  });
});
