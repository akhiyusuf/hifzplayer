# Host Cloudflare + Neon + R2

Diras can keep running on Vercel while this stack is prepared. Flip `diras.app` only after the Worker, Neon, R2, and Turnstile are healthy. This is not a DNS-only toggle: the Next.js app is compiled with OpenNext for Cloudflare Workers.

## Authentication (email code + Turnstile)

User sign-in is **email OTP stored in Neon**. Cloudflare **Turnstile** is the bot check on that form. Cloudflare Access / Zero Trust is **not** used in front of the public reader — that would gate the Quran behind a team login, and the 50-seat Access free tier is the wrong product for consumer Plus.

What we do instead:

1. Browser posts email + Turnstile token to `/api/auth/otp`. The Worker verifies the token with Cloudflare (`siteverify` + `CF-Connecting-IP`), then stores a hashed 6-digit code in Neon (10 minutes, 5 attempts, 5 codes/email/hour).
2. `/api/auth/verify` checks the code, creates the user row if needed, writes a hashed session, and sets the httpOnly `diras_sid` cookie.
3. Middleware only checks that the cookie is **present** on checkout. Routes that grant Plus hash the cookie against Neon.
4. Plus, trial-used, and gift holds live in Neon tables (`entitlements`, `gift_holds`). The Plus cookie is a cache.

Clerk is not in this stack. Do not add a Clerk proxy, `__clerk` path, or Access policy in front of `/`.

### Cloudflare dashboard (you)

- Turnstile widget (managed). Copy the site key to `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and the secret to `TURNSTILE_SECRET_KEY`.
- Allowed hostnames: `diras.app` (and `localhost` for dummy keys).
- Dummy keys for local: site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.
- Webhooks: point Stripe and Paystack at the Worker origin (`https://diras.app/api/billing/webhook/...`).
- `NEXT_PUBLIC_APP_URL=https://diras.app`

## Neon

Postgres for user rows (accounts, sessions, OTP challenges, entitlements, gift holds, synced practice sessions). Not for audio.

1. Create a Neon project, copy the pooled `DATABASE_URL`.
2. Run `db/schema.sql` in the Neon SQL editor.
3. Set `DATABASE_URL` as a Worker secret (`wrangler secret put DATABASE_URL`).
4. Set `AUTH_SECRET` (or reuse `BILLING_SIGNING_SECRET`) to hash OTP codes and session tokens.
5. The HTTP serverless driver in `lib/db/neon.ts` works from Workers and from Vercel during dual-run.

Idle compute scales to zero. The first query after ~5 minutes can be slow.

## R2

Object storage for Quran audio / mushaf blobs. **$0 egress.**

1. `npx wrangler r2 bucket create diras-files`
2. Optional cache bucket: `npx wrangler r2 bucket create diras-next-cache`
3. Uncomment / add to `wrangler.jsonc`:

```jsonc
"r2_buckets": [
  { "binding": "DIRAS_FILES", "bucket_name": "diras-files" },
  { "binding": "NEXT_INC_CACHE_R2_BUCKET", "bucket_name": "diras-next-cache" }
]
```
4. Attach a custom domain (`files.diras.app`) and set `R2_PUBLIC_BASE_URL=https://files.diras.app`.
5. Add that origin to CSP automatically via `R2_PUBLIC_BASE_URL`.

Do not put MP3s in Neon or in user metadata.

## Deploy the Worker

```bash
cp .dev.vars.example .dev.vars   # local wrangler
npm run preview                  # OpenNext + workerd, not next start
npm run deploy                   # needs a logged-in wrangler account
```

Secrets to put on the Worker (same names as `.env.example`): Turnstile, Stripe, Paystack, billing signing, Resend, `DATABASE_URL`, `AUTH_SECRET`.

## Cutover

1. Run `db/schema.sql` on Neon; a `SELECT 1` through `DATABASE_URL` succeeds.
2. Deploy the Worker. Confirm `/sign-in` completes a real email-code session (cookie `diras_sid`, `Secure` + `HttpOnly`).
3. Confirm Turnstile renders and a bad token is rejected.
4. Place a test object in R2 and confirm the public URL streams.
5. Point Stripe/Paystack webhooks at `diras.app`.
6. Then change `diras.app` DNS to the Worker. Keep Vercel up until that works.

Reading stays public. Buying Plus still requires sign-in. Cloudflare Access is the wrong product for that.
