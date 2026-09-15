"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { FocusStage } from "@/components/focus-stage";
import { Icon } from "@/components/icon";
import { WordRepBar } from "@/components/word-rep-bar";
import { attachAudio, fetchAudio, fetchPassage, fetchRecitations } from "@/lib/api";
import { segForWord, wordAt } from "@/lib/audio";
import { resolveWordAudioUrl } from "@/lib/audio-url";
import { FOCUS_JOBS } from "@/lib/constants";
import {
  DRILL_HINTS,
  loopCountFace,
  sortedWordRange,
  wordRepsPlayKind,
} from "@/lib/player-chrome";
import { pickMuallimReciter } from "@/lib/playlists";
import type { Verse, Word } from "@/lib/types";

export type DemoMode = "word" | "masked" | "relay";

const CHAPTER = 103;
const FROM = 1;
const TO = 3;

type WordPick = {
  start: number | null;
  end: number | null;
  count: number | null;
  open: number | null;
};

type MaskState = { maxRev: number; peeks: number; peekRev: number };

type RelayTurn = { kind: "you" | "qari"; verseIdx: number };

function stopMedia(el: HTMLAudioElement | null) {
  if (!el) return;
  try {
    el.pause();
    el.removeAttribute("src");
    el.load();
  } catch {
    /* ignore */
  }
}

function wordLabel(w: Word | undefined) {
  if (!w) return "";
  return [w.tr, w.gloss].filter(Boolean).join(" · ");
}

