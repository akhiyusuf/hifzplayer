"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "./icon";
import { Sheet } from "./sheet";
import { ThemePicker } from "./theme-picker";
import { useAppData } from "@/lib/app-data";
import { FOCUS_JOBS, type ModeId } from "@/lib/constants";
import { sidebarKind } from "@/lib/player-chrome";
import { usePlus } from "@/lib/plus";
import { useTheme } from "@/lib/theme";
import { currentTranslationId, fetchTranslations, type TranslationOption } from "@/lib/translations";

type Engine = {
  setStyle: (style: string) => void;
  setShowTranslation: (on: boolean) => void;
};

type State = {
  mode: string;
  style: string;
  showTranslation?: boolean;
  passage?: { chapter: number; from: number; to: number; name: string };
};

function SelectRow({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <label className="verse-field sidebar-select">
      <span>{label}</span>
      <span className="vf-value" style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14 }}>
        {value}
      </span>
      <Icon name="chevron-down" size={14} style={{ color: "var(--text-muted)", flex: "none" }} />
      {children}
    </label>
  );
}

function ModeSwitch({
  style,
  onStyle,
}: {
  style: string;
  onStyle: (next: "mushaf" | "focus") => void;
}) {
  return (
    <div className="sidebar-mode">
      <span className="label-eyebrow">Mode</span>
      <div className="style-toggle" role="group" aria-label="Reading view">
        {(["mushaf", "focus"] as const).map((id) => (
          <button
            key={id}
            type="button"
            className={style === id ? "on" : ""}
            aria-pressed={style === id}
            onClick={() => onStyle(id)}
          >
            {id === "mushaf" ? "Mushaf" : "Focus"}
          </button>
        ))}
      </div>
    </div>
  );
}

