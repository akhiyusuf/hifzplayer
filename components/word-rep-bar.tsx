"use client";

import { useLayoutEffect, useRef } from "react";
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
  onDismiss,
}: {
  pos: number;
  start: number | null;
  end: number | null;
  count: number | null;
  plusOn: boolean;
  onPin: (pos: number) => void;
  onCount: (n: number) => void;
  onAskPlus: () => void;
  onDismiss: () => void;
}) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const pinned = pos === start || pos === end;
  const pinOnly = start != null && end == null && pos !== start;

  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    el.style.setProperty("--word-rep-dx", "0px");
    const rect = el.getBoundingClientRect();
    const pad = 8;
    let dx = 0;
    if (rect.left < pad) dx = pad - rect.left;
    else if (rect.right > window.innerWidth - pad) {
      dx = window.innerWidth - pad - rect.right;
    }
    el.style.setProperty("--word-rep-dx", `${dx}px`);
  }, [pos, start, end, count, pinOnly]);

  return (
    <div
      ref={barRef}
      className="word-rep-bar"
      onClick={(e) => e.stopPropagation()}
      role="toolbar"
      aria-label="Word replay"
    >
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
      <button
        type="button"
        className="word-rep-dismiss"
        aria-label="Cancel word replay"
        onClick={onDismiss}
      >
        <Icon name="x" size={15} />
      </button>
    </div>
  );
}
