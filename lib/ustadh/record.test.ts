import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extensionForMime } from "./record.ts";

describe("ustadh record helpers", () => {
  it("picks a file extension from the recorder mime", () => {
    assert.equal(extensionForMime("audio/webm;codecs=opus"), "webm");
    assert.equal(extensionForMime("audio/mp4"), "m4a");
    assert.equal(extensionForMime("audio/ogg;codecs=opus"), "ogg");
  });
});
