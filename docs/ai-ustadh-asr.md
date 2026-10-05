# AI Ustadh ASR

Eyes-off recite-after-me uses **Groq Whisper** (`whisper-large-v3-turbo`) for Arabic speech-to-text. This layer does not synthesize speech and does not call an LLM. Quran playback stays on the existing player.

## Chunked, not a live socket

Groq’s speech-to-text endpoint is a **file transcription**:

`POST https://api.groq.com/openai/v1/audio/transcriptions`

There is no bidirectional streaming socket for this model. The practice client records a short utterance (MediaRecorder or WebAudio), then posts that chunk to the same-origin Worker:

`POST /api/ustadh/asr`

The Worker sends the file to Groq with `language=ar`, `response_format=verbose_json`, and `timestamp_granularities[]` of `word` and `segment`. The JSON response includes `transport: "chunked"` so callers do not treat it as a live stream.

Keep chunks to a few seconds of recitation (about 2–15s). Groq bills a **10 second minimum** per request even when the clip is shorter, and the model is tuned for segments up to about 30 seconds. Files may be flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm, up to 25 MB.

`chunkStart` (seconds) is added to each word timestamp so a later chunk still lines up with the session clock.

If Groq returns segment metadata without a `words` array, the Worker splits that segment’s text evenly across the segment. Word timestamps from Groq are preferred. `probability` is included only when Groq sends it.

The first-pass `prompt` is **Quranic context (the basmala), not the ayah being checked**. With the expected ayah as the prompt, Whisper fills in words the learner skipped: real Groq output for 1:5 with وَإِيَّاكَ cut out of Mishary’s recitation came back complete, so the coach would accept a mistake. Measured with `scripts/ustadh-audio-soak.ts`, the basmala prompt transcribes clean takes the same way and leaves skipped words out. Only the Latin→Arabic retries (up to 3, after a Latin first pass) use the ayah text in a stronger prompt.

As a safety net, heard words with impossible timing are dropped before comparison (`lib/ustadh/plausible.ts`): a word shorter than 60 ms, two or more words in a row under 150 ms each (prompt filler squeezed into the gap), or, when the client sends `clipSec`, a word that starts or ends well after the clip does.

## Interrupt ladder

The route compares those words to the expected ayah. Comparison ignores tashkeel and alef/hamza spelling, and does not call a model.

| What went wrong | `interrupts[].type` | Replay `action` |
|---|---|---|
| One word, first time | `word` | `replay_word` |
| Same word missed again (`missCount` ≥ 2) | `word` | `slow_word` |
| Two or more words inside one phrase | `phrase` | `replay_phrase` |
| Every word in the ayah, or most words across every phrase | `ayah` | phrase decisions, plus the ayah hint |

`slow_word` is decided per word. If that word’s `missCount` is already 2 or more, its replay is `slow_word` even when other words in the phrase also missed. The interrupt for that take stays `phrase` (or `ayah`) so the client can play the larger unit or slow the sticky word.

Act on **`interrupts[0]`** and stop listening. That hint is the earliest unit in the ayah. `replays` is one decision per flagged word so the client can pick the recording:

- `replay_word` / `slow_word` → `targetId` is the Quran.com word clip, e.g. `wbw/001_002_004.mp3` (`resolveWordAudioUrl` already knows that path). `slow_word` is the same clip; the client plays it slower.
- `replay_phrase` → `targetId` / `phraseId` is the whole phrase, e.g. `2:255:p1`.

Phrase edges come from the app’s waqf splitter (`lib/waqf.ts`): stop marks break a phrase, “do not stop” marks do not, and a long ayah is never cut every six words. A one-word pause fragment stays on the previous phrase. Pass `marks` with `expectedText` or `expectedWords` to use that. Pass `phrases` when the caller already has ranges (`from` / `to`, or a mutashabihat row `{ g, f, t }`). Without marks, the ayah is one phrase.

`missCounts` is a JSON object of prior misses keyed by word `targetId`. The response `missCount` is that number plus one. The client stores it and sends it on the next chunk. This route does not write the count to Neon.

## Request

`multipart/form-data`

