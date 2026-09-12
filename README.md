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

Sign-in is two Clerk keys. Add Clerk on the Vercel project (Marketplace), or paste:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

Optional: `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`.

Reading stays public. When Clerk is on, buying Diras Plus requires sign-in, and Plus is stored on that account (not only a browser cookie). Without the keys, `/sign-in` and `/account` show setup copy instead of a fake signed-in state.

Rename the Clerk application to **Diras** in the Clerk dashboard so the sign-in widget matches the product name.

## Billing (Diras Plus)

Optional Plus checkout uses **Paystack** in Nigeria and West Africa, and **Stripe** everywhere else. The processor is chosen from the request country (`x-vercel-ip-country`). There is no region picker.

Diras Plus unlocks Focus play — Drill, Masked, and Relay — plus 3× and unlimited word repeats, and more than one qari in relay. You can open Focus and look around without paying. Quran reading, audio, translation, tajweed, and verse Repeat stay free. Recurring phrases and near-twins are coming soon.

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
- `RESEND_API_KEY` and `EMAIL_FROM` (Diras Plus confirmation email after a grant)
- Clerk keys above, so Plus is bound to the signed-in user
- `CLERK_WEBHOOK_SIGNING_SECRET` for new-user / sign-in logs

Turn on **Vercel Web Analytics** on the project so page views show up. Server logs (`diras.billing`, `diras.ops`) include Clerk account IDs (never emails) so a failed renewal can be found immediately. The same ID is on `/account`.

`NEXT_PUBLIC_APP_URL` is optional. Checkout return URLs use the request host so Paystack cannot bounce to a stale origin.

Webhook endpoints (set these in the Paystack, Stripe, and Clerk dashboards, or a paid charge can succeed without Plus):

- Stripe: `/api/billing/webhook/stripe` — subscribe to `checkout.session.completed`, `invoice.paid`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `charge.dispute.created`
- Paystack: `/api/billing/webhook/paystack` — subscribe to `charge.success`, `invoice.payment_failed`, `subscription.disable`, `subscription.not_renew`, and `charge.dispute.create`
- Clerk: `/api/auth/webhook` — `user.created` and `session.created` (signing secret `CLERK_WEBHOOK_SIGNING_SECRET`)

A chargeback or dispute request turns Plus off on the signed-in Clerk account. Recurring Stripe subscriptions are cancelled at the same time. Plus is not restored if the dispute later resolves; the customer can buy Plus again.

Monthly and annual checkouts create a real subscription on both processors. Lifetime stays a one-time payment. Later invoices extend Plus on the Clerk account until the new period end. Failed charges are logged with the account ID; cancelled subscriptions keep Plus until the paid period ends, then drop it.

After payment, Paystack/Stripe send the customer to `/api/billing/return`, which verifies the charge, stores Plus on the Clerk account, sets the Plus cookie, then redirects to `/pricing/success`. If that page never loads, paste the Paystack reference from the receipt on the success page. The same grant sends a **Diras Plus is active** email (Resend) once per account, separate from the processor receipt. Renewals do not send another welcome.

To gift Plus, choose **Gift someone** on `/pricing`, pay first, then add their email on `/pricing/gift`. They receive a note and only need to sign up (or sign in) with that same email — Google is fine if the Google account uses it.

In Clerk, turn on the **Welcome** email template if you also want a signup note. That is not the payment confirmation — Diras sends that itself after Plus is granted.

Rename the Paystack page/product and the Stripe product to **Diras Plus** in those dashboards. New checkouts already send that name.

## Security

Production builds omit browser source maps and the `X-Powered-By` header. Middleware adds framing, MIME, referrer, and CSP headers. `/api`, `/account`, and sign-in routes are `noindex`. Payment errors return a generic 502 — processor messages never go to the client. Status APIs return Plus on/off, never email, payment refs, or user ids. The signed-in account page shows that user’s Clerk id.

A JavaScript app can still be inspected in the browser. These controls stop casual cloning and stop leaking user or payment details; they do not make the client bundle a secret. Turn on Vercel Deployment Protection for preview URLs.
