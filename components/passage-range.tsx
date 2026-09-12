"use client";

import { Icon } from "./icon";
import type { Chapter } from "@/lib/types";

function presetsFor(versesCount: number) {
  const presets: { label: string; from: number; to: number }[] = [];
  const first = Math.min(12, versesCount);
  presets.push({ label: `1–${first}`, from: 1, to: first });
  if (versesCount > 12) presets.push({ label: "First 10", from: 1, to: 10 });
  if (versesCount > 1) presets.push({ label: "Whole surah", from: 1, to: versesCount });
  return presets;
}

export function PassageRange({
  versesCount,
  chapters,
  chapterId,
  onChapter,
  from,
  to,
  onFrom,
  onTo,
  eyebrow = "Which verses",
}: {
  versesCount: number;
  chapters?: Chapter[];
  chapterId?: number;
  onChapter?: (id: number) => void;
  from: number;
  to: number;
  onFrom: (n: number) => void;
  onTo: (n: number) => void;
  eyebrow?: string | null;
}) {
  const chapter = chapters?.find((c) => c.id === chapterId);
  const nums = Array.from({ length: versesCount }, (_, i) => i + 1);
  const presets = presetsFor(versesCount);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {chapters && onChapter && chapterId != null ? (
        <label className="verse-field">
          <span>Surah</span>
          <span className="vf-value" style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14 }}>
            {chapter ? `${chapter.id}. ${chapter.name_simple}` : chapterId}
          </span>
          <Icon name="chevron-down" size={14} style={{ color: "var(--text-muted)", flex: "none" }} />
          <select
            aria-label="Surah"
            value={chapterId}
            onChange={(e) => onChapter(Number(e.target.value))}
          >
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id}. {c.name_simple}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {eyebrow ? <span className="label-eyebrow">{eyebrow}</span> : null}
      <div style={{ display: "flex", gap: 9 }}>
        {(
          [
            { label: "From", value: from, set: onFrom },
            { label: "To", value: to, set: onTo },
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
                if (f.label === "From" && to < n) onTo(n);
                if (f.label === "To" && n < from) onFrom(n);
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
              type="button"
              className={`preset-chip${on ? " on" : ""}`}
              onClick={() => {
                onFrom(p.from);
                onTo(p.to);
              }}
              aria-pressed={on}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
