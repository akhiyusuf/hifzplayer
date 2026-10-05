"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { PracticeStrip } from "@/components/practice-strip";
import {
  coachPayloadForVerse,
  mapClientErrorCode,
  mergeMissCounts,
  pickCoachVerse,
  primaryReplay,
  turnOutcome,
  ustadhErrorHint,
  ustadhStatusLabel,
  type UstadhCoachErrorCode,
  type UstadhCoachStatus,
} from "@/lib/ustadh/coach";
import { filterArabicTranscript } from "@/lib/ustadh/arabic";
import { postUstadhAsr, UstadhAsrClientError } from "@/lib/ustadh/client";
import {
  applyUstadhReciteHighlight,
  clearUstadhReciteHighlight,
  reciteHighlightFromHeard,
  USTADH_ROLLING_PEEK_MS,
} from "@/lib/ustadh/highlight";
import {
  advanceVadGate,
  extensionForMime,
  openMicStream,
  rmsFromTimeDomain,
  stopStream,
  USTADH_VAD,
  type VadGateState,
} from "@/lib/ustadh/record";
import { playUstadhReplay } from "@/lib/ustadh/replay-play";
import type { Verse } from "@/lib/types";
import type { UstadhAsrResponse } from "@/lib/ustadh/types";

type EngineLike = {
  getSnapshot: () => {
    verses: Verse[];
    vIdx: number;
    playing?: boolean;
    curWord?: number;
  };
  subscribe: (fn: () => void) => () => void;
  pauseAudio?: () => void;
  stopAudio?: () => void;
  stopJobs?: () => void;
  jumpToVerse?: (idx: number, play?: boolean) => void;
  notify?: () => void;
  notifyWord?: () => void;
  onWordChange?: (vIdx: number, pos: number) => void;
  st?: {
    curWord: number;
    wordPick: {
      start: number | null;
      end: number | null;
      count: number | null;
      open: number | null;
      vIdx: number | null;
    };
    vIdx: number;
  };
};

