"use client";

import { Icon } from "./icon";
import { isPaidRepeat } from "@/lib/billing/gates";
import { WORD_REP_COUNTS, loopCountFace } from "@/lib/player-chrome";

export function WordRepBar({
  pos,
  start,
  end,
  count,
  plusOn,
  onPin,
  onCount,
  onAskPlus,
}: {
  pos: number;
  start: number | null;
  end: number | null;
  count: number | null;
  plusOn: boolean;
  onPin: (pos: number) => void;
  onCount: (n: number) => void;
  onAskPlus: () => void;
}) {
  const pinned = pos === start || pos === end;
  const pinOnly = start != null && end == null && pos !== start;
  return (
    <div className="word-rep-bar" onClick={(e) => e.stopPropagation()} role="toolbar" aria-label="Word replay">
      <button
        type="button"
        className={pinned ? "on" : ""}
        aria-pressed={pinned}
        aria-label={pinned ? "Unpin this word" : "Pin this word"}
        onClick={() => onPin(pos)}
      >
        <Icon name="pin" size={15} />
      </button>
      {pinOnly
        ? null
        : WORD_REP_COUNTS.map((n) => {
            const locked = isPaidRepeat(n) && !plusOn;
            const on = count === n;
            return (
              <button
                key={n}
                type="button"
                className={`${on ? "on" : ""}${locked ? " locked" : ""}`}
                aria-pressed={on}
                aria-label={n === 0 ? "Repeat until you stop" : `Replay ${n} times`}
                onClick={() => (locked ? onAskPlus() : onCount(n))}
              >
                {n === 0 ? "∞" : `${loopCountFace(n)}×`}
              </button>
            );
          })}
    </div>
  );
}
