"use client";

import { MASKED_CUTOFF } from "@/lib/player-chrome";
import { Icon } from "./icon";

export function MaskedCutoffChip({ onLeave }: { onLeave: () => void }) {
  return (
    <button
      type="button"
      className="turn-chip now masked-cutoff"
      data-masked-cutoff="true"
      aria-label={MASKED_CUTOFF.aria}
      onClick={onLeave}
    >
      <span className="turn-avatar">
        <Icon name="eye-off" size={14} />
      </span>
      <span className="turn-text">
        <b>{MASKED_CUTOFF.label}</b>
        <span>{MASKED_CUTOFF.detail}</span>
      </span>
    </button>
  );
}
