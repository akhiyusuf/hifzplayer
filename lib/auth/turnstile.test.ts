import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { TURNSTILE_ACTIONS } from "./turnstile-actions.ts";
import { turnstileExpectedHostnames, turnstileDevBypass, verifyTurnstileToken } from "./turnstile.ts";

const ENV_KEYS = ["TURNSTILE_SECRET_KEY", "CF_TURNSTILE_SECRET", "TURNSTILE_HOSTNAMES", "NODE_ENV"] as const;

const previous: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function saveEnv() {
  for (const key of ENV_KEYS) previous[key] = process.env[key];
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = previous[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function setEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>) {
  for (const key of ENV_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) process.env[key] = value;
  }
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  restoreEnv();
  globalThis.fetch = originalFetch;
});

describe("turnstile hostnames", () => {
  it("defaults to local hosts in development and diras.app in production", () => {
    saveEnv();
    setEnv({ NODE_ENV: "development" });
    assert.deepEqual([...turnstileExpectedHostnames()], ["localhost", "127.0.0.1"]);
    setEnv({ NODE_ENV: "production" });
    assert.deepEqual([...turnstileExpectedHostnames()], ["diras.app"]);
  });

  it("drops localhost from a production allowlist", () => {
    saveEnv();
    setEnv({ NODE_ENV: "production", TURNSTILE_HOSTNAMES: "localhost, diras.app, 127.0.0.1" });
    assert.deepEqual([...turnstileExpectedHostnames()], ["diras.app"]);
    setEnv({ NODE_ENV: "production", TURNSTILE_HOSTNAMES: "localhost" });
    assert.equal(turnstileExpectedHostnames().size, 0);
  });
});

describe("turnstile siteverify", () => {
  it("rejects an empty or oversized token when the secret is set", async () => {
    saveEnv();
    setEnv({ NODE_ENV: "production", TURNSTILE_SECRET_KEY: "secret" });
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      return new Response("{}", { status: 200 });
    };
    assert.equal(await verifyTurnstileToken("", new Headers(), TURNSTILE_ACTIONS.login), false);
    assert.equal(await verifyTurnstileToken("   ", new Headers(), TURNSTILE_ACTIONS.login), false);
    assert.equal(await verifyTurnstileToken("x".repeat(2049), new Headers(), TURNSTILE_ACTIONS.login), false);
    assert.equal(called, false);
  });

  it("fails closed in production when the secret is missing", async () => {
    saveEnv();
    setEnv({ NODE_ENV: "production" });
    assert.equal(turnstileDevBypass(), false);
    assert.equal(await verifyTurnstileToken("token", new Headers(), TURNSTILE_ACTIONS.login), false);
  });

  it("bypasses only in development when both secret names are unset", async () => {
    saveEnv();
    setEnv({ NODE_ENV: "development" });
    assert.equal(turnstileDevBypass(), true);
    assert.equal(await verifyTurnstileToken("", new Headers(), TURNSTILE_ACTIONS.signup), true);
    setEnv({ NODE_ENV: "development", CF_TURNSTILE_SECRET: "alias-secret" });
    assert.equal(turnstileDevBypass(), false);
  });

  it("accepts success only when action and hostname match", async () => {
    saveEnv();
    setEnv({ NODE_ENV: "production", TURNSTILE_SECRET_KEY: "widget-secret", TURNSTILE_HOSTNAMES: "diras.app" });
    const seen: string[] = [];
    globalThis.fetch = async (_input, init) => {
      seen.push(String(init?.body));
      return Response.json({ success: true, action: "login", hostname: "diras.app" });
    };
    const headers = new Headers({ "cf-connecting-ip": "203.0.113.8" });
    assert.equal(await verifyTurnstileToken("fresh-token", headers, TURNSTILE_ACTIONS.login), true);
    assert.match(seen[0] || "", /secret=widget-secret/);
    assert.match(seen[0] || "", /response=fresh-token/);
    assert.match(seen[0] || "", /remoteip=203\.0\.113\.8/);

    globalThis.fetch = async () => Response.json({ success: true, action: "signup", hostname: "diras.app" });
    assert.equal(await verifyTurnstileToken("fresh-token", headers, TURNSTILE_ACTIONS.login), false);

    globalThis.fetch = async () => Response.json({ success: true, action: "login", hostname: "localhost" });
    assert.equal(await verifyTurnstileToken("fresh-token", headers, TURNSTILE_ACTIONS.login), false);

    globalThis.fetch = async () => Response.json({ success: false, "error-codes": ["timeout-or-duplicate"] });
    assert.equal(await verifyTurnstileToken("used-token", headers, TURNSTILE_ACTIONS.login), false);
  });

  it("reads CF_TURNSTILE_SECRET when TURNSTILE_SECRET_KEY is unset", async () => {
    saveEnv();
    setEnv({ NODE_ENV: "development", CF_TURNSTILE_SECRET: "alias-secret" });
    let secret = "";
    globalThis.fetch = async (_input, init) => {
      secret = new URLSearchParams(String(init?.body)).get("secret") || "";
      return Response.json({ success: true, action: "reset-request", hostname: "localhost" });
    };
    assert.equal(
      await verifyTurnstileToken("token", new Headers(), TURNSTILE_ACTIONS.resetRequest),
      true,
    );
    assert.equal(secret, "alias-secret");
  });

  it("fails closed when siteverify errors", async () => {
    saveEnv();
    setEnv({ NODE_ENV: "production", TURNSTILE_SECRET_KEY: "secret" });
    globalThis.fetch = async () => new Response("nope", { status: 500 });
    assert.equal(await verifyTurnstileToken("token", new Headers(), TURNSTILE_ACTIONS.passwordReset), false);
    globalThis.fetch = async () => {
      throw new Error("network");
    };
    assert.equal(await verifyTurnstileToken("token", new Headers(), TURNSTILE_ACTIONS.verifyEmail), false);
  });

  it("fails closed in production when the allowlist is only local hosts", async () => {
    saveEnv();
    setEnv({ NODE_ENV: "production", TURNSTILE_SECRET_KEY: "secret", TURNSTILE_HOSTNAMES: "localhost" });
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      return Response.json({ success: true, action: "login", hostname: "localhost" });
    };
    assert.equal(await verifyTurnstileToken("token", new Headers(), TURNSTILE_ACTIONS.login), false);
    assert.equal(called, false);
  });
});