function DrillTypePicker({
  mode,
  plusOn,
  compact,
  onAskPlus,
  onPick,
}: {
  mode: string;
  plusOn: boolean;
  compact?: boolean;
  onAskPlus: () => void;
  onPick: (id: ModeId) => void;
}) {
  const current = FOCUS_JOBS.find((job) => job.id === mode);
  if (compact) {
    return (
      <SelectRow label="Drill type" value={current?.name || "None"}>
        <select
          aria-label="Drill type"
          value={current?.id || "verse"}
          onChange={(e) => {
            const next = e.target.value as ModeId;
            if (next === "verse") {
              onPick("verse");
              return;
            }
            if (!plusOn) {
              onAskPlus();
              return;
            }
            onPick(next);
          }}
        >
          <option value="verse">None</option>
          {FOCUS_JOBS.map((job) => (
            <option key={job.id} value={job.id}>
              {job.name}
            </option>
          ))}
        </select>
      </SelectRow>
    );
  }
  return (
    <section className="listen-section" aria-label="Drill type">
      <span className="label-eyebrow">Drill type</span>
      <p className="practise-jobs-lead">
        {current
          ? current.desc
          : plusOn
            ? "Pick Word Reps, Masked, or Relay."
            : "Look around Focus. Word Reps, Masked, and Relay are Diras Plus."}
      </p>
      <div className="practise-jobs" role="group" aria-label="Drill type">
        {FOCUS_JOBS.map((job) => {
          const on = mode === job.id;
          const locked = !plusOn && !on;
          return (
            <button
              key={job.id}
              type="button"
              className={`practise-job tap${on ? " on" : ""}${locked ? " locked" : ""}`}
              aria-pressed={on}
              onClick={() => {
                if (on) {
                  onPick("verse");
                  return;
                }
                if (!plusOn) {
                  onAskPlus();
                  return;
                }
                onPick(job.id);
              }}
            >
              <span className="practise-job-ic">
                <Icon name={job.icon} size={18} />
              </span>
              <span className="st">
                <b>{job.name}</b>
                <span>{on ? "On · tap to go back" : job.desc}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ThemeFoot() {
  const { dark, setDark } = useTheme();
  return (
    <div className="player-side-foot">
      <div className="sidebar-mode">
        <span className="label-eyebrow">Theme</span>
        <div className="style-toggle" role="group" aria-label="Theme">
          <button type="button" className={dark ? "" : "on"} aria-pressed={!dark} onClick={() => setDark(false)}>
            Light
          </button>
          <button type="button" className={dark ? "on" : ""} aria-pressed={dark} onClick={() => setDark(true)}>
            Dark
          </button>
        </div>
      </div>
      <ThemePicker />
    </div>
  );
}

export function PlayerSettingsSheet({
  engine,
  state,
  verseNumber,
  onClose,
  onPickMode,
  onLocate,
  qariName,
  onOpenReciter,
  onTranslationId,
}: {
  engine: Engine;
  state: State;
  verseNumber: number;
  onClose: () => void;
  onPickMode: (id: string) => void;
  onLocate: (chapter: number, verse: number) => void;
  qariName?: string;
  onOpenReciter?: () => void;
  onTranslationId?: (id: number) => void;
}) {
  const { plus: plusOn, askPlus } = usePlus();
  const { chapters } = useAppData();
  const passage = state.passage || { chapter: 1, from: 1, to: 1, name: "" };
  const kind = sidebarKind(state.style, state.mode);
  const chapter = chapters.find((item) => item.id === passage.chapter);
  const versesCount = chapter?.verses_count || Math.max(passage.to, passage.from, 1);
  const surahName = chapter ? `${chapter.id}. ${chapter.name_simple}` : passage.name || "Surah";
  const showTrans = state.showTranslation !== false;
  const [transId, setTransId] = useState(currentTranslationId);
  const [translations, setTranslations] = useState<TranslationOption[]>([]);

  useEffect(() => {
    let alive = true;
    fetchTranslations()
      .then((list) => {
        if (alive) setTranslations(list);
      })
      .catch(() => {
        if (alive) setTranslations([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const currentTrans =
    translations.find((item) => item.id === transId) ||
    translations.find((item) => item.id === 20);

  const locate = kind === "mushaf" || kind === "word" || kind === "masked" || kind === "relay";
  const drill = kind !== "mushaf";
  const compactDrill = kind !== "focus";
  const reciter = kind !== "focus";
  const translation = kind === "mushaf";

  return (
    <Sheet title="Settings" side="right" onClose={onClose}>
      <div className="listen-sheet player-side">
        <ModeSwitch style={state.style === "focus" ? "focus" : "mushaf"} onStyle={(next) => engine.setStyle(next)} />
        {drill ? (
          <DrillTypePicker
            mode={state.mode}
            plusOn={plusOn}
            compact={compactDrill}
            onAskPlus={() => askPlus("focus")}
            onPick={(id) => onPickMode(id)}
          />
        ) : null}
        {locate ? (
          <>
            <SelectRow label="Surah" value={surahName}>
              <select
                aria-label="Surah"
                value={passage.chapter}
                onChange={(e) => onLocate(Number(e.target.value), 1)}
              >
                {chapters.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id}. {item.name_simple}
                  </option>
                ))}
              </select>
            </SelectRow>
            <SelectRow label="Verse" value={String(verseNumber || passage.from)}>
              <select
                aria-label="Verse"
                value={verseNumber || passage.from}
                onChange={(e) => onLocate(passage.chapter, Number(e.target.value))}
              >
                {Array.from({ length: versesCount }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </SelectRow>
          </>
        ) : null}
        {translation ? (
          <>
            <div className="sidebar-switch-row">
              <span className="st">
                <b>Translation</b>
                <span>Show the meaning under the ayah</span>
              </span>
              <button
                type="button"
                className={`switch${showTrans ? " on" : ""}`}
                role="switch"
                aria-checked={showTrans}
                aria-label="Translation"
                onClick={() => engine.setShowTranslation(!showTrans)}
              >
                <i />
              </button>
            </div>
            {showTrans ? (
              <SelectRow label="Which one" value={currentTrans?.name || "Saheeh International"}>
                <select
                  aria-label="Translation"
                  value={transId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setTransId(id);
                    onTranslationId?.(id);
                  }}
                >
                  {(translations.length
                    ? translations
                    : [{ id: 20, name: "Saheeh International", language: "english" }]
                  ).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.language ? `${item.name} · ${item.language}` : item.name}
                    </option>
                  ))}
                </select>
              </SelectRow>
            ) : null}
          </>
        ) : null}
        {reciter && onOpenReciter ? (
          <button type="button" className="listen-sheet-row tap" onClick={onOpenReciter}>
            <span className="st">
              <b>Reciter</b>
              <span>{qariName || "Choose a reciter"}</span>
            </span>
            <Icon name="mic" size={17} style={{ color: "var(--action-primary)", flex: "none" }} />
          </button>
        ) : null}
        <ThemeFoot />
      </div>
    </Sheet>
  );
}
