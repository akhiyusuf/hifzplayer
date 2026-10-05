import type { Mark } from "../types.ts";
import {
  ARABIC_ASR_RETRY_LIMIT,
  arabicOnlyTranscript,
  QURAN_CONTEXT_PROMPT,
  quranAsrPrompt,
  strongQuranAsrPrompt,
  tokenizeArabic,
  transcriptNeedsArabicRetry,
} from "./arabic.ts";
import { GROQ_ASR_MODEL, GroqAsrError, groqAsrConfigured, transcribeWithGroq } from "./groq-asr.ts";
import type { AsrErrorBody, UstadhAsrResponse } from "./types.ts";
import { assessUstadhTurn } from "./turn.ts";
import { plausibleAsrWords } from "./plausible.ts";
import {
  applyPhraseRanges,
  expectedFromRawWords,
  expectedFromText,
  expectedFromVerse,
  rangesFromAnnotation,
  verseKeyFrom,
  type PhraseRange,
  type RawExpectedWord,
} from "./units.ts";

export const MAX_ASR_BYTES = 25 * 1024 * 1024;
const AUDIO_EXT = new Set(["flac", "mp3", "mp4", "mpeg", "mpga", "m4a", "ogg", "wav", "webm"]);

const EXT_BY_TYPE: Record<string, string> = {
  "audio/webm": "webm",
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/x-wav": "wav",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "video/webm": "webm",
  "video/mp4": "mp4",
};

export type TranscribeFn = typeof transcribeWithGroq;

function fail(status: number, error: string, code: string): { status: number; body: AsrErrorBody } {
  return { status, body: { error, code } };
}

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function parseJsonField(form: FormData, name: string): { ok: true; value: unknown } | { ok: false } {
  const value = form.get(name);
  if (value == null || value === "") return { ok: true, value: undefined };
  if (typeof value !== "string") return { ok: false };
  try {
    return { ok: true, value: JSON.parse(value) };
  } catch {
    return { ok: false };
  }
}

function optionalInt(raw: string, min: number, max: number): number | undefined | null {
  if (!raw) return undefined;
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  if (n < min || n > max) return null;
  return n;
}

function audioFilename(file: File): string | null {
  const rawName = (file.name || "chunk").split(/[/\\]/).pop() || "chunk";
  const ext = rawName.includes(".") ? rawName.split(".").pop()!.toLowerCase() : "";
  if (AUDIO_EXT.has(ext)) {
    const stem = rawName.slice(0, -(ext.length + 1)).replace(/[^A-Za-z0-9_-]/g, "") || "chunk";
    return `${stem}.${ext}`;
  }
  const type = (file.type || "").split(";")[0].trim().toLowerCase();
  const fromType = EXT_BY_TYPE[type];
  if (fromType) return `chunk.${fromType}`;
  return null;
}

function asMarks(value: unknown): Mark[] | null {
  if (value == null) return [];
  if (!Array.isArray(value)) return null;
  const marks: Mark[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") return null;
    const mark = row as { afterPos?: unknown; ar?: unknown; kind?: unknown };
    const afterPos = Number(mark.afterPos);
    if (!Number.isFinite(afterPos)) return null;
    marks.push({
      afterPos,
      ar: String(mark.ar || ""),
      kind: String(mark.kind || "pause"),
    });
  }
  return marks;
}

function asPhrases(value: unknown, verseKey: string): PhraseRange[] | null {
  if (value == null) return [];
  if (!Array.isArray(value)) return null;
  if (value.some((row) => row && typeof row === "object" && "f" in row && "t" in row)) {
    return rangesFromAnnotation(verseKey, value as { g?: string; f?: number; t?: number }[]);
  }
  const phrases: PhraseRange[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") return null;
    const phrase = row as { id?: unknown; verseKey?: unknown; from?: unknown; to?: unknown };
    const from = Number(phrase.from);
    const to = Number(phrase.to);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
    phrases.push({
      id: phrase.id != null ? String(phrase.id) : undefined,
      verseKey: phrase.verseKey != null ? String(phrase.verseKey) : undefined,
      from,
      to,
    });
  }
  return phrases;
}

function asWords(value: unknown): RawExpectedWord[] | null {
  if (value == null) return [];
  if (!Array.isArray(value)) return null;
  const words: RawExpectedWord[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") return null;
    const word = row as RawExpectedWord;
    words.push({
      pos: word.pos != null ? Number(word.pos) : undefined,
      ar: word.ar != null ? String(word.ar) : undefined,
      text: word.text != null ? String(word.text) : undefined,
      verseKey: word.verseKey != null ? String(word.verseKey) : undefined,
      audio: word.audio != null ? String(word.audio) : null,
    });
  }
  return words;
}

