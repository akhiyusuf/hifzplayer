# Hifz

A mobile-first Quran reading and memorisation player with word-level audio timing, tajweed colouring, masked recall, and relay practice.

Live reference: https://hifz-quran-player.vercel.app/

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

Reading stays public. When Clerk is on, buying Hifz Plus requires sign-in, and Plus is stored on that account (not only a browser cookie). Without the keys, `/sign-in` and `/account` show setup copy instead of a fake signed-in state.

## Billing (Hifz Plus)

Optional Plus checkout uses **Paystack** in Nigeria and West Africa, and **Stripe** everywhere else.

Hifz Plus unlocks Focus mode, 3× and unlimited repeats, and more than one qari in relay. Quran reading, audio, translation, tajweed, masked recall, word/verse practice, and relay with one qari stay free. Recurring phrases and near-twins are coming soon.

| | Monthly | Annual | Lifetime |
|---|---|---|---|
| Nigeria / West Africa | ₦2,000 | ₦14,000 | ₦35,000 |
| Malaysia | RM 9 | RM 63 | RM 159 |
| UAE | AED 15 | AED 105 | AED 259 |
| Saudi Arabia | SAR 15 | SAR 105 | SAR 259 |
| UK | £3.99 | £27 | £69 |
| US (default) | $4.99 | $34 | $89 |

Copy `.env.example` and add keys in the Vercel project (or a local `.env.local`):

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `PAYSTACK_SECRET_KEY`, optional `PAYSTACK_PLAN_MONTHLY` / `PAYSTACK_PLAN_ANNUAL` plan codes
- `BILLING_SIGNING_SECRET` (recommended)
- `NEXT_PUBLIC_APP_URL` (canonical origin for checkout return URLs)
- Clerk keys above, so Plus is bound to the signed-in user

Webhook endpoints:

- Stripe: `/api/billing/webhook/stripe`
- Paystack: `/api/billing/webhook/paystack`

## Security

Production builds omit browser source maps and the `X-Powered-By` header. Middleware adds framing, MIME, referrer, and CSP headers. `/api`, `/account`, and sign-in routes are `noindex`. Payment errors return a generic 502 — processor messages never go to the client. Status APIs return Plus on/off, never email, payment refs, or user ids.

A JavaScript app can still be inspected in the browser. These controls stop casual cloning and stop leaking user or payment details; they do not make the client bundle a secret. Turn on Vercel Deployment Protection for preview URLs.

