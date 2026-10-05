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
  peekHighlightFrom,
  reciteHighlightFromHeard,
  USTADH_PEEK,
  ustadhWordCss,
  type UstadhReciteHighlight,
} from "@/lib/ustadh/highlight";
import { UstadhHighlightDriver } from "@/lib/ustadh/highlight-driver";
import {
  coachLoopStep,
  INITIAL_COACH_LOOP,
  type CoachLoopEvent,
  type CoachLoopState,
} from "@/lib/ustadh/loop";
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
  onWordChange?(verse: Verse, pos: number): void;
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

type Payload = ReturnType<typeof coachPayloadForVerse>;
type PausedReason = "stopped" | "silent" | null;

const EMPTY_VAD: VadGateState = { hasSpoken: false, speechStartedAtMs: null, lastSpeechAtMs: null };

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
  const [auto, setAuto] = useState(false);
  const [pausedReason, setPausedReason] = useState<PausedReason>(null);
  const [wordCss, setWordCss] = useState("");
  const [progress, setProgress] = useState(0);

  const sessionId = useRef(`ustadh-${Math.random().toString(36).slice(2, 10)}`);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeRef = useRef("audio/webm");
  const startedAtRef = useRef(0);
  const abortReplay = useRef<AbortController | null>(null);
  const abortRequest = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const peekBusyRef = useRef(false);
  const statusRef = useRef<UstadhCoachStatus>("idle");
  const vadStateRef = useRef<VadGateState>({ ...EMPTY_VAD });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const vadTimerRef = useRef<number | null>(null);
  const peekTimerRef = useRef<number | null>(null);
  const loopTimerRef = useRef<number | null>(null);
  const loopRef = useRef<CoachLoopState>({ ...INITIAL_COACH_LOOP });
  const missCountsRef = useRef<Record<string, number>>({});
  /** Bumped on every new take / stop so stale async work bails out. */
  const takeRef = useRef(0);
  const paintedRef = useRef<{ misses: string; speaking: number | null; progress: number }>({
    misses: "",
    speaking: null,
    progress: 0,
  });

  useEffect(() => engine.subscribe(() => setTick((n) => n + 1)), [engine]);

  const setStatusBoth = useCallback((next: UstadhCoachStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const snap = engine.getSnapshot();
  void tick;
  const verse = pickCoachVerse(snap.verses, snap.vIdx);
  const payload = verse ? coachPayloadForVerse(verse) : null;
  const verseIdx = verse ? snap.verses.findIndex((row) => row.key === verse.key) : -1;

  // Latest render values for timer / async callbacks (avoids stale closures).
  const latest = useRef<{ payload: Payload | null; verse: Verse | null; vIdx: number; verses: Verse[] }>({
    payload: null,
    verse: null,
    vIdx: -1,
    verses: [],
  });
  latest.current = { payload, verse, vIdx: verseIdx, verses: snap.verses };

  useEffect(() => {
    if (!verse) return;
    if (verseIdx >= 0 && verseIdx !== snap.vIdx) engine.jumpToVerse?.(verseIdx, false);
  }, [engine, snap.vIdx, verse, verseIdx]);

  // ── highlight painting ────────────────────────────────────────────────────
  const paintRef = useRef<(highlight: UstadhReciteHighlight) => void>(() => {});

  const paintWords = useCallback(
    (highlight: UstadhReciteHighlight, speakingPos: number | null = null) => {
      const { payload: p, vIdx, verses } = latest.current;
      if (!p || vIdx < 0) return;
      const firstPos = p.words[0]?.pos ?? 1;
      applyUstadhReciteHighlight(engine, vIdx, highlight, firstPos, verses[vIdx] || null);
      const misses = highlight.missPositions.join(",");
      const painted = paintedRef.current;
      if (painted.misses !== misses || painted.speaking !== speakingPos) {
        painted.misses = misses;
        painted.speaking = speakingPos;
        setWordCss(ustadhWordCss({ vIdx, missPositions: highlight.missPositions, speakingPos }));
      }
      if (painted.progress !== highlight.reach) {
        painted.progress = highlight.reach;
        setProgress(highlight.reach);
      }
    },
    [engine],
  );
  paintRef.current = (highlight) => paintWords(highlight);

  const driverRef = useRef<UstadhHighlightDriver | null>(null);
  if (!driverRef.current) {
    driverRef.current = new UstadhHighlightDriver({
      words: () => latest.current.payload?.words || [],
      paint: (highlight) => paintRef.current(highlight),
    });
  }
  const driver = driverRef.current;

  // ── mic plumbing ──────────────────────────────────────────────────────────

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
  }, []);

  const cleanupMic = useCallback(() => {
    stopVad();
    try {
      if (mediaRef.current && mediaRef.current.state !== "inactive") {
        mediaRef.current.onstop = null;
        mediaRef.current.stop();
      }
    } catch {
      /* ignore */
    }
    mediaRef.current = null;
    stopStream(streamRef.current);
    streamRef.current = null;
    chunksRef.current = [];
    vadStateRef.current = { ...EMPTY_VAD };
  }, [stopVad]);

  const clearLoopTimer = useCallback(() => {
    if (loopTimerRef.current != null) {
      window.clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      takeRef.current += 1;
      cleanupMic();
      clearLoopTimer();
      driver.stop();
      abortReplay.current?.abort();
      abortRequest.current?.abort();
      clearUstadhReciteHighlight(engine);
    },
    [cleanupMic, clearLoopTimer, driver, engine],
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

  // ── loop ──────────────────────────────────────────────────────────────────

  const startListeningRef = useRef<() => void>(() => {});

  /** Apply a loop transition and schedule the next take if the loop is on. */
  const advanceLoop = useCallback(
    (event: CoachLoopEvent) => {
      const step = coachLoopStep(loopRef.current, event);
      loopRef.current = step.state;
      setAuto(step.state.auto);
      clearLoopTimer();
      if (step.next.kind === "listen") {
        setPausedReason(null);
        const take = takeRef.current;
        loopTimerRef.current = window.setTimeout(() => {
          loopTimerRef.current = null;
          if (take !== takeRef.current || !loopRef.current.auto) return;
          startListeningRef.current();
        }, step.next.delayMs);
        return;
      }
      if (step.next.reason === "silent") setPausedReason("silent");
      else if (step.next.reason === "stopped") setPausedReason("stopped");
    },
    [clearLoopTimer],
  );

  const fail = useCallback(
    (code: UstadhCoachErrorCode) => {
      busyRef.current = false;
      cleanupMic();
      setErrorCode(code);
      setStatusBoth("error");
      advanceLoop({ type: "error", code });
    },
    [advanceLoop, cleanupMic, setStatusBoth],
  );

  const currentBlob = useCallback(() => {
    try {
      mediaRef.current?.requestData?.();
    } catch {
      /* ignore */
    }
    return new Blob(chunksRef.current, { type: mimeRef.current || "audio/webm" });
  }, []);

  const requestFor = useCallback((p: Payload, audio: Blob, filename: string) => {
    return {
      audio,
      filename,
      expectedText: p.expectedText,
      expectedWords: p.expectedWords,
      marks: p.marks,
      phrases: p.phrases,
      surah: p.surah,
      ayahStart: p.ayahStart,
      ayahEnd: p.ayahEnd,
      verseKey: p.verseKey,
      sessionId: sessionId.current,
      missCounts: missCountsRef.current,
      chunkStart: 0,
    };
  }, []);

  const peekProgress = useCallback(async () => {
    const p = latest.current.payload;
    if (!p) return;
    if (statusRef.current !== "listening") return;
    if (busyRef.current || peekBusyRef.current) return;
    const vad = vadStateRef.current;
    if (!vad.hasSpoken || vad.speechStartedAtMs == null) return;
    const blob = currentBlob();
    if (!blob.size || blob.size < 1200) return;
    const take = takeRef.current;
    const now = performance.now();
    const voicedMs = now - vad.speechStartedAtMs;
    const clipSec = (now - startedAtRef.current) / 1000;
    peekBusyRef.current = true;
    try {
      const response = await postUstadhAsr({
        ...requestFor(p, blob, `peek.${extensionForMime(mimeRef.current)}`),
        mode: "peek",
        clipSec,
      });
      if (take !== takeRef.current || statusRef.current !== "listening") return;
      const arabic = filterArabicTranscript(response.text || "");
      if (arabic) setTranscript(arabic);
      driver.peek(
        peekHighlightFrom({ words: p.words, heard: response.words || [], voicedMs, clipSec }),
      );
    } catch {
      /* peeks are best-effort; final send handles errors */
    } finally {
      peekBusyRef.current = false;
    }
  }, [currentBlob, driver, requestFor]);

  /** Take ended with no voice: drop the recording, let the loop decide. */
  const endSilentTake = useCallback(() => {
    if (busyRef.current) return;
    cleanupMic();
    setTranscript("");
    setErrorCode("EMPTY_CLIP");
    setStatusBoth("idle");
    advanceLoop({ type: "silent" });
  }, [advanceLoop, cleanupMic, setStatusBoth]);

  const sendClipRef = useRef<() => void>(() => {});
  const silentRef = useRef<() => void>(() => {});

  const startListening = useCallback(async () => {
    const p = latest.current.payload;
    if (busyRef.current || !p) return;
    clearLoopTimer();
    const take = ++takeRef.current;
    abortReplay.current?.abort();
    abortRequest.current?.abort();
    cleanupMic();
    setTranscript("");
    setErrorCode(null);
    setPausedReason(null);
    quietPlayer();
    driver.reset();
    const mic = await openMicStream();
    if (take !== takeRef.current) {
      if (mic.ok) stopStream(mic.stream);
      return;
    }
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
    vadStateRef.current = { ...EMPTY_VAD };
    recorder.start(250);

    // AnalyserNode VAD → silence auto-send (and a no-speech timeout for the loop).
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
        if (decision.action === "auto_send") sendClipRef.current();
        else if (decision.action === "no_speech") silentRef.current();
      }, USTADH_VAD.pollMs);
    } catch {
      /* VAD optional — tap-to-send still works */
    }

    // Rolling peeks for near-real-time word highlight (Groq is file ASR).
    peekTimerRef.current = window.setInterval(() => {
      void peekProgress();
    }, USTADH_PEEK.intervalMs);

    setStatusBoth("listening");
  }, [clearLoopTimer, cleanupMic, driver, fail, peekProgress, quietPlayer, setStatusBoth]);

  useEffect(() => {
    startListeningRef.current = () => {
      void startListening();
    };
  }, [startListening]);

  const sendClip = useCallback(async () => {
    const p = latest.current.payload;
    if (!p || !mediaRef.current) return;
    if (busyRef.current) return;
    busyRef.current = true;
    const take = takeRef.current;
    stopVad();
    setStatusBoth("checking");
    const clipSec = (performance.now() - startedAtRef.current) / 1000;
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
    if (take !== takeRef.current) {
      busyRef.current = false;
      return;
    }

    if (!blob.size) {
      fail("EMPTY_CLIP");
      return;
    }

    const ac = new AbortController();
    abortRequest.current = ac;
    try {
      const response: UstadhAsrResponse = await postUstadhAsr(
        { ...requestFor(p, blob, `chunk.${extensionForMime(mimeRef.current)}`), clipSec },
        { signal: ac.signal },
      );
      if (take !== takeRef.current) {
        busyRef.current = false;
        return;
      }

      const arabicText = filterArabicTranscript(response.text || "");
      // After server-side Latin retries, empty Arabic → soft empty (never flash Latin).
      if (!arabicText && !(response.words && response.words.length)) {
        setTranscript("");
        fail("EMPTY_CLIP");
        return;
      }
      setTranscript(arabicText);
      const finalHighlight = reciteHighlightFromHeard({
        words: p.words,
        heard: response.words || [],
        final: true,
        clipSec,
      });

      const outcome = turnOutcome(response);
      if (outcome === "matched") {
        driver.final({ ...finalHighlight, missPositions: [], missPos: null });
        setStatusBoth("matched");
        busyRef.current = false;
        advanceLoop({ type: "matched" });
        return;
      }
      driver.final(finalHighlight, { immediate: true });
      missCountsRef.current = mergeMissCounts(missCountsRef.current, response.replays);
      const decision = primaryReplay(response);
      if (!decision) {
        setStatusBoth("miss");
        busyRef.current = false;
        advanceLoop({ type: "miss", replayed: false });
        return;
      }
      setStatusBoth("replaying");
      abortReplay.current?.abort();
      const replayAc = new AbortController();
      abortReplay.current = replayAc;
      quietPlayer();
      await playUstadhReplay({
        decision,
        words: p.words,
        phrases: p.phrases,
        verses: latest.current.verses,
        signal: replayAc.signal,
        onWord: (index) => {
          if (take !== takeRef.current) return;
          const word = p.words[index];
          if (!word) return;
          // Follow Ustadh: the clip's word is current; misses stay underlined.
          paintWords({ ...finalHighlight, curPos: word.pos }, word.pos);
        },
      });
      busyRef.current = false;
      if (take !== takeRef.current) return;
      paintWords(finalHighlight, null);
      setStatusBoth("miss");
      advanceLoop({ type: "miss", replayed: true });
    } catch (err) {
      if (take !== takeRef.current || (err instanceof DOMException && err.name === "AbortError")) {
        busyRef.current = false;
        return;
      }
      if (err instanceof UstadhAsrClientError) {
        fail(mapClientErrorCode(err.code, err.status));
        return;
      }
      fail("NETWORK");
    }
  }, [advanceLoop, driver, fail, paintWords, quietPlayer, requestFor, setStatusBoth, stopVad]);

  useEffect(() => {
    sendClipRef.current = () => {
      void sendClip();
    };
    silentRef.current = endSilentTake;
  }, [endSilentTake, sendClip]);

  /** Pause the loop: drop the open take, stop Ustadh, keep the last highlight. */
  const stopLoop = useCallback(() => {
    takeRef.current += 1;
    clearLoopTimer();
    abortReplay.current?.abort();
    abortRequest.current?.abort();
    cleanupMic();
    busyRef.current = false;
    advanceLoop({ type: "stop" });
    setStatusBoth("idle");
    driver.stop();
    const target = driver.target;
    if (target) paintWords(target, null);
  }, [advanceLoop, clearLoopTimer, cleanupMic, driver, paintWords, setStatusBoth]);

  const skipReplay = useCallback(() => {
    abortReplay.current?.abort();
  }, []);

  const onMicTap = useCallback(() => {
    if (status === "listening") {
      void sendClip();
      return;
    }
    if (status === "checking") return;
    if (status === "replaying") {
      skipReplay();
      return;
    }
    const step = coachLoopStep(loopRef.current, { type: "start" });
    loopRef.current = step.state;
    setAuto(true);
    setPausedReason(null);
    void startListening();
  }, [sendClip, skipReplay, startListening, status]);

  useEffect(() => {
    if (!verse) clearUstadhReciteHighlight(engine);
  }, [engine, verse]);

  const meta = verse?.key || "";
  const arabicHint = filterArabicTranscript(transcript);
  const hint =
    status === "error"
      ? ustadhErrorHint(errorCode)
      : status === "listening"
        ? "Listening… pause when done"
        : status === "checking"
          ? "Comparing to the ayah…"
          : status === "replaying"
            ? "Listen to Ustadh — the mic opens again after"
            : status === "matched"
              ? auto
                ? "Nice — next take starts in a moment"
                : "Nice — tap Listen for another take"
              : status === "miss"
                ? arabicHint
                  ? `Heard: ${arabicHint}`
                  : auto
                    ? "Try again — listening shortly"
                    : "Replay finished — try again"
                : pausedReason === "silent"
                  ? "Paused after silence — tap Listen to resume"
                  : pausedReason === "stopped"
                    ? "Paused — tap Listen to resume"
                    : auto && errorCode === "EMPTY_CLIP"
                      ? "Didn’t catch that — listening again"
                      : "Tap Listen once — Ustadh keeps listening after each take";

  const looping = auto || status === "listening" || status === "checking" || status === "replaying";
  const words = payload?.words || [];

  const primaryLabel =
    status === "listening" ? "Send" : status === "checking" ? "Checking" : status === "replaying" ? "Skip" : "Listen";
  const primaryIcon = status === "listening" ? "check" : status === "replaying" ? "skip-forward" : "mic";

  const actions = (
    <>
      <button
        type="button"
        className={`focus-act primary ustadh-mic${status === "listening" ? " listening" : ""}`}
        onClick={onMicTap}
        disabled={status === "checking" || !payload}
        aria-pressed={status === "listening"}
        aria-label={
          status === "listening"
            ? "Send recording"
            : status === "replaying"
              ? "Skip Ustadh replay"
              : "Start listening"
        }
      >
        <Icon name={primaryIcon} size={16} />
        {primaryLabel}
      </button>
      {looping ? (
        <button
          type="button"
          className="focus-act ustadh-stop"
          onClick={stopLoop}
          aria-label="Pause the Ustadh loop"
        >
          <Icon name="pause" size={16} />
          Pause
        </button>
      ) : null}
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
    <div className="ustadh-coach-bar" data-ustadh-status={status} data-ustadh-loop={auto ? "on" : "off"}>
      {wordCss ? <style data-ustadh-words="">{wordCss}</style> : null}
      <PracticeStrip
        title={ustadhStatusLabel(status, errorCode)}
        meta={auto ? `${meta} · loop on` : meta}
        hint={hint}
        progress={
          words.length && (status === "listening" || status === "checking" || progress > 0)
            ? { now: Math.min(progress, words.length), max: words.length, label: "Words recited" }
            : undefined
        }
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
