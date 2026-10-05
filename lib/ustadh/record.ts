/** Prefer Opus WebM; Safari often only offers mp4/aac. */
export function pickRecorderMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
    "audio/ogg;codecs=opus",
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

export function extensionForMime(mime: string): string {
  if (mime.includes("mp4") || mime.includes("aac") || mime.includes("m4a")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

export type MicOpenResult =
  | { ok: true; stream: MediaStream; mimeType: string }
  | { ok: false; code: "MIC_DENIED" | "MIC_UNAVAILABLE" };

export async function openMicStream(): Promise<MicOpenResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { ok: false, code: "MIC_UNAVAILABLE" };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
      },
    });
    return { ok: true, stream, mimeType: pickRecorderMimeType() };
  } catch (err) {
    const name = err && typeof err === "object" && "name" in err ? String((err as { name: string }).name) : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return { ok: false, code: "MIC_DENIED" };
    }
    return { ok: false, code: "MIC_UNAVAILABLE" };
  }
}

export function stopStream(stream: MediaStream | null | undefined) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      /* ignore */
    }
  }
}


/** Silence VAD while the coach is listening (AnalyserNode RMS). */
export const USTADH_VAD = {
  /** Auto-send after this much silence following speech. */
  silenceMs: 650,
  /** Require at least this much speech before silence can auto-send. */
  minSpeechMs: 700,
  /** Hard cap on a single listen take. */
  maxListenMs: 11_000,
  /** RMS above this counts as speech (getByteTimeDomainData scaled). */
  speechRms: 0.045,
  /** Poll interval for the analyser. */
  pollMs: 50,
} as const;

export type VadGateState = {
  hasSpoken: boolean;
  speechStartedAtMs: number | null;
  lastSpeechAtMs: number | null;
};

export type VadDecision = {
  action: "continue" | "auto_send";
  state: VadGateState;
};

/** Pure VAD gate used by the coach bar (unit-tested without Web Audio). */
export function advanceVadGate(input: {
  nowMs: number;
  rms: number;
  startedAtMs: number;
  state: VadGateState;
  config?: typeof USTADH_VAD;
}): VadDecision {
  const config = input.config ?? USTADH_VAD;
  const speaking = input.rms >= config.speechRms;
  let { hasSpoken, speechStartedAtMs, lastSpeechAtMs } = input.state;

  if (speaking) {
    hasSpoken = true;
    if (speechStartedAtMs == null) speechStartedAtMs = input.nowMs;
    lastSpeechAtMs = input.nowMs;
  }

  const state: VadGateState = { hasSpoken, speechStartedAtMs, lastSpeechAtMs };

  if (input.nowMs - input.startedAtMs >= config.maxListenMs) {
    return { action: "auto_send", state };
  }

  if (!hasSpoken || speechStartedAtMs == null || lastSpeechAtMs == null) {
    return { action: "continue", state };
  }

  const quietFor = speaking ? 0 : input.nowMs - lastSpeechAtMs;
  const voicedSpan = lastSpeechAtMs - speechStartedAtMs;
  if (!speaking && quietFor >= config.silenceMs && voicedSpan >= config.minSpeechMs) {
    return { action: "auto_send", state };
  }

  return { action: "continue", state };
}

/** RMS from AnalyserNode time-domain bytes (128 = silence). */
export function rmsFromTimeDomain(data: ArrayLike<number>): number {
  const n = data.length;
  if (!n) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const centered = ((data[i] as number) - 128) / 128;
    sum += centered * centered;
  }
  return Math.sqrt(sum / n);
}
