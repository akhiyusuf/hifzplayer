# Hifz

A mobile-first Quran reading and memorisation player with word-level audio timing, tajweed colouring, masked recall, relay practice, and study layers for recurring phrases and near-twin words.

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
- Recurring-phrase markings: Mutashabihat dataset (QUL)
- Near-twin / confusable words: QuranMorph (CC-BY-4.0)

Nothing is stored on a server for reading. Position, recents, streak, reciter, and settings stay in the browser. Quran content stays free.

## Billing (Hifz Plus)

Optional Plus checkout uses **Paystack** in Nigeria and West Africa, and **Stripe** everywhere else.

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

Webhook endpoints:

- Stripe: `/api/billing/webhook/stripe`
- Paystack: `/api/billing/webhook/paystack`