| Field | Required | Notes |
|---|---|---|
| `audio` (or `file`) | yes | One utterance |
| `expectedText` | no | Arabic the student should have said |
| `expectedWords` | no | JSON `[{ "pos", "ar", "verseKey?", "audio?" }]` |
| `marks` | no | JSON waqf marks, same shape as the player |
| `phrases` | no | JSON `[{ "id?", "from", "to", "verseKey?" }]` or `{ g, f, t }` |
| `surah`, `ayahStart`, `ayahEnd` | no | Echoed back. A single ayah builds `wbw/…` ids |
| `verseKey` | no | e.g. `1:2` |
| `sessionId` | no | Letters, numbers, `_`, `-` |
| `missCounts` | no | JSON object |
| `chunkStart` | no | Seconds |
| `clipSec` | no | Length of the uploaded clip in seconds. Heard words past the end are dropped |
| `mode` | no | `peek` for the coach’s rolling in-progress clips: skips the Latin retries (the final send still retries) |

Example:

```bash
curl -s -F "audio=@chunk.webm" \
  -F "expectedText=ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ" \
  -F "surah=1" -F "ayahStart=2" -F "ayahEnd=2" \
  -F "sessionId=practice-1" \
  http://localhost:3000/api/ustadh/asr
```

```json
{
  "model": "whisper-large-v3-turbo",
  "language": "ar",
  "transport": "chunked",
  "text": "الحمد لله رب العالمون",
  "words": [
    { "word": "الحمد", "start": 0, "end": 0.4, "probability": 0.95 },
    { "word": "لله", "start": 0.4, "end": 0.8, "probability": 0.9 },
    { "word": "رب", "start": 0.8, "end": 1.1, "probability": 0.88 },
    { "word": "العالمون", "start": 1.1, "end": 1.6, "probability": 0.4 }
  ],
  "interrupts": [
    {
      "type": "word",
      "expected": "ٱلْعَٰلَمِينَ",
      "heard": "العالمون",
      "start": 1.1,
      "end": 1.6,
      "verseKey": "1:2",
      "phraseId": "1:2:p0",
      "wordIndex": 3
    }
  ],
  "replays": [
    {
      "action": "replay_word",
      "targetId": "wbw/001_002_004.mp3",
      "wordIndex": 3,
      "phraseId": "1:2:p0",
      "start": 1.1,
      "end": 1.6,
      "missCount": 1,
      "pos": 4,
      "verseKey": "1:2"
    }
  ],
  "sessionId": "practice-1",
  "surah": 1,
  "ayahStart": 2,
  "ayahEnd": 2
}
```

The browser helper is `postUstadhAsr` in `lib/ustadh/client.ts`. It posts to `/api/ustadh/asr` only.

The route is public, like reading. Once `GROQ_API_KEY` is set, each upload spends Groq minutes (10 seconds minimum). A later pass can cap that per session.

## `GROQ_API_KEY`

Leave it empty until a key exists. Do not commit a key.

- Local Next: `.env.local` (gitignored), `GROQ_API_KEY=…`
- Local Worker preview: `.dev.vars` (gitignored)
- Production: `npx wrangler secret put GROQ_API_KEY`

Missing key, in development and in production:

```json
{ "error": "GROQ_API_KEY is not set", "code": "ASR_NOT_CONFIGURED" }
```

HTTP **503**. The route does not invent audio.

Turnstile skips its check in local dev when `TURNSTILE_SECRET_KEY` is unset. ASR does not. Groq has no dummy key that can transcribe, so a missing `GROQ_API_KEY` fails closed everywhere.

Upstream failures return `ASR_UPSTREAM` (502), `ASR_UPSTREAM_AUTH` (502), or `ASR_UPSTREAM_RATE_LIMIT` (429). The Groq key is not included in those bodies.

## Practice coach: continuous loop + live highlight

`components/ustadh/ustadh-coach-bar.tsx` (Practice → AI Ustadh).

**Loop** (`lib/ustadh/loop.ts`). Tap **Listen** once and the coach keeps going. Each take auto-sends after a pause (silence VAD). Then:

| Result | Next |
|---|---|
| Miss with a replay | Ustadh plays the word/phrase clip, then the mic reopens after 350 ms |
| Miss, nothing to replay | Mic reopens after 900 ms |
| Matched | "Matched" shows for 1.2 s, then the mic reopens for another take of the same ayah |
| No speech for 8 s | Nothing is uploaded. Tries once more, then pauses after 2 silent takes |
| Mic / network / config error | Loop pauses with the error |

**Pause** stops the loop at any point. It drops the open take, stops Ustadh mid-clip, and keeps the last highlight. **Skip** (while Ustadh recites) cuts the replay short and goes straight back to listening. **Send** still works mid-take.

**Highlight** (`lib/ustadh/highlight.ts`, `lib/ustadh/highlight-driver.ts`):

