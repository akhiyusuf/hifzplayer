# Host Cloudflare + Neon + R2

Diras can keep running on Vercel while this stack is prepared. Flip `diras.app` only after the Worker, Neon, R2, and Turnstile are healthy. This is not a DNS-only toggle: the Next.js app is compiled with OpenNext for Cloudflare Workers.

## Where each piece lives

| Piece | Where | You create it in |
|---|---|---|
| App + auth APIs (`/api/auth/*`) | Cloudflare Worker | `npm run deploy` after `wrangler login` |
| User rows, sessions, Plus, gifts | Neon Postgres | Neon dashboard: one project, copy `DATABASE_URL` |
| Files / audio | R2 | Cloudflare R2 bucket |
| Bot check on password forms | Turnstile | Cloudflare Turnstile widget |
| Continue with Google | Google OAuth | Google Cloud credentials, not Cloudflare |

Password and Google sign-in **run on Cloudflare** (the Worker). The accounts themselves are **not** stored in Cloudflare. Neon is the database. Turnstile is only the “are you human” checkbox.

Cloudflare Access / Zero Trust is **not** used. That would gate the Quran behind a team login, and the 50-seat Access free tier is the wrong product for consumer Plus.

## Authentication (password + Google + Turnstile)

1. **Password:** the browser shows the managed Turnstile widget, then posts email, password, and the token. Protected routes: `POST /api/auth/login` (action `login`), `POST /api/auth/register` (`signup`), `POST /api/auth/otp` (`reset-request`), `POST /api/auth/password` (`password-reset`), `POST /api/auth/verify` (`verify-email`). The Worker calls siteverify with `TURNSTILE_SECRET_KEY`, `CF-Connecting-IP`, and requires `success`, the matching action, and an allowed hostname. Tokens are single-use. Google (`/api/auth/google`) is not behind Turnstile. The Worker then hashes the password (`scrypt`), writes the user/session in Neon, and sets httpOnly `diras_sid`.
2. **Google:** `/api/auth/google` redirects to Google. The callback stores `google_sub` on the Neon user and sets the same session cookie. Redirect URI: `https://diras.app/api/auth/google/callback` (and `http://localhost:3000/api/auth/google/callback` for local).
3. **Forgot password:** email OTP is only for reset (`/api/auth/otp` then `/api/auth/password`). Codes are hashed in Neon (10 minutes, 5 attempts, 5/email/hour).
4. Middleware only checks that the cookie is **present** on checkout. Routes that grant Plus hash the cookie against Neon.
5. Plus, trial-used, and gift holds live in Neon (`entitlements`, `gift_holds`). The Plus cookie is a cache.

Clerk is not in this stack. Do not add a Clerk proxy, `__clerk` path, or Access policy in front of `/`.

### Why you do not paste `db/schema.sql`

Neon starts empty. Someone has to `CREATE TABLE`. That used to be “open the Neon SQL editor and paste the file.” You do not need to do that anymore: the Worker runs the same DDL on the first query (`lib/db/schema.ts`, `create table if not exists`). `db/schema.sql` is the readable copy of that DDL.

You still create the **Neon project** and paste `DATABASE_URL` into Worker secrets. That is a connection string, not SQL.

### Cloudflare dashboard (you)

