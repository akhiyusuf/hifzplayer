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

  it("silently retries Latin/transliteration up to 3 times and never returns Latin text", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";
    const prompts: Array<string | undefined> = [];
    let calls = 0;
    const result = await handleAsrRequest(
      upload({
        expectedText: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ",
        surah: "1",
        ayahStart: "2",
        ayahEnd: "2",
      }),
      {
        transcribe: async (_audio, options) => {
          calls += 1;
          prompts.push(options.prompt);
          if (calls <= 3) {
            return {
              text: "alhamdulillah rabbil alameen",
              words: [
                { word: "alhamdulillah", start: 0, end: 0.5 },
                { word: "rabbil", start: 0.5, end: 0.9 },
                { word: "alameen", start: 0.9, end: 1.3 },
              ],
            };
          }
          return {
            text: "الحمد لله رب العالمين",
            words: [
              { word: "الحمد", start: 0, end: 0.4 },
              { word: "لله", start: 0.4, end: 0.7 },
              { word: "رب", start: 0.7, end: 0.95 },
              { word: "العالمين", start: 0.95, end: 1.4 },
            ],
          };
        },
      },
    );
    assert.equal(result.status, 200);
    assert.equal(calls, 4); // 1 first + 3 retries
    assert.equal(prompts.length, 4);
    assert.notEqual(prompts[1], prompts[0]);
    assert.notEqual(prompts[2], prompts[1]);
    const body = result.body as UstadhAsrResponse;
    assert.equal(body.text, "الحمد لله رب العالمين");
    assert.equal(body.text.includes("alhamdulillah"), false);
    assert.equal(body.words.every((w) => /[\u0600-\u06FF]/.test(w.word)), true);
    assert.equal(body.interrupts.length, 0);
  });

  it("returns empty Arabic text after 3 failed Latin retries without flashing transliteration", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";
    let calls = 0;
    const result = await handleAsrRequest(
      upload({ expectedText: "بسم الله" }),
      {
        transcribe: async () => {
          calls += 1;
          return { text: "bismillah", words: [{ word: "bismillah", start: 0, end: 0.5 }] };
        },
      },
    );
    assert.equal(result.status, 200);
    assert.equal(calls, 4);
    const body = result.body as UstadhAsrResponse;
    assert.equal(body.text, "");
    assert.equal(body.words.length, 0);
  });
});
