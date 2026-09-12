"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "./icon";
import { PassageRange } from "./passage-range";
import { Sheet } from "./sheet";
import { useAppData } from "@/lib/app-data";
import { PLUS_EXPLAIN } from "@/lib/billing/gates";
import { PLUS_NAME } from "@/lib/brand";
import { FOCUS_JOBS, RATES, type ModeId } from "@/lib/constants";
import { usePlus } from "@/lib/plus";
import type { Chapter } from "@/lib/types";

type Engine = {
  setRate: (rate: number) => void;
};

type State = {
  mode: string;
  style: string;
  rate: number;
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

function PlusRow({ plusOn, onOpen }: { plusOn: boolean; onOpen: () => void }) {
  return (
    <section className="listen-section" aria-label={PLUS_NAME}>
      <button
        type="button"
        className={`listen-sheet-row tap${plusOn ? " on" : ""}`}
        onClick={onOpen}
      >
        <span className="st">
          <b>{plusOn ? `${PLUS_NAME} is on` : PLUS_EXPLAIN.rowTitle}</b>
          <span>{plusOn ? PLUS_EXPLAIN.rowOn : PLUS_EXPLAIN.rowSub}</span>
        </span>
        <Icon name="sparkles" size={17} style={{ color: "var(--action-primary)", flex: "none" }} />
      </button>
    </section>
  );
}

function PlusExplain({ plusOn, onBack }: { plusOn: boolean; onBack: () => void }) {
  return (
    <div className="plus-explain">
      <p className="plus-explain-lead">{PLUS_EXPLAIN.lead}</p>
      <section className="plus-explain-block">
        <span className="label-eyebrow">{PLUS_EXPLAIN.freeTitle}</span>
        <ul className="plus-explain-list">
          {PLUS_EXPLAIN.free.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
      <section className="plus-explain-block">
        <span className="label-eyebrow">{PLUS_EXPLAIN.plusTitle}</span>
        <ul className="plus-explain-list plus">
          {PLUS_EXPLAIN.plus.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
      {plusOn ? (
        <p className="plus-explain-on">{PLUS_NAME} is on for this account.</p>
      ) : (
        <Link className="btn-primary" href="/pricing?from=player">
          See plans
        </Link>
      )}
      <button type="button" className="btn-secondary" onClick={onBack}>
        Back to Settings
      </button>
    </div>
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
  plusOn,
  onAskPlus,
  onPick,
}: {
  mode: string;
  plusOn: boolean;
  onAskPlus: () => void;
  onPick: (id: ModeId) => void;
}) {
  const current = FOCUS_JOBS.find((m) => m.id === mode);
  return (
    <section className="listen-section" aria-label="Practise">
      <span className="label-eyebrow">Practise</span>
      <p className="practise-jobs-lead">
        {current
          ? current.desc
          : plusOn
            ? "Play this verse as usual. Pick a job when you want to work it."
            : "Look around Focus. Play and these jobs are Diras Plus — tap one to see the plans."}
      </p>
      <div className="practise-jobs" role="group" aria-label="Practise">
        {FOCUS_JOBS.map((m) => {
          const on = mode === m.id;
          const locked = !plusOn && !on;
          return (
            <button
              key={m.id}
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
                onPick(m.id);
              }}
            >
              <span className="practise-job-ic">
                <Icon name={m.icon} size={18} />
              </span>
              <span className="st">
                <b>{m.name}</b>
                <span>{on ? "On · tap to go back to the verse" : m.desc}</span>
              </span>
            </button>
          );
        })}
      </div>
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
  const { plus: plusOn, askPlus } = usePlus();
  const { chapters } = useAppData();
  const passage = state.passage || { chapter: 1, from: 1, to: 1, name: "" };
  const [ch, setCh] = useState(passage.chapter);
  const [from, setFrom] = useState(passage.from);
  const [to, setTo] = useState(passage.to);
  const mushaf = state.style === "mushaf";
  const drill = state.mode === "word";
  const chapter = chapters.find((item) => item.id === ch);
  const versesCount = chapter?.verses_count || Math.max(to, from, 1);
  const name = chapter?.name_simple || passage.name || "Surah";
  const dirty = ch !== passage.chapter || from !== passage.from || to !== passage.to;
  const rangeLabel = `${name} ${from}${to > from ? `–${to}` : ""}`;
  const [plusExplain, setPlusExplain] = useState(false);

  const playback = (
    <section className="listen-section" aria-label="Playback">
      <span className="label-eyebrow">Playback</span>
      <SpeedControl rate={state.rate} onRate={(rate) => engine.setRate(rate)} />
      {!mushaf && drill ? (
        <p className="listen-repeat-note">
          Repeat the verse from the button under play. Word chips on the page: ×1 and ×2 stay free. {PLUS_NAME} is 3× and up.
        </p>
      ) : null}
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

  if (plusExplain) {
    return (
      <Sheet
        title={PLUS_NAME}
        onClose={onClose}
        icon={
          <span className="sheet-tile" style={{ color: "var(--action-primary)" }}>
            <Icon name="sparkles" size={18} />
          </span>
        }
      >
        <PlusExplain plusOn={plusOn} onBack={() => setPlusExplain(false)} />
      </Sheet>
    );
  }

  return (
    <Sheet title="Settings" onClose={onClose}>
      <div className="listen-sheet">
        <p className="listen-sheet-lead">
          {mushaf
            ? "Reading stays free. Repeat on the player loops this verse."
            : plusOn
              ? "Play this verse, or pick Drill, Masked, or Relay."
              : "Look around Focus. Play, Drill, Masked, and Relay are Diras Plus. Mushaf stays free."}
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
              plusOn={plusOn}
              onAskPlus={() => askPlus("focus")}
              onPick={(id) => onPickMode(id)}
            />
            <PlusRow plusOn={plusOn} onOpen={() => setPlusExplain(true)} />
            {playback}
            {verses}
          </>
        )}
      </div>
    </Sheet>
  );
}
