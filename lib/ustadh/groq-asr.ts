import type { AsrWord } from "./types.ts";

/** File transcription. Groq does not offer a bidirectional streaming STT socket. */
export const GROQ_TRANSCRIPTIONS_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
export const GROQ_ASR_MODEL = "whisper-large-v3-turbo" as const;
export const GROQ_ASR_LANGUAGE = "ar";

const GROQ_TIMEOUT_MS = 25_000;

export class GroqAsrError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "GroqAsrError";
    this.status = status;
    this.code = code;
  }
}

export function groqApiKey() {
  return (process.env.GROQ_API_KEY || "").trim();
}

export function groqAsrConfigured() {
  return groqApiKey().length > 0;
}

type GroqWord = {
  word?: string;
  text?: string;
  start?: number;
  end?: number;
  probability?: number;
  confidence?: number;
};

type GroqSegment = {
  text?: string;
  start?: number;
  end?: number;
};

type GroqVerbose = {
  text?: string;
  words?: GroqWord[];
  segments?: GroqSegment[];
};

function finite(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

function probabilityOf(word: GroqWord): number | undefined {
  const raw = finite(word.probability) ?? finite(word.confidence);
  if (raw == null || raw < 0 || raw > 1) return undefined;
  return raw;
}

/** Drop near-zero Whisper word probs (noise) without over-filtering. */
const LOW_PROBABILITY = 0.08;

function pushWord(out: AsrWord[], word: string, start: number, end: number, probability?: number, shift = 0) {
  const text = word.trim();
  if (!text) return;
  if (probability != null && probability < LOW_PROBABILITY) return;
  let from = start;
  let to = end;
  if (to < from) {
    const tmp = from;
    from = to;
    to = tmp;
  }
  const row: AsrWord = {
    word: text,
    start: round3(from + shift),
    end: round3(to + shift),
  };
  if (probability != null) row.probability = probability;
  out.push(row);
}

function wordsFromList(words: GroqWord[], shift: number): AsrWord[] {
  const out: AsrWord[] = [];
  for (const word of words) {
    const text = word.word || word.text || "";
    const start = finite(word.start);
    const end = finite(word.end);
    if (start == null || end == null) continue;
    pushWord(out, text, start, end, probabilityOf(word), shift);
  }
  return out;
}

/** Evenly spread a segment's text when Groq omits the word array. */
function wordsFromSegments(segments: GroqSegment[], shift: number): AsrWord[] {
  const out: AsrWord[] = [];
  for (const segment of segments) {
    const text = String(segment.text || "").trim();
    const start = finite(segment.start);
    const end = finite(segment.end);
    if (!text || start == null || end == null) continue;
    const parts = text.split(/\s+/).filter(Boolean);
    if (!parts.length) continue;
    const span = Math.max(0, end - start);
    const step = span / parts.length;
    parts.forEach((part, i) => {
      pushWord(out, part, start + i * step, start + (i + 1) * step, undefined, shift);
    });
  }
  return out;
}

export function normalizeGroqTranscription(body: unknown, chunkStart = 0): { text: string; words: AsrWord[] } {
  const data = (body && typeof body === "object" ? body : {}) as GroqVerbose;
  const shift = Number.isFinite(chunkStart) ? chunkStart : 0;
  const listed = Array.isArray(data.words) ? wordsFromList(data.words, shift) : [];
  const words = listed.length
    ? listed
    : wordsFromSegments(Array.isArray(data.segments) ? data.segments : [], shift);
  const text =
    typeof data.text === "string" && data.text.trim()
      ? data.text.trim()
      : words.map((word) => word.word).join(" ");
  return { text, words: words.slice(0, 400) };
}

function upstreamError(status: number): GroqAsrError {
  if (status === 401 || status === 403) {
    return new GroqAsrError("Groq rejected the API key", 502, "ASR_UPSTREAM_AUTH");
  }
  if (status === 429) {
    return new GroqAsrError("Groq is rate limiting transcription", 429, "ASR_UPSTREAM_RATE_LIMIT");
  }
  return new GroqAsrError("Could not transcribe audio", 502, "ASR_UPSTREAM");
}

export async function transcribeWithGroq(
  audio: Blob,
  options: { filename: string; prompt?: string; signal?: AbortSignal },
): Promise<{ text: string; words: AsrWord[] }> {
  const key = groqApiKey();
  if (!key) {
    throw new GroqAsrError("GROQ_API_KEY is not set", 503, "ASR_NOT_CONFIGURED");
  }

  const form = new FormData();
  form.set("file", audio, options.filename);
  form.set("model", GROQ_ASR_MODEL);
  form.set("language", GROQ_ASR_LANGUAGE);
  form.set("response_format", "verbose_json");
  form.set("temperature", "0");
  form.append("timestamp_granularities[]", "word");
  form.append("timestamp_granularities[]", "segment");
  if (options.prompt) form.set("prompt", options.prompt);

  let res: Response;
  try {
    res = await fetch(GROQ_TRANSCRIPTIONS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: options.signal ?? AbortSignal.timeout(GROQ_TIMEOUT_MS),
    });
  } catch {
    throw new GroqAsrError("Could not reach Groq", 502, "ASR_UPSTREAM");
  }

  if (!res.ok) throw upstreamError(res.status);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new GroqAsrError("Could not transcribe audio", 502, "ASR_UPSTREAM");
  }
  return normalizeGroqTranscription(json);
}
