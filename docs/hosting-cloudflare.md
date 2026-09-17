# Host Cloudflare + Neon + R2

Diras can keep running on Vercel while this stack is prepared. Flip `diras.app` only after the Worker, Clerk production instance, Neon, and R2 are healthy. This is not a DNS-only toggle: the Next.js app is compiled with OpenNext for Cloudflare Workers.

## Authentication (Clerk on Cloudflare)

User sign-in stays **Clerk**. Cloudflare Access / Zero Trust is **not** used in front of the public reader — that would gate the Quran behind a Cloudflare team login.

What we do instead:

1. **Same Clerk middleware** verifies the session JWT on every matched request (`auth()` on checkout, webhook signatures on `/api/auth/webhook`).
2. **`authorizedParties`** allowlists origins that may present a Clerk token (`NEXT_PUBLIC_APP_URL` plus `CLERK_AUTHORIZED_PARTIES`). That blocks subdomain cookie-leak / CSRF against the session JWT.
3. **First-party Frontend API proxy** on production: browser calls `https://diras.app/__clerk` instead of `*.clerk.accounts.dev`. Clerk cookies are first-party on your domain. `clerkMiddleware({ frontendApiProxy })` forwards `Clerk-Proxy-Url`, `Clerk-Secret-Key`, and the real client IP (`CF-Connecting-IP`).
4. **Absolute proxy URL only.** `NEXT_PUBLIC_CLERK_PROXY_URL` must be `https://diras.app/__clerk`, never `/__clerk` (relative proxy URLs can 500 on Workers SSR). Clerk **development** instances cannot proxy — leave the var empty until the production Clerk instance is live.
5. Optional **`CLERK_JWT_KEY`** (JWKS public key from the Clerk Dashboard) so Workers can verify sessions without a network hop to Clerk on every request.

Do **not** orange-cloud Clerk’s own CNAME (`clerk` / `accounts` subdomain). If you use Clerk’s DNS CNAME instead of the proxy, set that record to **DNS only**. The Worker itself can stay proxied.

### Clerk dashboard (you)

- Production instance, production keys on the Worker.
- Allowed origins: `https://diras.app` (and the `*.workers.dev` preview if you test production keys there).
- Domains → set Frontend API **proxy URL** to `https://diras.app/__clerk` **after** the Worker is serving that path.
- Webhooks: point Stripe, Paystack, and Clerk at the Worker origin (`https://diras.app/api/billing/webhook/...`, `/api/auth/webhook`).
- `NEXT_PUBLIC_APP_URL=https://diras.app`

## Neon

Postgres for user rows (entitlements, synced practice sessions). Not for audio.

1. Create a Neon project, copy the pooled `DATABASE_URL`.
2. Run `db/schema.sql` in the Neon SQL editor.
3. Set `DATABASE_URL` as a Worker secret (`wrangler secret put DATABASE_URL`).
4. The HTTP serverless driver in `lib/db/neon.ts` works from Workers and from Vercel during dual-run.

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

Do not put MP3s in Neon or Clerk metadata.

## Deploy the Worker

```bash
cp .dev.vars.example .dev.vars   # local wrangler
npm run preview                  # OpenNext + workerd, not next start
npm run deploy                   # needs a logged-in wrangler account
```

Secrets to put on the Worker (same names as `.env.example`): Clerk, Stripe, Paystack, billing signing, Resend, `DATABASE_URL`, `CLERK_JWT_KEY` if used.

## Cutover

1. Deploy the Worker. Confirm `/sign-in` completes a real Clerk session (cookie `Secure` + `HttpOnly` on `__session`).
2. Hit `/__clerk/v1/proxy-health` after enabling the proxy in Clerk — it must 200.
3. Place a test object in R2 and confirm the public URL streams.
4. Run `db/schema.sql` on Neon; a `SELECT 1` through `DATABASE_URL` succeeds.
5. Point Stripe/Paystack/Clerk webhooks at `diras.app`.
6. Then change `diras.app` DNS to the Worker. Keep Vercel up until that works.

Reading stays public. Buying Plus still requires Clerk sign-in. Cloudflare Access is the wrong product for that.
