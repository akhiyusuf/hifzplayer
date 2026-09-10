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

Nothing is stored on a server. Reading position, recents, streak, reciter, and settings stay in the browser.
