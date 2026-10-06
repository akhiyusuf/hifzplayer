import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { passwordLooksValid } from "./config.ts";

describe("password rules", () => {
  it("requires 8–128 characters", () => {
    assert.equal(passwordLooksValid("short"), false);
    assert.equal(passwordLooksValid("longenough"), true);
    assert.equal(passwordLooksValid("a".repeat(128)), true);
    assert.equal(passwordLooksValid("a".repeat(129)), false);
  });
});

describe("password copy in schema", () => {
  it("stores hashes and Google subjects on users", () => {
    const sql = readFileSync(new URL("../../db/schema.sql", import.meta.url), "utf8");
    assert.match(sql, /password_hash/);
    assert.match(sql, /google_sub/);
  });
});