function asMissCounts(value: unknown): Record<string, number> | null {
  if (value == null) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, number> = {};
  for (const [key, count] of Object.entries(value)) {
    const n = Number(count);
    if (!key || !Number.isFinite(n) || n < 0) continue;
    out[key] = Math.min(99, Math.floor(n));
  }
  return out;
}

function sessionIdOf(raw: string): string | undefined | null {
  if (!raw) return undefined;
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(raw)) return null;
  return raw;
}

export async function handleAsrRequest(
  request: Request,
  deps?: { transcribe?: TranscribeFn },
): Promise<{ status: number; body: UstadhAsrResponse | AsrErrorBody }> {
  if (!groqAsrConfigured()) {
    return fail(503, "GROQ_API_KEY is not set", "ASR_NOT_CONFIGURED");
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return fail(400, "Send the audio chunk as multipart form data", "ASR_AUDIO_REQUIRED");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "Could not read the audio upload", "ASR_AUDIO_REQUIRED");
  }

  const audio = form.get("audio") || form.get("file");
  if (!(audio instanceof File)) {
    return fail(400, "Attach an audio file in the audio field", "ASR_AUDIO_REQUIRED");
  }
  if (audio.size <= 0) {
    return fail(400, "Audio file is empty", "ASR_AUDIO_REQUIRED");
  }
  if (audio.size > MAX_ASR_BYTES) {
    return fail(400, "Audio chunk is larger than 25 MB", "ASR_AUDIO_TOO_LARGE");
  }
  const filename = audioFilename(audio);
  if (!filename) {
    return fail(400, "Audio must be flac, mp3, mp4, m4a, ogg, wav, or webm", "ASR_AUDIO_TYPE");
  }

  const surah = optionalInt(field(form, "surah"), 1, 114);
  const ayahStart = optionalInt(field(form, "ayahStart"), 1, 300);
  const ayahEnd = optionalInt(field(form, "ayahEnd"), 1, 300);
  if (surah === null || ayahStart === null || ayahEnd === null) {
    return fail(400, "surah, ayahStart, and ayahEnd must be whole numbers", "ASR_RANGE");
  }
  if (ayahStart && ayahEnd && ayahEnd < ayahStart) {
    return fail(400, "ayahEnd is before ayahStart", "ASR_RANGE");
  }

  const chunkRaw = field(form, "chunkStart");
  let chunkStart: number | undefined;
  if (chunkRaw) {
    const n = Number(chunkRaw);
    if (!Number.isFinite(n) || n < 0 || n > 60 * 30) {
      return fail(400, "chunkStart must be a time offset in seconds", "ASR_CHUNK_START");
    }
    chunkStart = n;
  }

  const clipRaw = field(form, "clipSec");
  let clipSec: number | undefined;
  if (clipRaw) {
    const n = Number(clipRaw);
    if (!Number.isFinite(n) || n <= 0 || n > 60 * 30) {
      return fail(400, "clipSec must be the clip length in seconds", "ASR_CLIP_SEC");
    }
    clipSec = n;
  }

  const sessionId = sessionIdOf(field(form, "sessionId"));
  if (sessionId === null) {
    return fail(400, "sessionId must be letters, numbers, _ or -", "ASR_SESSION");
  }

  const wordsJson = parseJsonField(form, "expectedWords");
  const marksJson = parseJsonField(form, "marks");
  const phrasesJson = parseJsonField(form, "phrases");
  const missesJson = parseJsonField(form, "missCounts");
  if (!wordsJson.ok || !marksJson.ok || !phrasesJson.ok || !missesJson.ok) {
    return fail(400, "expectedWords, marks, phrases, and missCounts must be JSON", "ASR_JSON");
  }

  const fallbackVerseKey =
    field(form, "verseKey") ||
    verseKeyFrom(surah, ayahStart && (!ayahEnd || ayahEnd === ayahStart) ? ayahStart : undefined) ||
    "passage";

  const rawWords = asWords(wordsJson.value);
  const marks = asMarks(marksJson.value);
  const phrases = asPhrases(phrasesJson.value, fallbackVerseKey);
  const missCounts = asMissCounts(missesJson.value);
  if (!rawWords || !marks || !phrases || !missCounts) {
    return fail(400, "expectedWords, marks, phrases, or missCounts has the wrong shape", "ASR_JSON");
  }
  if (rawWords.length > 400) {
    return fail(400, "expectedWords is too long", "ASR_JSON");
  }

  const expectedText = field(form, "expectedText");
  let passage: ReturnType<typeof expectedFromText>;
  if (rawWords.length) {
    passage = expectedFromRawWords(rawWords, { fallbackVerseKey, marks, phrases });
  } else if (expectedText) {
    const fromText = expectedFromText(expectedText, fallbackVerseKey);
    if (phrases.length) passage = applyPhraseRanges(fromText.words, phrases);
    else if (marks.length) {
      passage = expectedFromVerse({
        key: fallbackVerseKey,
        words: fromText.words.map((word) => ({
          pos: word.pos,
          ar: word.ar,
          taj: null,
          gloss: "",
          tr: "",
          audio: word.audio,
        })),
        marks,
      });
    } else passage = fromText;
  } else if (phrases.length || marks.length) {
    return fail(400, "phrases and marks need expectedWords or expectedText", "ASR_JSON");
  } else {
    passage = { words: [], phrases: [] };
  }

  if (passage.words.length > 400 || tokenizeArabic(expectedText).length > 400) {
    return fail(400, "Expected text is too long for one chunk", "ASR_JSON");
  }

  const expectedForPrompt = passage.words.length
    ? passage.words.map((word) => word.ar).join(" ")
    : expectedText;
  // Neutral Quranic context first (the ayah itself makes Whisper fill skipped words).
  const prompt = QURAN_CONTEXT_PROMPT || quranAsrPrompt(expectedForPrompt);

  const transcribe = deps?.transcribe ?? transcribeWithGroq;
  let transcript: { text: string; words: UstadhAsrResponse["words"] };
  try {
    transcript = await transcribe(audio, { filename, prompt });
  } catch (error) {
    if (error instanceof GroqAsrError) return fail(error.status, error.message, error.code);
    return fail(502, "Could not transcribe audio", "ASR_UPSTREAM");
  }

  // Latin/transliteration: silently retry same audio up to 3 times with stronger prompts.
  // Live highlight peeks skip retries (latency); the final send of the take still retries.
  const retryLimit = field(form, "mode") === "peek" ? 0 : ARABIC_ASR_RETRY_LIMIT;
  for (let attempt = 1; attempt <= retryLimit; attempt++) {
    if (!transcriptNeedsArabicRetry(transcript.text, transcript.words)) break;
    const retryPrompt = strongQuranAsrPrompt(expectedForPrompt, attempt) || prompt;
    try {
      transcript = await transcribe(audio, { filename, prompt: retryPrompt });
    } catch (error) {
      if (error instanceof GroqAsrError) return fail(error.status, error.message, error.code);
      return fail(502, "Could not transcribe audio", "ASR_UPSTREAM");
    }
  }

  // Never surface Latin to the client — only Arabic script (empty after failed retries).
  const arabicRaw = arabicOnlyTranscript(transcript);
  // Drop words Whisper filled in from the prompt (impossible timing / past the clip end).
  const plausible = plausibleAsrWords(arabicRaw.words, { clipSec });
  const arabic =
    plausible.length === arabicRaw.words.length
      ? arabicRaw
      : { text: plausible.map((word) => word.word).join(" "), words: plausible };
  const words =
    chunkStart && chunkStart > 0
      ? arabic.words.map((word) => ({
          ...word,
          start: Math.round((word.start + chunkStart) * 1000) / 1000,
          end: Math.round((word.end + chunkStart) * 1000) / 1000,
        }))
      : arabic.words;

  const assessed = assessUstadhTurn({
    words: passage.words,
    phrases: passage.phrases,
    heard: words,
    missCounts,
  });

  const body: UstadhAsrResponse = {
    model: GROQ_ASR_MODEL,
    language: "ar",
    transport: "chunked",
    text: arabic.text,
    words,
    interrupts: assessed.interrupts,
    replays: assessed.replays,
    ...(sessionId ? { sessionId } : {}),
    ...(surah ? { surah } : {}),
    ...(ayahStart ? { ayahStart } : {}),
    ...(ayahEnd ? { ayahEnd } : {}),
    ...(chunkStart != null ? { chunkStart } : {}),
  };
  return { status: 200, body };
}
