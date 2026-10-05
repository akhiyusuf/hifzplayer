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
import { postUstadhAsr, UstadhAsrClientError } from "@/lib/ustadh/client";
import { extensionForMime, openMicStream, stopStream } from "@/lib/ustadh/record";
import { playUstadhReplay } from "@/lib/ustadh/replay-play";
import type { Verse } from "@/lib/types";

type EngineLike = {
  getSnapshot: () => {
    verses: Verse[];
    vIdx: number;
    playing?: boolean;
  };
  subscribe: (fn: () => void) => () => void;
  pauseAudio?: () => void;
  stopAudio?: () => void;
  stopJobs?: () => void;
  jumpToVerse?: (idx: number, play?: boolean) => void;
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

  useEffect(() => engine.subscribe(() => setTick((n) => n + 1)), [engine]);

  const snap = engine.getSnapshot();
  void tick;
  const verse = pickCoachVerse(snap.verses, snap.vIdx);
  const payload = verse ? coachPayloadForVerse(verse) : null;

  useEffect(() => {
    if (!verse) return;
    const idx = snap.verses.findIndex((row) => row.key === verse.key);
    if (idx >= 0 && idx !== snap.vIdx) engine.jumpToVerse?.(idx, false);
  }, [engine, snap.verses, snap.vIdx, verse]);

  const cleanupMic = useCallback(() => {
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
  }, []);

  useEffect(() => () => {
    cleanupMic();
    abortReplay.current?.abort();
  }, [cleanupMic]);

  const quietPlayer = useCallback(() => {
    try {
      engine.stopJobs?.();
      engine.pauseAudio?.();
      engine.stopAudio?.();
    } catch {
      /* ignore */
    }
  }, [engine]);

  const fail = useCallback((code: UstadhCoachErrorCode) => {
    busyRef.current = false;
    cleanupMic();
    setErrorCode(code);
    setStatus("error");
  }, [cleanupMic]);

  const startListening = useCallback(async () => {
    if (busyRef.current || !payload || !verse) return;
    abortReplay.current?.abort();
    setTranscript("");
    setErrorCode(null);
    quietPlayer();
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
    recorder.start(250);
    setStatus("listening");
  }, [fail, payload, quietPlayer, verse]);

  const sendClip = useCallback(async () => {
    if (!payload || !verse || !mediaRef.current) return;
    if (busyRef.current) return;
    busyRef.current = true;
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

    const chunkStart = Math.max(0, (performance.now() - startedAtRef.current) / 1000);
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
      void chunkStart;
      setTranscript(response.text || "");
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
  }, [fail, missCounts, payload, quietPlayer, snap.verses, verse]);

  const onMicTap = useCallback(() => {
    if (status === "listening") {
      void sendClip();
      return;
    }
    if (status === "checking") return;
    void startListening();
  }, [sendClip, startListening, status]);

  const meta = verse?.key || "";
  const hint =
    status === "error"
      ? ustadhErrorHint(errorCode)
      : status === "listening"
        ? "Tap again to send"
        : status === "checking"
          ? "Comparing to the ayah…"
          : status === "matched"
            ? "Nice — tap Listen for another take"
            : status === "miss"
              ? transcript
                ? `Heard: ${transcript}`
                : "Replay finished — try again"
              : "Tap Listen, recite, tap Send";

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
