"use client";

import { useState } from "react";
import { Icon } from "./icon";
import { PassageRange } from "./passage-range";
import { Sheet } from "./sheet";
import { useAppData } from "@/lib/app-data";
import { MODES, RATES, type ModeId } from "@/lib/constants";
import { usePlus } from "@/lib/plus";
import type { Chapter } from "@/lib/types";

type Engine = {
  setRate: (rate: number) => void;
  toggleVerseLoop: () => void;
};

type State = {
  mode: string;
  style: string;
  rate: number;
  verseLoop: boolean;
  passage?: { chapter: number; from: number; to: number; name: string };
};

function rateLabel(rate: number) {
  return rate === 0.75 ? "¾×" : `${rate}×`;
}

function SpeedControl({
  rate,
  onRate,
}: {
  rate: number;
  onRate: (rate: number) => void;
}) {
  return (
    <div className="listen-speeds" role="group" aria-label="Speed">
      <span className="listen-speeds-lbl">Speed</span>
      <div className="listen-speeds-seg">
        {RATES.map((item) => (
          <button
            key={item}
            type="button"
            className={`tap${rate === item ? " on" : ""}`}
            aria-pressed={rate === item}
            aria-label={`${rateLabel(item)} speed`}
            onClick={() => onRate(item)}
          >
            {rateLabel(item)}
          </button>
        ))}
      </div>
    </div>
  );
}

function RepeatRow({
  on,
  disabled,
  hint,
  onToggle,
}: {
  on: boolean;
  disabled?: boolean;
  hint: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`listen-sheet-row tap${on ? " on" : ""}`}
      onClick={onToggle}
      aria-pressed={on}
      disabled={disabled}
    >
      <span className="st">
        <b>Repeat this verse</b>
        <span>{hint}</span>
      </span>
      <span className="val">{on ? "On" : "Off"}</span>
    </button>
  );
}

function VersesCard({
  versesCount,
  chapters,
  chapterId,
  onChapter,
  from,
  to,
  onFrom,
  onTo,
  nowLabel,
  dirty,
  onGo,
}: {
  versesCount: number;
  chapters: Chapter[];
  chapterId: number;
  onChapter: (id: number) => void;
  from: number;
  to: number;
  onFrom: (n: number) => void;
  onTo: (n: number) => void;
  nowLabel: string;
  dirty: boolean;
  onGo: () => void;
}) {
  return (
    <section className="listen-section" aria-label="Verses">
      <span className="label-eyebrow">Verses</span>
      <div className="verses-card">
        <PassageRange
          versesCount={versesCount}
          chapters={chapters}
          chapterId={chapterId}
          onChapter={onChapter}
          from={from}
          to={to}
          onFrom={onFrom}
          onTo={onTo}
          eyebrow={null}
        />
        {dirty ? (
          <button type="button" className="btn-primary" onClick={onGo}>
            <Icon name="book-open" size={18} />
            Go to {nowLabel}
          </button>
        ) : (
          <p className="verses-card-now">Reading {nowLabel}</p>
        )}
      </div>
    </section>
  );
}

function PractisePicker({
  mode,
  onPick,
}: {
  mode: string;
  onPick: (id: ModeId) => void;
}) {
  const current = MODES.find((m) => m.id === mode) ?? MODES[0];
  return (
    <section className="listen-section" aria-label="Practise as">
      <span className="label-eyebrow">Practise as</span>
      <div className="practise-grid" role="group" aria-label="Practise as">
        {MODES.map((m) => {
          const on = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              className={`practise-tile tap${on ? " on" : ""}`}
              aria-pressed={on}
              onClick={() => onPick(m.id)}
            >
              <span className="practise-tile-ic">
                <Icon name={m.icon} size={18} />
              </span>
              <b>{m.name}</b>
            </button>
          );
        })}
      </div>
      <p className="practise-grid-hint">{current.desc}</p>
    </section>
  );
}

export function PlayerSettingsSheet({
  engine,
  state,
  onClose,
  onPickMode,
  onOpenPassage,
}: {
  engine: Engine;
  state: State;
  onClose: () => void;
  onPickMode: (id: string) => void;
  onOpenPassage: (chapter: number, from: number, to: number) => void;
}) {
  const { plus: plusOn, askPlus: ask } = usePlus();
  const { chapters } = useAppData();
  const passage = state.passage || { chapter: 1, from: 1, to: 1, name: "" };
  const [ch, setCh] = useState(passage.chapter);
  const [from, setFrom] = useState(passage.from);
  const [to, setTo] = useState(passage.to);
  const mushaf = state.style === "mushaf";
  const drill = state.mode === "word";
  const relay = state.mode === "relay";
  const chapter = chapters.find((item) => item.id === ch);
  const versesCount = chapter?.verses_count || Math.max(to, from, 1);
  const name = chapter?.name_simple || passage.name || "Surah";
  const dirty = ch !== passage.chapter || from !== passage.from || to !== passage.to;
  const rangeLabel = `${name} ${from}${to > from ? `–${to}` : ""}`;

  const toggleRepeat = () => {
    if (!plusOn && !state.verseLoop) {
      onClose();
      ask("repeats");
      return;
    }
    engine.toggleVerseLoop();
  };

  const playback = (
    <section className="listen-section" aria-label="Playback">
      <span className="label-eyebrow">Playback</span>
      <SpeedControl rate={state.rate} onRate={(rate) => engine.setRate(rate)} />
      {drill ? (
        <p className="listen-repeat-note">Word repeats sit on the page. Tap a word, then pick how many times.</p>
      ) : (
        <RepeatRow
          on={!!state.verseLoop}
          disabled={relay}
          hint={
            relay
              ? "Relay already takes turns, so verse loop stays off"
              : mushaf
                ? "Keep this ayah playing until you stop it"
                : "Loop this ayah until you turn it off"
          }
          onToggle={toggleRepeat}
        />
      )}
    </section>
  );

  const verses = (
    <VersesCard
      versesCount={versesCount}
      chapters={chapters}
      chapterId={ch}
      onChapter={(id) => {
        setCh(id);
        const next = chapters.find((item) => item.id === id);
        const count = next?.verses_count || 1;
        setFrom(1);
        setTo(count <= 12 ? count : Math.min(10, count));
      }}
      from={from}
      to={to}
      onFrom={setFrom}
      onTo={setTo}
      nowLabel={rangeLabel}
      dirty={dirty}
      onGo={() => onOpenPassage(ch, from, to)}
    />
  );

  return (
    <Sheet title="Settings" onClose={onClose}>
      <div className="listen-sheet">
        <p className="listen-sheet-lead">
          {mushaf ? "Audio while you read this page." : "Choose how you practise this verse."}
        </p>
        {mushaf ? (
          <>
            {playback}
            {verses}
          </>
        ) : (
          <>
            <PractisePicker
              mode={state.mode}
              onPick={(id) => onPickMode(id)}
            />
            {playback}
            {verses}
          </>
        )}
      </div>
    </Sheet>
  );
}
