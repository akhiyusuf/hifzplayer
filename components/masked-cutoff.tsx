"use client";

import { MASKED_CUTOFF } from "@/lib/player-chrome";
import { Icon } from "./icon";

export function MaskedCutoffChip({
  onLeave,
  onUnmask,
}: {
  onLeave: () => void;
  /** Reveal remaining masked words without leaving the drill. */
  onUnmask?: () => void;
}) {
  return (
    <div className="masked-cutoff-row" role="group" aria-label="Masked controls">
      <button
        type="button"
        className="focus-act masked-cutoff-unmask"
        aria-label={MASKED_CUTOFF.unmaskAria}
        onClick={() => (onUnmask ? onUnmask() : onLeave())}
      >
        <Icon name="eye" size={14} />
        {MASKED_CUTOFF.unmask}
      </button>
      <button
        type="button"
        className="focus-act primary masked-cutoff-listen"
        aria-label={MASKED_CUTOFF.listenAria}
        onClick={onLeave}
      >
        <Icon name="volume-2" size={14} />
        {MASKED_CUTOFF.listen}
      </button>
    </div>
  );
}
