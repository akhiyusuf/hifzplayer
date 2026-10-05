import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { coachLoopStep, INITIAL_COACH_LOOP, USTADH_LOOP, type CoachLoopEvent, type CoachLoopState } from "./loop.ts";
import { mulberry32 } from "./soak.ts";

function run(events: CoachLoopEvent[], start: CoachLoopState = INITIAL_COACH_LOOP) {
  let state = start;
  const out = [];
  for (const event of events) {
    const step = coachLoopStep(state, event);
    state = step.state;
    out.push(step.next);
  }
  return { state, out };
}

describe("coach auto-listen loop", () => {
  it("Listen starts the loop and opens the mic at once", () => {
    const { state, out } = run([{ type: "start" }]);
    assert.equal(state.auto, true);
    assert.deepEqual(out[0], { kind: "listen", delayMs: 0 });
  });

  it("reopens the mic after a replay with a short beat (no tap)", () => {
    const { out } = run([{ type: "start" }, { type: "miss", replayed: true }]);
    assert.deepEqual(out[1], { kind: "listen", delayMs: USTADH_LOOP.afterReplayMs });
  });

  it("reopens after a match with a visible beat", () => {
    const { out } = run([{ type: "start" }, { type: "matched" }]);
    assert.deepEqual(out[1], { kind: "listen", delayMs: USTADH_LOOP.afterMatchMs });
    assert.ok(USTADH_LOOP.afterMatchMs > USTADH_LOOP.afterReplayMs);
  });

  it("reopens after a miss with nothing to replay", () => {
    const { out } = run([{ type: "start" }, { type: "miss", replayed: false }]);
    assert.deepEqual(out[1], { kind: "listen", delayMs: USTADH_LOOP.afterMissMs });
  });

  it("Pause stops the loop; later results do not reopen the mic", () => {
    const { state, out } = run([{ type: "start" }, { type: "stop" }, { type: "matched" }, { type: "miss", replayed: true }]);
    assert.equal(state.auto, false);
    assert.deepEqual(out[1], { kind: "idle", reason: "stopped" });
    assert.equal(out[2].kind, "idle");
    assert.equal(out[3].kind, "idle");
  });

  it("retries once after a silent take, then pauses itself", () => {
    const { state, out } = run([{ type: "start" }, { type: "silent" }, { type: "silent" }]);
    assert.deepEqual(out[1], { kind: "listen", delayMs: USTADH_LOOP.afterSilentMs });
    assert.deepEqual(out[2], { kind: "idle", reason: "silent" });
    assert.equal(state.auto, false);
  });

  it("speech between silent takes resets the silent streak", () => {
    const { state, out } = run([
      { type: "start" },
      { type: "silent" },
      { type: "matched" },
      { type: "silent" },
      { type: "miss", replayed: true },
    ]);
    assert.equal(state.auto, true);
    assert.equal(out[3].kind, "listen");
    assert.equal(out[4].kind, "listen");
  });

  it("EMPTY_CLIP counts as silent; mic/network/config errors pause the loop", () => {
    const empty = run([{ type: "start" }, { type: "error", code: "EMPTY_CLIP" }]);
    assert.equal(empty.out[1].kind, "listen");
    for (const code of ["MIC_DENIED", "MIC_UNAVAILABLE", "ASR_NOT_CONFIGURED", "NETWORK", "ASR_UPSTREAM", "UNKNOWN"] as const) {
      const r = run([{ type: "start" }, { type: "error", code }]);
      assert.equal(r.state.auto, false, code);
      assert.deepEqual(r.out[1], { kind: "idle", reason: "error" }, code);
    }
  });

  it("without the loop, results never auto-listen", () => {
    const { out } = run([{ type: "matched" }, { type: "miss", replayed: true }, { type: "silent" }]);
    assert.ok(out.every((next) => next.kind === "idle"));
  });

  it("soak: 5k random turns keep exactly one pending action and honour Pause", () => {
    const rng = mulberry32(42);
    let state: CoachLoopState = INITIAL_COACH_LOOP;
    let listens = 0;
    let silentRun = 0;
    for (let turn = 0; turn < 5_000; turn++) {
      const r = rng();
      const event: CoachLoopEvent = !state.auto
        ? { type: "start" }
        : r < 0.45
          ? { type: "miss", replayed: rng() < 0.8 }
          : r < 0.85
            ? { type: "matched" }
            : r < 0.97
              ? { type: "silent" }
              : r < 0.99
                ? { type: "stop" }
                : { type: "error", code: "NETWORK" };
      const wasAuto = state.auto;
      const step = coachLoopStep(state, event);
      if (event.type === "silent") silentRun += 1;
      else if (event.type !== "start") silentRun = 0;
      if (event.type === "start") silentRun = 0;
      if (step.next.kind === "listen") {
        listens += 1;
        assert.ok(step.state.auto, "only a running loop schedules a listen");
        assert.ok(step.next.delayMs >= 0 && step.next.delayMs <= 2_000);
      }
      if (event.type === "stop" || event.type === "error") assert.equal(step.state.auto, false);
      if (wasAuto && (event.type === "matched" || event.type === "miss")) assert.equal(step.next.kind, "listen");
      assert.ok(step.state.silentStreak < USTADH_LOOP.maxSilentTakes);
      if (silentRun >= USTADH_LOOP.maxSilentTakes) {
        assert.equal(step.state.auto, false);
        silentRun = 0;
      }
      state = step.state;
    }
    assert.ok(listens > 3_000);
  });
});
