import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { handleAsrRequest } from "./request.ts";
import type { AsrWord, UstadhAsrResponse } from "./types.ts";

const originalKey = process.env.GROQ_API_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = originalKey;
});

function upload(fields: Record<string, string>, bytes = [1, 2, 3, 4]) {
  const form = new FormData();
  form.set("audio", new File([new Uint8Array(bytes)], "chunk.webm", { type: "audio/webm" }));
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return new Request("http://localhost/api/ustadh/asr", { method: "POST", body: form });
}

describe("handleAsrRequest", () => {
  it("returns 503 when the Groq key is missing", async () => {
    delete process.env.GROQ_API_KEY;
    const result = await handleAsrRequest(upload({ expectedText: "بسم" }));
    assert.equal(result.status, 503);
    assert.deepEqual(result.body, {
      error: "GROQ_API_KEY is not set",
      code: "ASR_NOT_CONFIGURED",
    });
  });

  it("returns word timestamps, a word interrupt, and a replay decision", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";
    const words: AsrWord[] = [
      { word: "الحمد", start: 0, end: 0.4, probability: 0.95 },
      { word: "لله", start: 0.4, end: 0.8, probability: 0.9 },
      { word: "رب", start: 0.8, end: 1.1, probability: 0.88 },
      { word: "العالمون", start: 1.1, end: 1.6, probability: 0.4 },
    ];
    const result = await handleAsrRequest(
      upload({
        expectedText: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ",
        surah: "1",
        ayahStart: "2",
        ayahEnd: "2",
        sessionId: "practice-1",
        chunkStart: "12.5",
      }),
      {
        transcribe: async (_audio, options) => {
          assert.equal(options.filename, "chunk.webm");
          assert.equal(options.prompt, "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ");
          return { text: words.map((word) => word.word).join(" "), words };
        },
      },
    );
    assert.equal(result.status, 200);
    const body = result.body as UstadhAsrResponse;
    assert.equal(body.model, "whisper-large-v3-turbo");
    assert.equal(body.language, "ar");
    assert.equal(body.transport, "chunked");
    assert.equal(body.sessionId, "practice-1");
    assert.equal(body.words[0].start, 12.5);
    assert.equal(body.words[3].end, 14.1);
    assert.equal(body.interrupts[0].type, "word");
    assert.equal(body.interrupts[0].start, 13.6);
    assert.equal(body.replays[0].action, "replay_word");
    assert.equal(body.replays[0].targetId, "wbw/001_002_004.mp3");
    assert.equal(body.replays[0].missCount, 1);
  });

  it("rejects an empty file when the key is set", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";
    const form = new FormData();
    form.set("audio", new File([], "chunk.webm", { type: "audio/webm" }));
    const result = await handleAsrRequest(
      new Request("http://localhost/api/ustadh/asr", { method: "POST", body: form }),
    );
    assert.equal(result.status, 400);
    assert.equal((result.body as { code: string }).code, "ASR_AUDIO_REQUIRED");
  });
});
