import type { AsrErrorBody, UstadhAsrResponse } from "./types.ts";

export type UstadhAsrClientRequest = {
  audio: Blob;
  filename?: string;
  expectedText?: string;
  expectedWords?: unknown;
  marks?: unknown;
  phrases?: unknown;
  surah?: number;
  ayahStart?: number;
  ayahEnd?: number;
  verseKey?: string;
  sessionId?: string;
  /** Prior miss counts keyed by word `targetId` (`wbw/001_001_001.mp3`). */
  missCounts?: Record<string, number>;
  /** Seconds to add to Groq timestamps so they line up with the session clock. */
  chunkStart?: number;
  /**
   * `peek`: rolling in-progress clip for the live highlight. The Worker skips the
   * Latin→Arabic retries for peeks (the final send still retries up to 3×).
   */
  mode?: "peek" | "final";
  /** Length of the uploaded clip in seconds (lets the Worker drop words past the end). */
  clipSec?: number;
};

export class UstadhAsrClientError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "UstadhAsrClientError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Same-origin upload of one utterance. The Worker calls Groq.
 * This does not open a microphone or play Quran audio.
 */
export async function postUstadhAsr(
  input: UstadhAsrClientRequest,
  init?: { signal?: AbortSignal },
): Promise<UstadhAsrResponse> {
  const body = new FormData();
  const filename = input.filename || "chunk.webm";
  body.set("audio", input.audio, filename);
  if (input.expectedText) body.set("expectedText", input.expectedText);
  if (input.expectedWords) body.set("expectedWords", JSON.stringify(input.expectedWords));
  if (input.marks) body.set("marks", JSON.stringify(input.marks));
  if (input.phrases) body.set("phrases", JSON.stringify(input.phrases));
  if (input.surah) body.set("surah", String(input.surah));
  if (input.ayahStart) body.set("ayahStart", String(input.ayahStart));
  if (input.ayahEnd) body.set("ayahEnd", String(input.ayahEnd));
  if (input.verseKey) body.set("verseKey", input.verseKey);
  if (input.sessionId) body.set("sessionId", input.sessionId);
  if (input.missCounts) body.set("missCounts", JSON.stringify(input.missCounts));
  if (input.chunkStart != null) body.set("chunkStart", String(input.chunkStart));
  if (input.mode === "peek") body.set("mode", "peek");
  if (input.clipSec != null && Number.isFinite(input.clipSec) && input.clipSec > 0) {
    body.set("clipSec", input.clipSec.toFixed(2));
  }

  const res = await fetch("/api/ustadh/asr", { method: "POST", body, signal: init?.signal });
  let data: UstadhAsrResponse | AsrErrorBody | null = null;
  try {
    data = (await res.json()) as UstadhAsrResponse | AsrErrorBody;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const error = data && "error" in data ? data.error : "Could not transcribe audio";
    const code = data && "code" in data ? data.code : "ASR_UPSTREAM";
    throw new UstadhAsrClientError(error, res.status, code);
  }
  return data as UstadhAsrResponse;
}