export function UstadhCoachBar({
  engine,
  eyesOff,
  onEyesOff,
  onLeave,
}: {
  engine: EngineLike;
  eyesOff: boolean;
  onEyesOff: (on: boolean) => void;
  onLeave?: () => void;
}) {
  const [tick, setTick] = useState(0);
  const [status, setStatus] = useState<UstadhCoachStatus>("idle");
  const [errorCode, setErrorCode] = useState<UstadhCoachErrorCode | null>(null);
  const [transcript, setTranscript] = useState("");
  const [missCounts, setMissCounts] = useState<Record<string, number>>({});
  const sessionId = useRef(`ustadh-${Math.random().toString(36).slice(2, 10)}`);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeRef = useRef("audio/webm");
  const startedAtRef = useRef(0);
  const abortReplay = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const peekBusyRef = useRef(false);
  const statusRef = useRef<UstadhCoachStatus>("idle");
  const vadStateRef = useRef<VadGateState>({
    hasSpoken: false,
    speechStartedAtMs: null,
    lastSpeechAtMs: null,
  });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadTimerRef = useRef<number | null>(null);
  const peekTimerRef = useRef<number | null>(null);
  const sendClipRef = useRef<() => void>(() => {});

  useEffect(() => engine.subscribe(() => setTick((n) => n + 1)), [engine]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const snap = engine.getSnapshot();
  void tick;
  const verse = pickCoachVerse(snap.verses, snap.vIdx);
  const payload = verse ? coachPayloadForVerse(verse) : null;

  useEffect(() => {
    if (!verse) return;
    const idx = snap.verses.findIndex((row) => row.key === verse.key);
    if (idx >= 0 && idx !== snap.vIdx) engine.jumpToVerse?.(idx, false);
  }, [engine, snap.verses, snap.vIdx, verse]);

  const stopVad = useCallback(() => {
    if (vadTimerRef.current != null) {
      window.clearInterval(vadTimerRef.current);
      vadTimerRef.current = null;
    }
    if (peekTimerRef.current != null) {
      window.clearInterval(peekTimerRef.current);
      peekTimerRef.current = null;
    }
    try {
      audioCtxRef.current?.close();
    } catch {
      /* ignore */
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    vadStateRef.current = {
      hasSpoken: false,
      speechStartedAtMs: null,
      lastSpeechAtMs: null,
    };
  }, []);

  const cleanupMic = useCallback(() => {
    stopVad();
    try {
      if (mediaRef.current && mediaRef.current.state !== "inactive") {
        mediaRef.current.stop();
      }
    } catch {
      /* ignore */
    }
    mediaRef.current = null;
    stopStream(streamRef.current);
    streamRef.current = null;
    chunksRef.current = [];
  }, [stopVad]);

  useEffect(
    () => () => {
      cleanupMic();
      abortReplay.current?.abort();
    },
    [cleanupMic],
  );

  const quietPlayer = useCallback(() => {
    try {
      engine.stopJobs?.();
      engine.pauseAudio?.();
      engine.stopAudio?.();
    } catch {
      /* ignore */
    }
  }, [engine]);

  const paintHighlight = useCallback(
    (response: UstadhAsrResponse) => {
      if (!payload) return;
      const vIdx = snap.verses.findIndex((row) => row.key === verse?.key);
      if (vIdx < 0) return;
      const firstPos = payload.words[0]?.pos ?? 1;
      const highlight = reciteHighlightFromHeard({
        words: payload.words,
        heard: response.words || [],
      });
      applyUstadhReciteHighlight(engine, vIdx, highlight, firstPos);
    },
    [engine, payload, snap.verses, verse?.key],
  );

  const fail = useCallback(
    (code: UstadhCoachErrorCode) => {
      busyRef.current = false;
      cleanupMic();
      setErrorCode(code);
      setStatus("error");
    },
    [cleanupMic],
  );

  const currentBlob = useCallback(() => {
    try {
      mediaRef.current?.requestData?.();
    } catch {
      /* ignore */
    }
    return new Blob(chunksRef.current, { type: mimeRef.current || "audio/webm" });
  }, []);

  const peekProgress = useCallback(async () => {
    if (!payload || !verse) return;
    if (statusRef.current !== "listening") return;
    if (busyRef.current || peekBusyRef.current) return;
    if (!vadStateRef.current.hasSpoken) return;
    const blob = currentBlob();
    if (!blob.size || blob.size < 1200) return;
    peekBusyRef.current = true;
    const filename = `peek.${extensionForMime(mimeRef.current)}`;
    try {
      const response = await postUstadhAsr({
        audio: blob,
        filename,
        expectedText: payload.expectedText,
        expectedWords: payload.expectedWords,
        marks: payload.marks,
        phrases: payload.phrases,
        surah: payload.surah,
        ayahStart: payload.ayahStart,
        ayahEnd: payload.ayahEnd,
        verseKey: payload.verseKey,
        sessionId: sessionId.current,
        missCounts,
        chunkStart: 0,
      });
      if (statusRef.current !== "listening") return;
      const arabic = filterArabicTranscript(response.text || "");
      if (arabic) setTranscript(arabic);
      paintHighlight(response);
    } catch {
      /* peeks are best-effort; final send handles errors */
    } finally {
      peekBusyRef.current = false;
    }
  }, [currentBlob, missCounts, paintHighlight, payload, verse]);

  const startListening = useCallback(async () => {
    if (busyRef.current || !payload || !verse) return;
    abortReplay.current?.abort();
    setTranscript("");
    setErrorCode(null);
    quietPlayer();
    clearUstadhReciteHighlight(engine);
    const mic = await openMicStream();
    if (!mic.ok) {
      fail(mic.code);
      return;
    }
    streamRef.current = mic.stream;
    mimeRef.current = mic.mimeType || "audio/webm";
    chunksRef.current = [];
    let recorder: MediaRecorder;
    try {
      recorder = mic.mimeType
        ? new MediaRecorder(mic.stream, { mimeType: mic.mimeType })
        : new MediaRecorder(mic.stream);
    } catch {
      fail("MIC_UNAVAILABLE");
      return;
    }
    mediaRef.current = recorder;
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
    };
    startedAtRef.current = performance.now();
    vadStateRef.current = {
      hasSpoken: false,
      speechStartedAtMs: null,
      lastSpeechAtMs: null,
    };
    recorder.start(250);

    // AnalyserNode VAD → silence auto-send
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      const source = ctx.createMediaStreamSource(mic.stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      const buf = new Uint8Array(analyser.fftSize);
      vadTimerRef.current = window.setInterval(() => {
        if (statusRef.current !== "listening" || busyRef.current) return;
        analyser.getByteTimeDomainData(buf);
        const rms = rmsFromTimeDomain(buf);
        const decision = advanceVadGate({
          nowMs: performance.now(),
          rms,
          startedAtMs: startedAtRef.current,
          state: vadStateRef.current,
        });
        vadStateRef.current = decision.state;
        if (decision.action === "auto_send") {
          sendClipRef.current();
        }
      }, USTADH_VAD.pollMs);
    } catch {
      /* VAD optional — tap-to-send still works */
    }

    // Rolling peeks for near-real-time word highlight (Groq is file ASR).
    peekTimerRef.current = window.setInterval(() => {
      void peekProgress();
    }, USTADH_ROLLING_PEEK_MS);

    // Seed highlight on first expected word.
    const vIdx = snap.verses.findIndex((row) => row.key === verse.key);
    if (vIdx >= 0 && payload.words[0]) {
      applyUstadhReciteHighlight(
        engine,
        vIdx,
        {
          curPos: payload.words[0].pos,
          matchedEndPos: null,
          missPos: null,
          matchedCount: 0,
        },
        payload.words[0].pos,
      );
    }

    setStatus("listening");
  }, [engine, fail, payload, peekProgress, quietPlayer, snap.verses, verse]);

  const sendClip = useCallback(async () => {
    if (!payload || !verse || !mediaRef.current) return;
    if (busyRef.current) return;
    busyRef.current = true;
    stopVad();
    setStatus("checking");
    const recorder = mediaRef.current;
    const blob = await new Promise<Blob>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve(new Blob(chunksRef.current, { type: mimeRef.current || "audio/webm" }));
      };
      recorder.onstop = finish;
      try {
        if (recorder.state === "recording") {
          try {
            recorder.requestData();
          } catch {
            /* ignore */
          }
          recorder.stop();
        } else {
          finish();
        }
      } catch {
        finish();
      }
      window.setTimeout(finish, 800);
    });
    stopStream(streamRef.current);
    streamRef.current = null;
    mediaRef.current = null;
    chunksRef.current = [];

    if (!blob.size) {
      fail("EMPTY_CLIP");
      return;
    }

    const filename = `chunk.${extensionForMime(mimeRef.current)}`;
    try {
      const response = await postUstadhAsr({
        audio: blob,
        filename,
        expectedText: payload.expectedText,
        expectedWords: payload.expectedWords,
        marks: payload.marks,
        phrases: payload.phrases,
        surah: payload.surah,
        ayahStart: payload.ayahStart,
        ayahEnd: payload.ayahEnd,
        verseKey: payload.verseKey,
        sessionId: sessionId.current,
        missCounts,
        chunkStart: 0,
      });

      const arabicText = filterArabicTranscript(response.text || "");
      // After server-side Latin retries, empty Arabic → soft empty (never flash Latin).
      if (!arabicText && !(response.words && response.words.length)) {
        setTranscript("");
        fail("EMPTY_CLIP");
        return;
      }
      setTranscript(arabicText);
      paintHighlight(response);

      const outcome = turnOutcome(response);
      if (outcome === "matched") {
        setStatus("matched");
        busyRef.current = false;
        return;
      }
      setMissCounts((prev) => mergeMissCounts(prev, response.replays));
      setStatus("miss");
      const decision = primaryReplay(response);
      if (decision) {
        abortReplay.current?.abort();
        const ac = new AbortController();
        abortReplay.current = ac;
        quietPlayer();
        await playUstadhReplay({
          decision,
          words: payload.words,
          phrases: payload.phrases,
          verses: snap.verses,
          signal: ac.signal,
        });
      }
      busyRef.current = false;
    } catch (err) {
      if (err instanceof UstadhAsrClientError) {
        fail(mapClientErrorCode(err.code, err.status));
        return;
      }
      fail("NETWORK");
    }
  }, [fail, missCounts, paintHighlight, payload, quietPlayer, snap.verses, stopVad, verse]);

  useEffect(() => {
    sendClipRef.current = () => {
      void sendClip();
    };
  }, [sendClip]);

  const onMicTap = useCallback(() => {
    if (status === "listening") {
      void sendClip();
      return;
    }
    if (status === "checking") return;
    void startListening();
  }, [sendClip, startListening, status]);

  const meta = verse?.key || "";
  const arabicHint = filterArabicTranscript(transcript);
  const hint =
    status === "error"
      ? ustadhErrorHint(errorCode)
      : status === "listening"
        ? "Listening… pause when done"
        : status === "checking"
          ? "Comparing to the ayah…"
          : status === "matched"
            ? "Nice — tap Listen for another take"
            : status === "miss"
              ? arabicHint
                ? `Heard: ${arabicHint}`
                : "Replay finished — try again"
              : "Tap Listen, recite, pause when done";

  const actions = (
    <>
      <button
        type="button"
        className={`focus-act primary ustadh-mic${status === "listening" ? " listening" : ""}`}
        onClick={onMicTap}
        disabled={status === "checking" || !payload}
        aria-pressed={status === "listening"}
        aria-label={status === "listening" ? "Send recording" : "Start listening"}
      >
        <Icon name={status === "listening" ? "pause" : "mic"} size={16} />
        {status === "listening" ? "Send" : status === "checking" ? "Checking" : "Listen"}
      </button>
      <button
        type="button"
        className={`focus-act${eyesOff ? " on" : ""}`}
        onClick={() => onEyesOff(!eyesOff)}
        aria-pressed={eyesOff}
        aria-label={eyesOff ? "Show Mushaf text" : "Hide Mushaf text"}
      >
        <Icon name={eyesOff ? "eye" : "eye-off"} size={16} />
        {eyesOff ? "Show text" : "Eyes off"}
      </button>
    </>
  );

  return (
    <div className="ustadh-coach-bar" data-ustadh-status={status}>
      <PracticeStrip
        title={ustadhStatusLabel(status, errorCode)}
        meta={meta}
        hint={hint}
        extra={
          onLeave ? (
            <button type="button" className="turn-chip now" onClick={onLeave} aria-label="Stop AI Ustadh">
              <span className="turn-avatar">
                <Icon name="book-open" size={14} />
              </span>
              <span className="turn-text">
                <b>Listen</b>
                <span>Leave coach</span>
              </span>
            </button>
          ) : null
        }
        actions={actions}
      />
    </div>
  );
}