- *While you recite*: rolling peeks every 1.5 s (`USTADH_PEEK`) upload the take so far (`mode=peek`). A prefix alignment moves the highlight to the last **confirmed** word. The visible highlight walks one word per 140 ms toward it, never jumps, and never moves back mid-take. A peek can’t confirm more words than you could have said in the voiced time (2.5 words/s + 1). A single unmatched trailing token waits for the next peek (often a word cut mid-way). Skipped or wrong words behind the frontier get a red wavy underline (`ustadhWordCss`). They are never passed silently.
- *While Ustadh recites*: the word whose clip is playing is current, with a green ring. Phrase replays walk word by word. Misses stay underlined.
- The recited range uses the existing pin underline (`wordPick`), so Mushaf and Focus both show it. Miss and speaking styles are a scoped `<style>` keyed on each word’s `data-v` / `data-w`, so the shared word components stay untouched and the coach is easy to remove.

Peeks cost Groq minutes too: each request bills a 10 s minimum, so a 10 s take costs roughly 7 requests.

## Tests and soak

```bash
npm test                                   # everything, including lib/ustadh/*.test.ts
node --experimental-strip-types --test lib/ustadh/*.test.ts   # just the coach
USTADH_SOAK_TAKES=500 node --experimental-strip-types --test lib/ustadh/soak.test.ts  # longer synthetic soak
```

| File | Covers |
|---|---|
| `arabic.test.ts` | `arabicEqual` matrix: dagger alef (+ tatweel), wasla, hamza seats, waw-dagger (الصلوة→الصلاة), tatweel-hamza kursi, ta marbuta, alif maqsura ≠ ya, Latin |
| `align.test.ts` | final + prefix alignment, skip vs substitution, repeats (إياك/وإياك), Whisper split يا أيها / glued words |
| `highlight.test.ts` | live vs final highlight, tentative tail, off-track, skip underline, voiced cap, timing guard, merge/step, CSS, engine notify |
| `highlight-driver.test.ts` | one-word-per-step walk, monotonic peeks, final override |
| `loop.test.ts` | auto-listen state machine + 5k-turn random soak |
| `coach.test.ts` | `primaryReplay` pin-to-word (earliest word, sticky → slow, phrase fallback), end-to-end repeat miss → slow |
| `plausible.test.ts` | prompt-hallucination guard on verbatim Groq timings |
| `request.test.ts` | context prompt (never the ayah), 3× Arabic retry still uses the ayah, `mode=peek`, `clipSec` |
| `soak.test.ts` | every fixture ayah × seeded synthetic takes (clean, noisy peeks, prompt hallucination, skipped word, wrong word, stopped short) through the real peek → driver → final code, checking: no jumps, never ahead of the learner, misses underlined |
| `asr-recorded.test.ts` | the same invariants over **real Groq transcripts** of reference audio (`fixtures/asr-recorded.json`) |

**Live audio soak** (real reference recitation → real ASR path → highlight):

```bash
# in-process (needs GROQ_API_KEY and ffmpeg), records fixtures for asr-recorded.test.ts
node --experimental-strip-types scripts/ustadh-audio-soak.ts --verses 1:2,1:5,1:7 --variants ayah,skip,stop --record

# against a deployed Worker instead
node --experimental-strip-types scripts/ustadh-audio-soak.ts --endpoint https://diras.<account>.workers.dev
```

It downloads Mishary Alafasy ayah audio (word segments from quran.com) or Quran.com word clips, builds variants (`ayah`, `wbw`, `skip` = a middle word cut out, `stop` = take ends halfway), uploads progressive webm/opus prefixes every 1.5 s as `mode=peek` plus the final clip, and runs the highlight invariants. It exits 1 on any failure. Calls are paced (`--pace-ms`, default 3 s) because Groq rate-limits by requests and audio-seconds.

**Browser e2e** (Chrome fake mic → real coach UI → loop + highlight), see the header of `scripts/ustadh-browser-e2e.mjs` for building the mic WAV:

```bash
npm i --no-save puppeteer-core
npm run build && npx next start -p 3100 &          # GROQ_API_KEY in env
# miss: one tap → miss underlined on word 3, replay walks the speaking ring, mic reopens, Pause stops
node scripts/ustadh-browser-e2e.mjs --wav mic.wav --expect-miss 3 \
  --url "http://localhost:3100/read/1?from=5&to=5&mode=ustadh&style=mushaf"
# clean take in Focus style: matched → automatic listen again
node scripts/ustadh-browser-e2e.mjs --wav mic-clean.wav --expect-match --seconds 22 \
  --url "http://localhost:3100/read/1?from=2&to=2&mode=ustadh&style=focus"
```

It fails on any page error. Fake-mic WAVs loop, so later takes can start mid-file; judge the live peek walk on the first take.
