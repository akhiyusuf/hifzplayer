import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { logOpsEvent } from "./events.ts";

describe("ops events", () => {
  it("logs a user_created line with an account id and no email key", () => {
    const lines: string[] = [];
    const orig = console.info;
    console.info = (msg?: unknown) => {
      lines.push(String(msg));
    };
    try {
      logOpsEvent({ type: "user_created", accountId: "user_abc", ok: true });
    } finally {
      console.info = orig;
    }
    assert.equal(lines.length, 1);
    const payload = JSON.parse(lines[0] || "{}") as Record<string, unknown>;
    assert.equal(payload.event, "diras.ops");
    assert.equal(payload.type, "user_created");
    assert.equal(payload.accountId, "user_abc");
    assert.equal("email" in payload, false);
  });

  it("logs a legal accept without an email", () => {
    const lines: string[] = [];
    const orig = console.info;
    console.info = (msg?: unknown) => {
      lines.push(String(msg));
    };
    try {
      logOpsEvent({ type: "legal_accepted", accountId: "user_abc", ok: true });
    } finally {
      console.info = orig;
    }
    const payload = JSON.parse(lines[0] || "{}") as Record<string, unknown>;
    assert.equal(payload.type, "legal_accepted");
    assert.equal(payload.accountId, "user_abc");
    assert.equal("email" in payload, false);
  });
});
