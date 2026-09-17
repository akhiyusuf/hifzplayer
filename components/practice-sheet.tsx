"use client";

import { useState } from "react";
import {
  practiceSheetJobs,
  practiceSheetPickMode,
  practiceSheetShowsExit,
} from "@/lib/player-chrome";
import { usePlus } from "@/lib/plus";
import { Icon } from "./icon";
import { PassageRange } from "./passage-range";
import { Sheet } from "./sheet";

export function PracticeSheet({
  surahName,
  versesCount,
  initialFrom,
  initialTo,
  initialMode,
  onStart,
  onClose,
  variant = "setup",
}: {
  surahName: string;
  versesCount: number;
  initialFrom: number;
  initialTo: number;
  initialMode: string;
  onStart: (from: number, to: number, mode: string) => void;
  onClose: () => void;
  variant?: "setup" | "mode";
}) {
  const [from, setFrom] = useState(Math.min(initialFrom, versesCount));
  const [to, setTo] = useState(Math.min(initialTo, versesCount));
  const [mode, setMode] = useState(initialMode);
  const { plus: plusOn, askPlus, ready } = usePlus();
  const modeOnly = variant === "mode";
  const jobs = modeOnly ? practiceSheetJobs(mode) : [];
  const showExit = modeOnly && practiceSheetShowsExit(mode);

  return (
    <Sheet title={modeOnly ? "Practice" : `Set up ${surahName}`} onClose={onClose}>
      {!modeOnly && (
        <PassageRange versesCount={versesCount} from={from} to={to} onFrom={setFrom} onTo={setTo} />
      )}
      {modeOnly ? (
        <div className="sheet-list">
          {jobs.map((m) => {
            const on = mode === m.id;
            const listen = m.id === "verse";
            const locked = !plusOn && !on && !listen;
            return (
              <button
                key={m.id}
                className={`mode-opt${on ? " on" : ""}${locked ? " locked" : ""}`}
                data-practice-exit={listen && showExit ? "true" : undefined}
                aria-label={listen && showExit ? "Stop practice" : undefined}
                onClick={() => {
                  const next = practiceSheetPickMode(mode, m.id);
                  const leaving = next === "verse";
                  if (!leaving && !ready) return;
                  if (locked) {
                    askPlus("practice");
                    return;
                  }
                  setMode(next);
                  onStart(from, to, next);
                }}
                aria-pressed={on}
              >
                <span className="mo-ic">
                  <Icon name={m.icon} size={19} />
                </span>
                <span className="mo-t">
                  <b>{listen && showExit ? "Listen" : m.name}</b>
                  <span>{listen && showExit ? "Stop practice — listen to this ayah" : m.desc}</span>
                </span>
                <span className="radio-dot">
                  <Icon name="check" size={13} />
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <button className="btn-primary" onClick={() => onStart(from, to, "verse")}>
          <Icon name="play" size={18} />
          Open {surahName} {from}
          {to > from ? `–${to}` : ""}
        </button>
      )}
    </Sheet>
  );
}
