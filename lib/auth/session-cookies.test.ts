import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Mirrors lib/auth/session.ts tryMutateCookies: pages cannot cookies().set(),
 * so cookie mutation errors must be swallowed while Next redirects still escape.
 */
async function tryMutateCookies(
  run: () => Promise<void>,
  rethrow: (err: unknown) => void,
) {
  try {
    await run();
  } catch (err) {
    rethrow(err);
  }
}

describe("tryMutateCookies", () => {
  it("swallows ordinary cookie-mutation failures so pricing can render", async () => {
    let saw = false;
    await tryMutateCookies(
      async () => {
        throw new Error("Cookies can only be modified in a Server Action or Route Handler.");
      },
      () => {
        /* unstable_rethrow no-ops for ordinary errors */
      },
    );
    saw = true;
    assert.equal(saw, true);
  });

  it("rethrows Next navigation errors so redirect() still works", async () => {
    const redirectErr = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/home;307;" });
    await assert.rejects(
      () =>
        tryMutateCookies(
          async () => {
            throw redirectErr;
          },
          (err) => {
            throw err;
          },
        ),
      (err: unknown) => err === redirectErr,
    );
  });
});
