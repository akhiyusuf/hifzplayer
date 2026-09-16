import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { plusSalaamLine } from "./plus-presence.ts";
import {
  GREETED_SIGN_IN_KEY,
  GUEST_NAME,
  POST_AUTH_GREET_WINDOW_MS,
  SALAAM,
  givenNameFromAccount,
  postAuthGreetingLine,
  postAuthGreetingTrigger,
  readGreetedSignIn,
  writeGreetedSignIn,
} from "./greeting.ts";

const now = Date.parse("2026-09-16T13:00:00.000Z");
const userId = "user_1";

describe("home greeting", () => {
  it("uses the salaam, not a weekday or time of day", () => {
    assert.equal(SALAAM, "Assalamu alaikum");
    assert.doesNotMatch(SALAAM, /morning|afternoon|evening|Saturday|Monday/i);
  });

  it("prefers the given name from the account", () => {
    assert.equal(givenNameFromAccount({ firstName: "Yusuf", fullName: "Yusuf Ali" }), "Yusuf");
    assert.equal(givenNameFromAccount({ firstName: "  Maryam  " }), "Maryam");
  });

  it("falls back to Reader when there is no account name", () => {
    assert.equal(GUEST_NAME, "Reader");
    assert.equal(givenNameFromAccount(null), "Reader");
    assert.equal(givenNameFromAccount({}), "Reader");
    assert.equal(givenNameFromAccount({ firstName: "", fullName: "", username: "user@x.com" }), "Reader");
  });
});

describe("post-auth greeting trigger", () => {
  it("greets a returning login whose lastSignInAt is fresh", () => {
    const lastSignInAt = now - 20_000;
    const createdAt = now - 40 * 24 * 60 * 60 * 1000;
    const decision = postAuthGreetingTrigger({
      userId,
      lastSignInAt,
      createdAt,
      greetedFor: null,
      now,
    });
    assert.deepEqual(decision, { greet: true, kind: "login", key: `${userId}:${lastSignInAt}` });
  });

  it("greets a new sign-up whose account was just created", () => {
    const createdAt = now - 8_000;
    const lastSignInAt = now - 7_000;
    const decision = postAuthGreetingTrigger({
      userId,
      lastSignInAt,
      createdAt,
      greetedFor: null,
      now,
    });
    assert.deepEqual(decision, { greet: true, kind: "signup", key: `${userId}:${lastSignInAt}` });
  });

  it("treats a brand-new account without lastSignInAt as a sign-up", () => {
    const createdAt = now - 3_000;
    const decision = postAuthGreetingTrigger({
      userId,
      lastSignInAt: null,
      createdAt,
      greetedFor: null,
      now,
    });
    assert.deepEqual(decision, { greet: true, kind: "signup", key: `${userId}:${createdAt}` });
  });

  it("does not greet an already-authed session on later navigation", () => {
    const lastSignInAt = now - POST_AUTH_GREET_WINDOW_MS - 1;
    const createdAt = now - 40 * 24 * 60 * 60 * 1000;
    assert.deepEqual(
      postAuthGreetingTrigger({
        userId,
        lastSignInAt,
        createdAt,
        greetedFor: null,
        now,
      }),
      { greet: false },
    );
  });

  it("does not greet the same sign-in twice", () => {
    const lastSignInAt = now - 5_000;
    const key = `${userId}:${lastSignInAt}`;
    assert.deepEqual(
      postAuthGreetingTrigger({
        userId,
        lastSignInAt,
        createdAt: now - 40 * 24 * 60 * 60 * 1000,
        greetedFor: key,
        now,
      }),
      { greet: false },
    );
  });

  it("does not greet a signed-out visitor", () => {
    assert.deepEqual(
      postAuthGreetingTrigger({
        userId: null,
        lastSignInAt: now,
        createdAt: now,
        greetedFor: null,
        now,
      }),
      { greet: false },
    );
  });

  it("accepts ISO timestamps from Clerk", () => {
    const lastSignInAt = new Date(now - 12_000).toISOString();
    const decision = postAuthGreetingTrigger({
      userId,
      lastSignInAt,
      createdAt: new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString(),
      greetedFor: null,
      now,
    });
    assert.equal(decision.greet, true);
    if (decision.greet) assert.equal(decision.kind, "login");
  });
});

describe("post-auth greeting copy", () => {
  it("uses the salaam and the given name", () => {
    assert.equal(postAuthGreetingLine("Yusuf"), "Assalamu alaikum, Yusuf");
    assert.equal(postAuthGreetingLine("Yusuf", plusSalaamLine(true)), "Assalamu alaikum · Plus, Yusuf");
  });

  it("keeps a plain salaam when there is no given name", () => {
    assert.equal(postAuthGreetingLine(""), SALAAM);
    assert.equal(postAuthGreetingLine(GUEST_NAME), SALAAM);
    assert.equal(postAuthGreetingLine(GUEST_NAME, plusSalaamLine(true)), plusSalaamLine(true));
  });
});

describe("greeted sign-in storage", () => {
  it("reads and writes the localStorage key", () => {
    const store = new Map<string, string>();
    const original = globalThis.window;
    globalThis.window = {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      },
    } as Window & typeof globalThis;
    try {
      assert.equal(readGreetedSignIn(), null);
      writeGreetedSignIn("user_1:123");
      assert.equal(store.get(GREETED_SIGN_IN_KEY), "user_1:123");
      assert.equal(readGreetedSignIn(), "user_1:123");
    } finally {
      if (original === undefined) delete (globalThis as { window?: unknown }).window;
      else globalThis.window = original;
    }
  });
});
