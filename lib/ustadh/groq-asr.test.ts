import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  GROQ_ASR_MODEL,
  GROQ_TRANSCRIPTIONS_URL,
  GroqAsrError,
  groqAsrConfigured,
  normalizeGroqTranscription,
  transcribeWithGroq,
} from "./groq-asr.ts";

const originalFetch = globalThis.fetch;
const originalKey = process.env.GROQ_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = originalKey;
});

describe("normalizeGroqTranscription", () => {
  it("keeps word timestamps and probability", () => {
    const out = normalizeGroqTranscription({
      text: "بسم الله",
      words: [
        { word: " بسم", start: 0, end: 0.42, probability: 0.91 },
        { word: "الله", start: 0.42, end: 0.9 },
      ],
    });
    assert.equal(out.text, "بسم الله");
    assert.deepEqual(out.words, [
      { word: "بسم", start: 0, end: 0.42, probability: 0.91 },
      { word: "الله", start: 0.42, end: 0.9 },
    ]);
  });

  it("splits segment text when the word array is missing", () => {
    const out = normalizeGroqTranscription({
      text: "بسم الله",
      segments: [{ text: "بسم الله", start: 1, end: 1.6 }],
    });
    assert.equal(out.words.length, 2);
    assert.equal(out.words[0].word, "بسم");
    assert.equal(out.words[0].start, 1);
    assert.equal(out.words[1].end, 1.6);
    assert.equal(out.words[0].probability, undefined);
  });
});

describe("transcribeWithGroq", () => {
  it("fails closed when GROQ_API_KEY is missing", async () => {
    delete process.env.GROQ_API_KEY;
    assert.equal(groqAsrConfigured(), false);
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      return new Response("{}", { status: 200 });
    };
    await assert.rejects(
      () => transcribeWithGroq(new Blob(["x"]), { filename: "chunk.webm" }),
      (error: unknown) => {
        assert.ok(error instanceof GroqAsrError);
        assert.equal(error.status, 503);
        assert.equal(error.code, "ASR_NOT_CONFIGURED");
        assert.equal(error.message, "GROQ_API_KEY is not set");
        return true;
      },
    );
    assert.equal(called, false);
  });

  it("posts whisper-large-v3-turbo with Arabic word timestamps", async () => {
    process.env.GROQ_API_KEY = "test-groq-key";
    let seenUrl = "";
    let seenAuth = "";
    let form: FormData | null = null;
    globalThis.fetch = async (url, init) => {
      seenUrl = String(url);
      seenAuth = new Headers(init?.headers).get("authorization") || "";
      form = init?.body as FormData;
      return Response.json({
        text: "بسم",
        words: [{ word: "بسم", start: 0.1, end: 0.4, probability: 0.8 }],
      });
    };

    const out = await transcribeWithGroq(new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm" }), {
      filename: "chunk.webm",
      prompt: "بسم الله",
    });

    assert.equal(seenUrl, GROQ_TRANSCRIPTIONS_URL);
    assert.equal(seenAuth, "Bearer test-groq-key");
    assert.ok(form);
    assert.equal(form.get("model"), GROQ_ASR_MODEL);
    assert.equal(form.get("language"), "ar");
    assert.equal(form.get("response_format"), "verbose_json");
    assert.equal(form.get("temperature"), "0");
    assert.deepEqual(form.getAll("timestamp_granularities[]"), ["word", "segment"]);
    assert.equal(form.get("prompt"), "بسم الله");
    assert.equal(out.words[0].probability, 0.8);
    assert.equal(seenUrl.includes("test-groq-key"), false);
  });

  it("does not echo the key when Groq rejects it", async () => {
    process.env.GROQ_API_KEY = "super-secret-key";
    globalThis.fetch = async () => Response.json({ error: { message: "bad key super-secret-key" } }, { status: 401 });
    await assert.rejects(
      () => transcribeWithGroq(new Blob(["x"]), { filename: "a.wav" }),
      (error: unknown) => {
        assert.ok(error instanceof GroqAsrError);
        assert.equal(error.status, 502);
        assert.equal(error.code, "ASR_UPSTREAM_AUTH");
        assert.equal(error.message.includes("super-secret-key"), false);
        return true;
      },
    );
  });
});