- Turnstile widget **Diras** already exists (managed, sitekey `0x4AAAAAAE9ruY8EYQqAdKA0`, hostnames `diras.app` and `localhost`). The public site key is `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (already in `wrangler.jsonc` vars and `.env.example`).
- The widget **secret** is a Worker secret, not a var. On the Worker named `diras`: `npx wrangler secret put TURNSTILE_SECRET_KEY`. Paste the Diras widget secret from the Cloudflare dashboard (Turnstile → Diras → secret). `CF_TURNSTILE_SECRET` is an accepted alias if you already stored it under that name. Do not commit the secret, and do not put it in `wrangler.jsonc`.
- Production fails closed: password sign-in, sign-up, email-code request, password reset, and email verification all return 401 `TURNSTILE` when the secret is missing or siteverify does not return `success`, the matching action, and hostname `diras.app`.
- Local bypass: `next dev` skips siteverify only when `TURNSTILE_SECRET_KEY` and `CF_TURNSTILE_SECRET` are both unset. That bypass does not run when `NODE_ENV` is `production`.
- Test the real widget locally: copy `.env.example` to `.env.local`, set `DATABASE_URL`, `AUTH_SECRET`, and `TURNSTILE_SECRET_KEY`, keep the site key, run `npm run dev`, open `http://localhost:3000/sign-in`. The existing widget allows `localhost`. Optional `TURNSTILE_HOSTNAMES` overrides the allowlist; production ignores `localhost` and `127.0.0.1` even if they are listed.
- Bot Fight Mode stays on. This app check is separate from that edge setting.
- Webhooks: point Stripe and Paystack at the Worker origin (`https://diras.app/api/billing/webhook/...`).
- `NEXT_PUBLIC_APP_URL=https://diras.app`

This environment cannot create the Turnstile widget or deploy the Worker: `wrangler` is not logged in as your Cloudflare account.

## Neon

Postgres for user rows (accounts, sessions, OTP challenges, entitlements, gift holds, synced practice sessions). Not for audio.

1. Create a Neon project, copy the pooled `DATABASE_URL`.
2. Set `DATABASE_URL` as a Worker secret (`wrangler secret put DATABASE_URL`). Tables are created on first sign-in.
3. Set `AUTH_SECRET` (or reuse `BILLING_SIGNING_SECRET`) to hash OTP codes and session tokens.
4. The HTTP serverless driver in `lib/db/neon.ts` works from Workers and from Vercel during dual-run.

Idle compute scales to zero. The first query after ~5 minutes can be slow.

## Google Cloud (optional)

Google’s second page (after they click their email on the account picker) shows the **OAuth consent screen App name**. It is not Cloudflare, not Neon, and not the Worker. Set that App name to **Diras**.

Typical copy: **“Diras wants to access your Google Account”**, then email and profile. If App name is left as the Google Cloud project name, they will see that project name instead.

1. Google Cloud Console → **APIs & Services → OAuth consent screen** (or **Google Auth platform → Branding**).
2. App name: `Diras` (exactly that).
3. User support email: `contact@brotheryusuf.com`.
4. App domain / authorized domains: `diras.app`. Privacy: `https://diras.app/privacy`.
5. Scopes: `openid`, `email`, `profile` (non-sensitive). Do not request extra Google scopes.
6. Then **Credentials → Create OAuth client**, type **Web application**. The client’s internal name (e.g. “Diras web”) is not shown to users.
7. Authorized redirect URIs: `https://diras.app/api/auth/google/callback` and `http://localhost:3000/api/auth/google/callback`.
8. Put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on the Worker. Google sign-in is not a Cloudflare product.

Until Google verifies the app, they may also see an “unverified app” warning. The product name on that page is still the App name you set — keep it **Diras**.

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

Secrets to put on the Worker (same names as `.env.example`): Turnstile, Google, Stripe, Paystack, billing signing, Resend, `DATABASE_URL`, `AUTH_SECRET`.

## Cutover

1. Neon `DATABASE_URL` is set; first sign-in creates tables (`SELECT 1` through the URL succeeds).
2. Deploy the Worker. Confirm `/sign-in` completes a password or Google session (cookie `diras_sid`, `Secure` + `HttpOnly`).
3. Confirm the Turnstile widget renders on `/sign-in` and a missing or replayed token is rejected (`401`, code `TURNSTILE`).
4. Place a test object in R2 and confirm the public URL streams.
5. Point Stripe/Paystack webhooks at `diras.app`.
6. Then change `diras.app` DNS to the Worker. Keep Vercel up until that works.

Reading stays public. Buying Plus still requires sign-in. Cloudflare Access is the wrong product for that.
