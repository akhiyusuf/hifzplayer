# Diras

A mobile-first Quran reading and memorisation player with word-level audio timing, tajweed colouring, masked recall, and relay practice.

Live: https://temporary-rapid-tungsten-9pj0tey.vercel.app/

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Data

- Quran text, translations, tajweed markup, and recitation audio: [quran.com v4 API](https://api-docs.quran.foundation/)
- Translation: Saheeh International
- Recurring-phrase markings: Mutashabihat dataset (QUL) — coming soon
- Near-twin / confusable words: QuranMorph (CC-BY-4.0) — coming soon

Nothing is stored on a server for reading. Position, recents, streak, reciter, and settings stay in the browser. Quran content stays free.

## Accounts

Sign-in is an email code stored in Neon, with Cloudflare Turnstile as the bot check. Add:

- `DATABASE_URL` (Neon pooled connection string)
- `AUTH_SECRET` (or `BILLING_SIGNING_SECRET`)
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY` (the same key that sends Plus confirmation mail)

Reading stays public. When accounts are on, buying Diras Plus requires sign-in, and Plus is stored on that account (not only a browser cookie). Without the keys, `/sign-in` and `/account` show setup copy instead of a fake signed-in state.

Cloudflare Access is not used. That product is a team login gate, not consumer auth.

## Billing (Diras Plus)

Optional Plus checkout uses **Paystack** in Nigeria and West Africa, and **Stripe** everywhere else. The processor is chosen from the request country (`x-vercel-ip-country`). There is no region picker.

Diras Plus unlocks Focus play — Word Reps, Masked, and Relay — plus 3× and unlimited word repeats, and more than one qari in relay. You can open Focus and look around without paying. Quran reading, audio, translation, tajweed, and verse Repeat stay free. Recurring phrases and near-twins are coming soon.

| | Monthly | Annual | Lifetime |
|---|---|---|---|
| Nigeria / West Africa | ₦1,500 | ₦10,500 | ₦26,250 |
| Malaysia | RM 6.75 | RM 47.25 | RM 119.25 |
| UAE | AED 11.25 | AED 78.75 | AED 194.25 |
| Saudi Arabia | SAR 11.25 | SAR 78.75 | SAR 194.25 |
| UK | £2.99 | £20.25 | £51.75 |
| US (default) | $3.74 | $25.50 | $66.75 |

Copy `.env.example` and add keys in the Vercel project (or a local `.env.local`):

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `PAYSTACK_SECRET_KEY`, optional `PAYSTACK_PLAN_MONTHLY` / `PAYSTACK_PLAN_ANNUAL` (created automatically if empty)
- `BILLING_SIGNING_SECRET` (recommended)
- `RESEND_API_KEY` and `EMAIL_FROM` (Diras Plus confirmation email after a grant, and sign-in codes)
- Account keys above, so Plus is bound to the signed-in user

Turn on **Vercel Web Analytics** on the project so page views show up. Server logs (`diras.billing`, `diras.ops`) include account IDs (never emails) so a failed renewal can be found immediately. The same ID is on `/account`.

`NEXT_PUBLIC_APP_URL` is optional. Checkout return URLs use the request host so Paystack cannot bounce to a stale origin.

Webhook endpoints (set these in the Paystack and Stripe dashboards, or a paid charge can succeed without Plus):

- Stripe: `/api/billing/webhook/stripe` — subscribe to `checkout.session.completed`, `invoice.paid`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `charge.dispute.created`
- Paystack: `/api/billing/webhook/paystack` — subscribe to `charge.success`, `invoice.payment_failed`, `subscription.disable`, `subscription.not_renew`, and `charge.dispute.create`

A chargeback or dispute request turns Plus off on the signed-in account. Recurring Stripe subscriptions are cancelled at the same time. Plus is not restored if the dispute later resolves; the customer can buy Plus again.

Monthly and annual checkouts create a real subscription on both processors. Lifetime stays a one-time payment. Later invoices extend Plus on the account until the new period end. Failed charges are logged with the account ID; cancelled subscriptions keep Plus until the paid period ends, then drop it.

After payment, Paystack/Stripe send the customer to `/api/billing/return`, which verifies the charge, stores Plus on the account, sets the Plus cookie, then redirects to `/pricing/success`. If that page never loads, paste the Paystack reference from the receipt on the success page. The same grant sends a **Diras Plus is active** email (Resend) once per account, separate from the processor receipt. Renewals do not send another welcome.

To gift Plus, sign in, choose **Gift someone** on `/pricing`, paste their emails, then pay. They do not need an account yet — a pending hold is claimed when they sign in with that address. **For me** still buys Plus for the signed-in account.

Rename the Paystack page/product and the Stripe product to **Diras Plus** in those dashboards. New checkouts already send that name.

## Hosting (Cloudflare + Neon + R2)

The app still builds with `next build` / `next start`. Cloudflare is a second compile (`npm run preview` / `npm run deploy`) via OpenNext. Sign-in is **email OTP in Neon + Turnstile** on the Worker — not Cloudflare Access. Cutover steps, Neon, and R2: [docs/hosting-cloudflare.md](docs/hosting-cloudflare.md).

## Security

Production builds omit browser source maps and the `X-Powered-By` header. Middleware adds framing, MIME, referrer, and CSP headers. `/api`, `/account`, and sign-in routes are `noindex`. Payment errors return a generic 502 — processor messages never go to the client. Status APIs return Plus on/off, never email, payment refs, or user ids. The signed-in account page shows that user’s account id.

A JavaScript app can still be inspected in the browser. These controls stop casual cloning and stop leaking user or payment details; they do not make the client bundle a secret. Turn on Vercel Deployment Protection for preview URLs.
