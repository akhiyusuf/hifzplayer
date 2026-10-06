"use client";

import type { ReactNode } from "react";
import { PracticeStrip } from "./practice-strip";

export function FocusStage({
  title,
  meta,
  hint,
  progress,
  extra,
  actions,
  children,
  gloss,
  contextLabel,
  context,
}: {
  title: string;
  meta?: string;
  hint?: string;
  progress?: { now: number; max: number; label: string };
  extra?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  gloss?: ReactNode;
  contextLabel?: string;
  context?: ReactNode;
}) {
  return (
    <div className="player-body">
      <PracticeStrip
        title={title}
        meta={meta}
        hint={hint}
        progress={progress}
        extra={extra}
        actions={actions}
      />
      <div className="practice-canvas focus-stage">
        <div className="focus-phrase">
          <div className="focus-ar">{children}</div>
          {gloss ? <p className="focus-gloss">{gloss}</p> : null}
        </div>
        {context ? (
          <div className="focus-next">
            {contextLabel ? <span className="lbl">{contextLabel}</span> : null}
            <div className="ar">{context}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
