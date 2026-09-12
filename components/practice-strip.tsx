"use client";

import type { ReactNode } from "react";

export function PracticeStrip({
  title,
  meta,
  hint,
  progress,
  extra,
  actions,
}: {
  title: string;
  meta?: string;
  hint?: string;
  progress?: { now: number; max: number; label: string };
  extra?: ReactNode;
  actions?: ReactNode;
}) {
  const pct = progress && progress.max ? Math.round((progress.now / progress.max) * 100) : 0;
  return (
    <div className="practice-strip">
      <div className="practice-strip-head">
        <b>{title}</b>
        {meta ? <span>{meta}</span> : null}
      </div>
      {progress ? (
        <div
          className="practice-strip-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.max}
          aria-valuenow={progress.now}
          aria-label={progress.label}
        >
          <i style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      {hint ? <p className="practice-strip-hint">{hint}</p> : null}
      {extra}
      {actions ? <div className="practice-strip-actions">{actions}</div> : null}
    </div>
  );
}