export function LandingFocusDemo({
  mode: controlledMode,
  onModeChange,
}: {
  mode?: DemoMode;
  onModeChange?: (mode: DemoMode) => void;
}) {
  const [mode, setMode] = useState<DemoMode>(controlledMode || "word");
  const [verses, setVerses] = useState<Verse[]>([]);
  const [muallimName, setMuallimName] = useState("Muallim");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [vIdx, setVIdx] = useState(0);
  const [curWord, setCurWord] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [wordPick, setWordPick] = useState<WordPick>({
    start: null,
    end: null,
    count: null,
    open: null,
  });
  const [mask, setMask] = useState<MaskState>({ maxRev: 0, peeks: 3, peekRev: 0 });
  const [relayIdx, setRelayIdx] = useState(0);
  const [passFace, setPassFace] = useState("");

  const wbwRef = useRef<HTMLAudioElement | null>(null);
  const verseRef = useRef<HTMLAudioElement | null>(null);
  const runToken = useRef(0);
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const verse = verses[vIdx] || null;

  useEffect(() => {
    if (controlledMode && controlledMode !== mode) setMode(controlledMode);
  }, [controlledMode, mode]);

  const switchMode = useCallback(
    (next: DemoMode) => {
      setMode(next);
      onModeChange?.(next);
    },
    [onModeChange],
  );

  const stopAll = useCallback(() => {
    runToken.current += 1;
    if (peekTimer.current) {
      clearTimeout(peekTimer.current);
      peekTimer.current = null;
    }
    stopMedia(wbwRef.current);
    stopMedia(verseRef.current);
    wbwRef.current = null;
    verseRef.current = null;
    setPlaying(false);
    setCurWord(0);
    setPassFace("");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [passage, reciters] = await Promise.all([
          fetchPassage(CHAPTER, FROM, TO),
          fetchRecitations(),
        ]);
        const muallim = pickMuallimReciter(reciters);
        if (!muallim) throw new Error("No teaching reciter");
        const audio = await fetchAudio(muallim.id, CHAPTER, FROM, TO);
        const withAudio = attachAudio(passage.verses, audio);
        if (cancelled) return;
        setVerses(withAudio);
        setMuallimName(/muallim/i.test(muallim.name) ? "Muallim" : muallim.name.split(" ")[0] || "Muallim");
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    stopAll();
    setWordPick({ start: null, end: null, count: null, open: null });
    setMask({ maxRev: 0, peeks: 3, peekRev: 0 });
    setRelayIdx(0);
    if (!verses.length) {
      setVIdx(0);
      return;
    }
    if (mode === "relay") {
      setVIdx(0);
      return;
    }
    /* Prefer a multi-word ayah so range / mask demos have room to work. */
    let best = 0;
    let bestLen = -1;
    verses.forEach((v, i) => {
      if (v.words.length > bestLen) {
        bestLen = v.words.length;
        best = i;
      }
    });
    setVIdx(best);
  }, [mode, stopAll, verses]);

  useEffect(() => () => stopAll(), [stopAll]);

  const playWbwReps = useCallback(
    async (word: Word, times: number) => {
      const url = resolveWordAudioUrl(word.audio);
      if (!url) return false;
      stopAll();
      const token = ++runToken.current;
      setPlaying(true);
      setCurWord(word.pos);
      const passes = times === 0 ? 99 : times;
      for (let i = 0; i < passes; i++) {
        if (runToken.current !== token) return true;
        setPassFace(times === 0 ? `∞ · ${i + 1}` : `${i + 1} / ${times}`);
        const audio = new Audio(url);
        wbwRef.current = audio;
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          void audio.play().catch(() => resolve());
        });
        if (runToken.current !== token) return true;
        if (i < passes - 1) await new Promise((r) => setTimeout(r, 380));
      }
      if (runToken.current === token) {
        setPlaying(false);
        setPassFace("");
        setCurWord(0);
      }
      return true;
    },
    [stopAll],
  );

  const playMuallimSpan = useCallback(
    async (v: Verse, startW: number, endW: number, times: number) => {
      const url = v.audio?.url;
      const segs = v.audio?.segments;
      if (!url || !segs?.length) return false;
      const startSeg = segForWord(segs, startW);
      const endSeg = segForWord(segs, endW);
      if (!startSeg || !endSeg) return false;
      stopAll();
      const token = ++runToken.current;
      setPlaying(true);
      const audio = new Audio(url);
      verseRef.current = audio;
      const passes = times === 0 ? 99 : times;
      for (let pass = 0; pass < passes; pass++) {
        if (runToken.current !== token) return true;
        setPassFace(times === 0 ? `∞ · ${pass + 1}` : `${pass + 1} / ${times}`);
        await new Promise<void>((resolve) => {
          const onTime = () => {
            if (runToken.current !== token) return;
            const w = wordAt(segs, audio.currentTime);
            setCurWord(w >= startW && w <= endW ? w : startW);
            if (audio.currentTime >= endSeg.end - 0.04) {
              audio.pause();
              resolve();
            }
          };
          audio.ontimeupdate = onTime;
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.currentTime = Math.max(0, startSeg.start - 0.02);
          void audio.play().catch(() => resolve());
        });
        if (runToken.current !== token) return true;
      }
      if (runToken.current === token) {
        setPlaying(false);
        setPassFace("");
        setCurWord(0);
      }
      return true;
    },
    [stopAll],
  );

  const playVerseThrough = useCallback(
    async (v: Verse, opts?: { muted?: boolean; reveal?: boolean }) => {
      const url = v.audio?.url;
      if (!url) return false;
      stopAll();
      const token = ++runToken.current;
      setPlaying(true);
      const audio = new Audio(url);
      audio.muted = Boolean(opts?.muted);
      verseRef.current = audio;
      await new Promise<void>((resolve) => {
        audio.ontimeupdate = () => {
          if (runToken.current !== token) return;
          const w = wordAt(v.audio?.segments, audio.currentTime);
          setCurWord(w);
          if (opts?.reveal && w > 0) {
            setMask((m) => ({ ...m, maxRev: Math.max(m.maxRev, w) }));
          }
        };
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        void audio.play().catch(() => resolve());
      });
      if (runToken.current === token) {
        setPlaying(false);
        setCurWord(0);
        if (opts?.reveal) {
          setMask((m) => ({ ...m, maxRev: Math.max(m.maxRev, v.words.length) }));
        }
      }
      return true;
    },
    [stopAll],
  );

  const startWordPlay = useCallback(
    async (start: number, end: number, count: number) => {
      if (!verse) return;
      const kind = wordRepsPlayKind(start, end);
      if (kind === "steps") {
        const word = verse.words.find((w) => w.pos === start);
        if (!word) return;
        const ok = await playWbwReps(word, count);
        if (!ok) await playMuallimSpan(verse, start, end, count);
        return;
      }
      await playMuallimSpan(verse, start, end, count);
    },
    [verse, playWbwReps, playMuallimSpan],
  );

  const onWordTap = (pos: number) => {
    if (mode !== "word" || !verse) return;
    setWordPick((prev) => {
      if (prev.open === pos) return { ...prev, open: null };
      return { ...prev, open: pos };
    });
  };

  const onPin = (pos: number) => {
    setWordPick((prev) => {
      if (prev.start == null) return { ...prev, start: pos, end: null, open: pos };
      if (prev.end == null && pos !== prev.start) {
        const range = sortedWordRange(prev.start, pos);
        return { ...prev, start: range.start, end: range.end, open: pos };
      }
      if (prev.start === pos || prev.end === pos) {
        return { start: null, end: null, count: null, open: pos };
      }
      return { start: pos, end: null, count: null, open: pos };
    });
  };

  const onCount = (n: number) => {
    setWordPick((prev) => {
      const start = prev.start ?? prev.open;
      if (start == null) return prev;
      const end = prev.end ?? start;
      const next = { ...prev, start, end, count: n, open: null };
      void startWordPlay(start, end, n);
      return next;
    });
  };

  const onDismissWord = () => {
    stopAll();
    setWordPick({ start: null, end: null, count: null, open: null });
  };

  const peek = () => {
    if (!verse || mask.peeks <= 0 || mask.maxRev >= verse.words.length) return;
    const peekRev = Math.min(verse.words.length, Math.max(mask.maxRev + 3, mask.maxRev + 1));
    setMask((m) => ({ ...m, peeks: m.peeks - 1, peekRev }));
    if (peekTimer.current) clearTimeout(peekTimer.current);
    peekTimer.current = setTimeout(() => {
      setMask((m) => ({ ...m, peekRev: 0 }));
    }, 1600);
  };

  const relayTurns: RelayTurn[] = verses.map((_, idx) => ({
    kind: idx % 2 === 0 ? "you" : "qari",
    verseIdx: idx,
  }));
  const relayTurn = relayTurns[relayIdx] || null;

  useEffect(() => {
    if (mode !== "relay" || status !== "ready") return;
    const turn = relayTurns[relayIdx];
    if (!turn || turn.kind !== "qari") return;
    const v = verses[turn.verseIdx];
    if (!v) return;
    setVIdx(turn.verseIdx);
    let cancelled = false;
    void playVerseThrough(v, { muted: false }).then(() => {
      if (cancelled) return;
      setRelayIdx((i) => {
        const next = Math.min(i + 1, Math.max(0, relayTurns.length - 1));
        const seat = relayTurns[next];
        if (seat) setVIdx(seat.verseIdx);
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // playVerseThrough / verses identity: only re-fire on seat changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, status, relayIdx]);

  const pinStart = wordPick.start;
  const pinEnd = wordPick.end;
  const revealUpTo = Math.max(mask.maxRev, mask.peekRev);

  let title = "Focus";
  let meta = verse?.key;
  let hint: string | undefined = DRILL_HINTS[mode];
  let progress: { now: number; max: number; label: string } | undefined;
  let extra: ReactNode;
  let actions: ReactNode;
  let gloss: ReactNode;

  if (mode === "word" && verse) {
    const active =
      pinStart != null
        ? verse.words.find((w) => w.pos === (curWord || pinStart))
        : verse.words.find((w) => w.pos === (wordPick.open || curWord));
    title = active?.ar || "Word Reps";
    meta = passFace || (pinStart != null && pinEnd != null && pinStart !== pinEnd
      ? `Words ${pinStart}–${pinEnd}`
      : verse.key);
    gloss = wordLabel(active) || verse.translation || null;
    hint = playing ? "Playing…" : DRILL_HINTS.word;
    if (playing) {
      actions = (
        <button type="button" className="focus-act" onClick={onDismissWord}>
          <Icon name="pause" size={16} />
          Stop
        </button>
      );
    }
  }

  if (mode === "masked" && verse) {
    const done = mask.maxRev >= verse.words.length;
    title = `Revealed ${mask.maxRev} of ${verse.words.length}`;
    meta = verse.key;
    progress = { now: mask.maxRev, max: verse.words.length, label: "Words revealed" };
    hint = done ? "Verse revealed" : DRILL_HINTS.masked;
    gloss = verse.translation || null;
    actions = (
      <>
        <button
          type="button"
          className="focus-act primary"
          onClick={peek}
          disabled={mask.peeks <= 0 || done}
        >
          <Icon name="eye" size={16} />
          {done ? "Verse revealed" : mask.peekRev > mask.maxRev ? "Peeking" : `Peek · ${mask.peeks} left`}
        </button>
        <button
          type="button"
          className="focus-act"
          disabled={playing || done}
          onClick={() => void playVerseThrough(verse, { reveal: true })}
        >
          <Icon name="play" size={16} />
          {playing ? "Revealing…" : "Play & reveal"}
        </button>
      </>
    );
  }

  if (mode === "relay" && relayTurn && verse) {
    const left = relayTurns.length - relayIdx;
    const isYou = relayTurn.kind === "you";
    title = "Round 1";
    meta = isYou ? `Your turn · ${left} left` : `${left} ${left === 1 ? "turn" : "turns"} left`;
    hint = isYou ? "Recite aloud — the reciter plays muted to pace you" : undefined;
    gloss = verse.translation || null;
    extra = (
      <ol className="relay-queue" aria-label="Turn order">
        {relayTurns.map((turn, idx) => {
          const done = idx < relayIdx;
          const now = idx === relayIdx;
          const label = turn.kind === "you" ? "You" : muallimName;
          return (
            <li
              key={`${turn.verseIdx}-${idx}`}
              className={`turn-chip${done ? " done" : ""}${now ? " now" : ""}`}
              aria-current={now ? "step" : undefined}
            >
              <span className="turn-avatar">
                <Icon name={turn.kind === "you" ? "user" : "mic"} size={14} />
                {done ? (
                  <span className="turn-check">
                    <Icon name="check" size={9} />
                  </span>
                ) : null}
              </span>
              {!done ? (
                <span className="turn-text">
                  <b>{label}</b>
                  <span>{verses[turn.verseIdx]?.number}</span>
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    );
    if (isYou) {
      actions = (
        <>
          <button
            type="button"
            className="focus-act primary"
            onClick={() => void playVerseThrough(verse, { muted: true })}
          >
            <Icon name="volume-2" size={16} />
            Replay reciter
          </button>
          <button
            type="button"
            className="focus-act"
            onClick={() => {
              stopAll();
              setRelayIdx((i) => Math.min(i + 1, relayTurns.length - 1));
              const next = relayTurns[Math.min(relayIdx + 1, relayTurns.length - 1)];
              if (next) setVIdx(next.verseIdx);
            }}
          >
            <Icon name="skip-forward" size={16} />
            Skip my turn
          </button>
        </>
      );
    }
  }

  return (
    <div className="landing-demo">
      <div className="landing-demo-modes" role="tablist" aria-label="Focus jobs">
        {FOCUS_JOBS.map((job) => {
          const id = job.id as DemoMode;
          const on = mode === id;
          return (
            <button
              key={job.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={on ? "on" : ""}
              onClick={() => switchMode(id)}
            >
              <Icon name={job.icon} size={14} />
              {job.name}
            </button>
          );
        })}
      </div>

      {status === "loading" ? (
        <div className="landing-demo-state" role="status">
          Loading Focus…
        </div>
      ) : null}
      {status === "error" ? (
        <div className="landing-demo-state" role="alert">
          Could not load the demo audio. Open the mushaf to try Focus there.
        </div>
      ) : null}

      {status === "ready" && verse ? (
        <div className="landing-demo-stage">
          <FocusStage
            title={title}
            meta={meta}
            hint={hint}
            progress={progress}
            extra={extra}
            actions={actions}
            gloss={gloss}
          >
            <span className="focus-line">
              {verse.words.map((word) => {
                const inPin =
                  pinStart != null &&
                  (pinEnd == null
                    ? word.pos === pinStart
                    : word.pos >= Math.min(pinStart, pinEnd) &&
                      word.pos <= Math.max(pinStart, pinEnd));
                const masked =
                  mode === "masked" && word.pos > revealUpTo
                    ? "hidden"
                    : mode === "masked"
                      ? "revealed"
                      : null;
                const isCur = curWord === word.pos;
                return (
                  <span key={word.pos} className="focus-word-wrap">
                    <span
                      className={`w${isCur ? " cur" : ""}${inPin ? " inrange" : ""}${
                        masked === "hidden" ? " masked" : ""
                      }${masked === "revealed" ? " revealed" : ""}`}
                      role={mode === "word" ? "button" : undefined}
                      tabIndex={mode === "word" ? 0 : undefined}
                      data-w={word.pos}
                      onClick={mode === "word" ? () => onWordTap(word.pos) : undefined}
                      onKeyDown={
                        mode === "word"
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onWordTap(word.pos);
                              }
                            }
                          : undefined
                      }
                    >
                      {word.ar}
                    </span>
                    {mode === "word" && wordPick.open === word.pos ? (
                      <WordRepBar
                        pos={word.pos}
                        start={wordPick.start}
                        end={wordPick.end}
                        count={wordPick.count}
                        plusOn
                        onPin={onPin}
                        onCount={onCount}
                        onAskPlus={() => undefined}
                        onClose={() => setWordPick((p) => ({ ...p, open: null }))}
                        onDismiss={onDismissWord}
                      />
                    ) : null}
                  </span>
                );
              })}
            </span>
          </FocusStage>

          {mode === "word" && verses.length > 1 ? (
            <div className="landing-demo-verse-nav" role="group" aria-label="Verse">
              <button
                type="button"
                className="focus-act"
                disabled={vIdx <= 0}
                onClick={() => {
                  stopAll();
                  setWordPick({ start: null, end: null, count: null, open: null });
                  setVIdx((i) => Math.max(0, i - 1));
                }}
              >
                Prev
              </button>
              <span>
                {vIdx + 1} / {verses.length}
              </span>
              <button
                type="button"
                className="focus-act"
                disabled={vIdx >= verses.length - 1}
                onClick={() => {
                  stopAll();
                  setWordPick({ start: null, end: null, count: null, open: null });
                  setVIdx((i) => Math.min(verses.length - 1, i + 1));
                }}
              >
                Next
              </button>
            </div>
          ) : null}

          {mode === "word" && wordPick.start != null && wordPick.count != null ? (
            <p className="landing-demo-note" role="status">
              {wordRepsPlayKind(wordPick.start, wordPick.end ?? wordPick.start) === "steps"
                ? `Word clip · ${wordPick.count === 0 ? "∞" : `${loopCountFace(wordPick.count)}×`} · wbw audio`
                : `Range stream · ${wordPick.count === 0 ? "∞" : `${loopCountFace(wordPick.count)}×`} · teaching Muallim`}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
