import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { SCHEMA_STATEMENTS } from "./schema.ts";

describe("neon schema", () => {
  it("creates the account tables the Worker needs", () => {
    const blob = SCHEMA_STATEMENTS.join("\n");
    for (const table of [
      "users",
      "otp_challenges",
      "sessions",
      "entitlements",
      "gift_holds",
      "practice_sessions",
    ]) {
      assert.match(blob, new RegExp(`create table if not exists ${table}`));
    }
    assert.match(blob, /password_hash/);
    assert.match(blob, /google_sub/);
  });

  it("matches db/schema.sql table names", () => {
    const file = readFileSync(new URL("../../db/schema.sql", import.meta.url), "utf8");
    assert.match(file, /create table if not exists users/);
    assert.match(file, /password_hash/);
    assert.match(file, /google_sub/);
  });
});
