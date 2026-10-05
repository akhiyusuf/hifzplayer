import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  advanceVadGate,
  extensionForMime,
  rmsFromTimeDomain,
  USTADH_VAD,
} from "./record.ts";

describe("ustadh record helpers", () => {
  it("picks a file extension from the recorder mime", () => {
    assert.equal(extensionForMime("audio/webm;codecs=opus"), "webm");
    assert.equal(extensionForMime("audio/mp4"), "m4a");
    assert.equal(extensionForMime("audio/ogg;codecs=opus"), "ogg");
  });
});

describe("ustadh VAD gate", () => {
  it("auto-sends after speech then silence, and on max listen", () => {
    const silent = 0;
    const loud = USTADH_VAD.speechRms + 0.02;
    let state = {
      hasSpoken: false,
      speechStartedAtMs: null as number | null,
      lastSpeechAtMs: null as number | null,
    };
    const started = 0;
    for (let t = 0; t <= USTADH_VAD.minSpeechMs; t += 50) {
      const d = advanceVadGate({ nowMs: t, rms: loud, startedAtMs: started, state });
      state = d.state;
      assert.equal(d.action, "continue");
    }
    const quietAt = USTADH_VAD.minSpeechMs + USTADH_VAD.silenceMs;
    const done = advanceVadGate({
      nowMs: quietAt,
      rms: silent,
      startedAtMs: started,
      state,
    });
    assert.equal(done.action, "auto_send");

    const capped = advanceVadGate({
      nowMs: USTADH_VAD.maxListenMs,
      rms: silent,
      startedAtMs: 0,
      state: { hasSpoken: false, speechStartedAtMs: null, lastSpeechAtMs: null },
    });
    assert.equal(capped.action, "auto_send");
    assert.ok(rmsFromTimeDomain([128, 128, 128]) < 0.01);
  });
});
