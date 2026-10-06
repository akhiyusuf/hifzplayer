"use client";

import { Icon } from "./icon";
import { isPaidRepeat } from "@/lib/billing/gates";
import { WORD_REP_COUNTS, loopCountFace } from "@/lib/player-chrome";
import { PracticeStrip } from "./practice-strip";

export function WordRepCountRow({
  start,
  end,
  count,
  plusOn,
  onCount,
  onAskPlus,
}: {
  start: number | null;
  end: number | null;
  count: number | null;
  plusOn: boolean;
  onCount: (n: number) => void;
  onAskPlus: () => void;
}) {
  const ready = start != null && end != null;
  return (
    <div className="rep-seg seg" role="group" aria-label="Repeat count">
      <span className="label-eyebrow">Repeats</span>
      {WORD_REP_COUNTS.map((n) => {
        const locked = isPaidRepeat(n) && !plusOn;
        const on = count === n;
        return (
          <button
            key={n}
            type="button"
            className={`${on ? "on" : ""}${locked ? " locked" : ""}${n === 0 ? " inf" : ""}`}
            aria-pressed={on}
            aria-label={n === 0 ? "Repeat until you stop" : `Replay ${n} times`}
            disabled={!ready && !locked}
            onClick={() => {
              if (!ready) return;
              if (locked) onAskPlus();
              else onCount(n);
            }}
          >
            {locked ? <Icon name="sparkles" size={11} /> : null}
            {n === 0 ? "∞" : `${loopCountFace(n)}×`}
          </button>
        );
      })}
    </div>
  );
}

export function WordRepChrome({
  start,
  end,
  count,
  plusOn,
  onCount,
  onAskPlus,
}: {
  start: number | null;
  end: number | null;
  count: number | null;
  plusOn: boolean;
  onCount: (n: number) => void;
  onAskPlus: () => void;
}) {
  const meta =
    start != null && end != null
      ? start === end
        ? `Word ${start}`
        : `Words ${start}–${end}`
      : start != null
        ? `Pinned ${start} — tap the end`
        : "No pin yet";

  return (
    <PracticeStrip
      title="Word Reps"
      meta={meta}
      hint={
        start != null && end != null
          ? "Pick how many times to play, then press play."
          : "Tap a word, pin a range, then pick a count."
      }
      actions={
        <WordRepCountRow
          start={start}
          end={end}
          count={count}
          plusOn={plusOn}
          onCount={onCount}
          onAskPlus={onAskPlus}
        />
      }
    />
  );
}
