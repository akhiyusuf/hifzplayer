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
