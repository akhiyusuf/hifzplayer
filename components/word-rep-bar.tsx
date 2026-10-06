"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icon";
import { isPaidRepeat } from "@/lib/billing/gates";
import { WORD_REP_COUNTS, loopCountFace } from "@/lib/player-chrome";

type Place = { top: number; left: number; flipped: boolean; arrowLeft: number };

export function WordRepBar({
  pos,
  start,
  end,
  count,
  plusOn,
  onPin,
  onCount,
  onAskPlus,
  onClose,
  onDismiss,
  nudge = false,
}: {
  pos: number;
  start: number | null;
  end: number | null;
  count: number | null;
  plusOn: boolean;
  onPin: (pos: number) => void;
  onCount: (n: number) => void;
  onAskPlus: () => void;
  /** Close the floating bar without clearing a pin/count. */
  onClose: () => void;
  /** Cancel underline + count and stop drill audio. */
  onDismiss: () => void;
  /** Pulse the multipliers after the range end is pinned. */
  nudge?: boolean;
}) {
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const pinned = pos === start || pos === end;
  const pinOnly = start != null && end == null && pos !== start;

  useLayoutEffect(() => {
    const placePop = () => {
      const wrap = wrapRef.current?.parentElement;
      const word = wrap?.querySelector(".w") as HTMLElement | null;
      const pop = popRef.current;
      if (!word || !pop) return;

      const r = word.getBoundingClientRect();
      const h = pop.offsetHeight || 56;
      const w = pop.offsetWidth || 220;
      const pad = 10;
      const left = Math.min(
        window.innerWidth - w - pad,
        Math.max(pad, r.left + r.width / 2 - w / 2),
      );
      const below = r.bottom + 12;
      const flipped = below + h > window.innerHeight - pad;
      const top = flipped ? Math.max(pad, r.top - h - 12) : below;
      const arrowLeft = Math.min(
        w - 20,
        Math.max(20, r.left + r.width / 2 - left),
      );
      setPlace({ top, left, flipped, arrowLeft });
    };

    placePop();
    window.addEventListener("resize", placePop);
    // Capture scroll from the mushaf/focus scroller so the arrow stays on the word.
    window.addEventListener("scroll", placePop, true);
    return () => {
      window.removeEventListener("resize", placePop);
      window.removeEventListener("scroll", placePop, true);
    };
  }, [pos, start, end, count, pinOnly, nudge]);

  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointer = (e: PointerEvent) => {
      const pop = popRef.current;
      if (!pop) return;
      if (e.target instanceof Node && pop.contains(e.target)) return;
      // Let word taps land so pin/range selection can continue.
      if (
        e.target instanceof Element &&
        e.target.closest(".w[role='button'], .w[data-w], .focus-word-wrap")
      ) {
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [onClose]);

  const pop = (
    <div className="pop-wrap word-rep-wrap" aria-hidden="true">
      <div
        ref={popRef}
        className="popover word-rep-pop"
        role="toolbar"
        aria-label="Word replay"
        onClick={(e) => e.stopPropagation()}
        style={{
          top: place ? place.top : -9999,
          left: place ? place.left : 0,
          visibility: place ? "visible" : "hidden",
        }}
      >
        <span
          className={`p-arrow ${place?.flipped ? "down" : "up"}`}
          style={{ left: place?.arrowLeft ?? "50%" }}
        />
        <div className="word-rep-row">
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
                    className={`${on ? "on" : ""}${locked ? " locked" : ""}${nudge ? " word-rep-nudge" : ""}`}
                    aria-pressed={on}
                    aria-label={
                      n === 0 ? "Repeat until you stop" : `Replay ${n} times`
                    }
                    onClick={() => (locked ? onAskPlus() : onCount(n))}
                  >
                    {n === 0 ? "∞" : `${loopCountFace(n)}×`}
                  </button>
                );
              })}
          <button
            type="button"
            className="word-rep-dismiss"
            aria-label={pinOnly ? "Not this word" : "Cancel word replay"}
            onClick={pinOnly ? onClose : onDismiss}
          >
            <Icon name="x" size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <span ref={wrapRef} className="word-rep-anchor" aria-hidden="true" />
      {typeof document !== "undefined" ? createPortal(pop, document.body) : null}
    </>
  );
}
