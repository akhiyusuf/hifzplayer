import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { retryAppError } from "./app-error.ts";

describe("retryAppError", () => {
  it("calls reset so the error boundary can remount", () => {
    let n = 0;
    retryAppError(() => {
      n += 1;
    });
    assert.equal(n, 1);
  });

  it("reloads the current route after reset", () => {
    const original = globalThis.window;
    let reloaded = false;
    globalThis.window = {
      location: { reload: () => {
        reloaded = true;
      } },
    };
    try {
      retryAppError(() => {});
      assert.equal(reloaded, true);
    } finally {
      if (original === undefined) delete globalThis.window;
      else globalThis.window = original;
    }
  });
});
