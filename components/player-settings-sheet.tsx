"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "./icon";
import { Sheet } from "./sheet";
import { useAppData } from "@/lib/app-data";
import { FOCUS_JOBS, type ModeId } from "@/lib/constants";
import { usePlus } from "@/lib/plus";
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
    <label className="sidebar-row">
      <span className="sidebar-k">{label}</span>
      <span className="sidebar-v">{value}</span>
      <Icon name="chevron-down" size={16} style={{ color: "var(--text-muted)", flex: "none" }} />
      {children}
    </label>
  );
}

function ViewSwitch({
  style,
  onStyle,
}: {
  style: string;
  onStyle: (next: "mushaf" | "focus") => void;
}) {
  return (
    <div className="sidebar-row sidebar-row-stack">
      <span className="sidebar-k">View</span>
      <div className="style-toggle sidebar-seg" role="group" aria-label="Reading view">
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
  onAskPlus,
  onPick,
}: {
  mode: string;
  plusOn: boolean;
  onAskPlus: () => void;
  onPick: (id: ModeId) => void;
}) {
  return (
    <div className="sidebar-jobs">
      <span className="sidebar-k">Practice</span>
      <div className="practise-jobs">
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
                if (locked) {
                  onAskPlus();
                  return;
                }
                onPick(on ? "verse" : job.id);
              }}
            >
              <span className="practise-job-ic">
                <Icon name={job.icon} size={16} />
              </span>
              <span className="st">
                <b>{job.name}</b>
                <span>{job.desc}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PlayerSettingsSheet({
  engine,
  state,
  verseNumber,
  onClose,
  onLocate,
  qariName,
  onOpenReciter,
  onTranslationId,
  onPickMode,
}: {
  engine: Engine;
  state: State;
  verseNumber: number;
  onClose: () => void;
  onLocate: (chapter: number, verse: number) => void;
  qariName?: string;
  onOpenReciter?: () => void;
  onTranslationId?: (id: number) => void;
  onPickMode?: (id: string) => void;
}) {
  const { chapters } = useAppData();
  const { plus: plusOn, askPlus } = usePlus();
  const passage = state.passage || { chapter: 1, from: 1, to: 1, name: "" };
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
    translations.find((item) => item.id === transId) || translations.find((item) => item.id === 20);

  const locate = true;
  const reciter = true;
  const translation = true;

  return (
    <Sheet title="Settings" side="right" onClose={onClose}>
      <div className="player-side" data-sidebar="reader">
        <div className="sidebar-group">
          <ViewSwitch style={state.style === "focus" ? "focus" : "mushaf"} onStyle={(next) => engine.setStyle(next)} />
          {onPickMode ? (
            <DrillTypePicker
              mode={state.mode}
              plusOn={plusOn}
              onAskPlus={() => askPlus("practice")}
              onPick={(id) => onPickMode(id)}
            />
          ) : null}
        </div>
        {locate || translation || reciter ? (
          <div className="sidebar-group">
            {locate ? (
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
            ) : null}
            {locate ? (
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
            ) : null}
            {translation ? (
              <>
                <div className="sidebar-row">
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
              <button type="button" className="sidebar-row tap" onClick={onOpenReciter}>
                <span className="sidebar-k">Reciter</span>
                <span className="sidebar-v sidebar-v-wrap">{qariName || "Choose a reciter"}</span>
                <Icon name="chevron-down" size={16} style={{ color: "var(--text-muted)", flex: "none" }} />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
