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

The optional `prompt` is the expected ayah, trimmed under Groq’s 224-token prompt cap, in Arabic, as a light vocabulary bias.

## Interrupt ladder

The route compares those words to the expected ayah. Comparison ignores tashkeel and alef/hamza spelling, and does not call a model.

| What went wrong | `interrupts[].type` | Replay `action` |
|---|---|---|
| One word, first time | `word` | `replay_word` |
| Same word missed again (`missCount` ≥ 2) | `word` | `slow_word` |
| Two or more words inside one phrase | `phrase` | `replay_phrase` |
| Every word in the ayah, or most words across every phrase | `ayah` | phrase decisions, plus the ayah hint |

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
