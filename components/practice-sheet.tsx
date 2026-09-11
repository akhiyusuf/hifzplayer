"use client";

import { useState } from "react";
import { MODES, TAJWEED_LEGEND } from "@/lib/constants";
import { Icon } from "./icon";
import { Sheet } from "./sheet";

export function PracticeSheet({
  surahName,
  versesCount,
  initialFrom,
  initialTo,
  initialMode,
  taj,
  onTaj,
  onStart,
  onClose,
  variant = "setup",
}: {
  surahName: string;
  versesCount: number;
  initialFrom: number;
  initialTo: number;
  initialMode: string;
  taj: boolean;
  onTaj: (v: boolean) => void;
  onStart: (from: number, to: number, mode: string) => void;
  onClose: () => void;
  variant?: "setup" | "mode";
}) {
  const [from, setFrom] = useState(Math.min(initialFrom, versesCount));
  const [to, setTo] = useState(Math.min(initialTo, versesCount));
  const [mode, setMode] = useState(initialMode);
  const [legend, setLegend] = useState(false);
  const modeOnly = variant === "mode";
  const presets: { label: string; from: number; to: number }[] = [];
  const first = Math.min(12, versesCount);
  presets.push({ label: `1–${first}`, from: 1, to: first });
  if (versesCount > 12) presets.push({ label: "First 10", from: 1, to: 10 });
  if (versesCount > 1) presets.push({ label: "Whole surah", from: 1, to: versesCount });
  const nums = Array.from({ length: versesCount }, (_, i) => i + 1);

  return (
    <Sheet title={modeOnly ? "Listening mode" : `Practise ${surahName}`} onClose={onClose}>
      {!modeOnly && (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <span className="label-eyebrow">Which verses</span>
          <div style={{ display: "flex", gap: 9 }}>
            {(
              [
                { label: "From", value: from, set: setFrom },
                { label: "To", value: to, set: setTo },
              ] as const
            ).map((f) => (
              <label key={f.label} className="verse-field">
                <span>{f.label}</span>
                <span className="vf-value">{f.value}</span>
                <Icon name="chevron-down" size={14} style={{ color: "var(--text-muted)", flex: "none" }} />
                <select
                  aria-label={`${f.label} verse`}
                  value={f.value}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    f.set(n);
                    if (f.label === "From" && to < n) setTo(n);
                    if (f.label === "To" && n < from) setFrom(n);
                  }}
                >
                  {nums.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {presets.map((p) => {
              const on = from === p.from && to === p.to;
              return (
                <button
                  key={p.label}
                  className={`preset-chip${on ? " on" : ""}`}
                  onClick={() => {
                    setFrom(p.from);
                    setTo(p.to);
                  }}
                  aria-pressed={on}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {!modeOnly && <div style={{ height: 1, background: "var(--border-default)" }} />}
      {!modeOnly && (
        <span className="label-eyebrow" style={{ marginBottom: -4 }}>
          How to listen
        </span>
      )}
      <div className="sheet-list">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`mode-opt${mode === m.id ? " on" : ""}`}
            onClick={() => {
              setMode(m.id);
              if (modeOnly) onStart(from, to, m.id);
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
      {!modeOnly && (
        <>
          <div className="settings-row">
            <span className="st">
              <b>Tajweed colours</b>
              <span>Colour letters by recitation rule</span>
            </span>
            <button
              className={`switch${taj ? " on" : ""}`}
              role="switch"
              aria-checked={taj}
              aria-label="Tajweed colours"
              onClick={() => onTaj(!taj)}
            >
              <i />
            </button>
          </div>
          <button className="legend-toggle" onClick={() => setLegend((v) => !v)} aria-expanded={legend}>
            {TAJWEED_LEGEND.slice(0, 3).map((l) => (
              <span key={l.label} className="legend-swatch" style={{ background: l.color }} />
            ))}
            Colour legend
            <Icon name={legend ? "chevron-up" : "chevron-down"} size={16} style={{ color: "var(--text-muted)" }} />
          </button>
          {legend && (
            <div className="legend-grid">
              {TAJWEED_LEGEND.map((l) => (
                <span key={l.label} className="lg">
                  <span className="legend-swatch" style={{ background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          )}
        </>
      )}
      {!modeOnly && (
        <button className="btn-primary" onClick={() => onStart(from, to, mode)}>
          <Icon name="play" size={18} />
          Start {surahName} {from}
          {to > from ? `–${to}` : ""}
        </button>
      )}
    </Sheet>
  );
}
