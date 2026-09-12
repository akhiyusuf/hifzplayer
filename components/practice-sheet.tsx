"use client";

import { useState } from "react";
import { FOCUS_JOBS } from "@/lib/constants";
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
  const modeOnly = variant === "mode";

  return (
    <Sheet title={modeOnly ? "Practise" : `Set up ${surahName}`} onClose={onClose}>
      {!modeOnly && (
        <PassageRange versesCount={versesCount} from={from} to={to} onFrom={setFrom} onTo={setTo} />
      )}
      {modeOnly ? (
        <div className="sheet-list">
          {FOCUS_JOBS.map((m) => (
            <button
              key={m.id}
              className={`mode-opt${mode === m.id ? " on" : ""}`}
              onClick={() => {
                setMode(m.id);
                onStart(from, to, m.id);
              }}
              aria-pressed={mode === m.id}
            >
              <span className="mo-ic">
                <Icon name={m.icon} size={19} />
              </span>
              <span className="mo-t">
                <b>{m.name}</b>
                <span>{m.desc}</span>
              </span>
              <span className="radio-dot">
                <Icon name="check" size={13} />
              </span>
            </button>
          ))}
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
