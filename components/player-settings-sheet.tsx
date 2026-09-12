"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "./icon";
import { PassageRange } from "./passage-range";
import { Sheet } from "./sheet";
import { useAppData } from "@/lib/app-data";
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

function PlusRow({ plusOn }: { plusOn: boolean }) {
  if (plusOn) {
    return (
      <section className="listen-section" aria-label={PLUS_NAME}>
        <div className="listen-sheet-row on">
          <span className="st">
            <b>{PLUS_NAME} is on</b>
            <span>3× to unlimited word repeats, and extra qaris in relay</span>
          </span>
          <Icon name="sparkles" size={17} style={{ color: "var(--action-primary)", flex: "none" }} />
        </div>
      </section>
    );
  }
  return (
    <section className="listen-section" aria-label={PLUS_NAME}>
      <Link href="/pricing?from=player" className="listen-sheet-row tap">
        <span className="st">
          <b>What {PLUS_NAME} is</b>
          <span>3× to unlimited word repeats, and extra qaris in relay. Practise stays free.</span>
        </span>
        <Icon name="sparkles" size={17} style={{ color: "var(--action-primary)", flex: "none" }} />
      </Link>
    </section>
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
  const current = FOCUS_JOBS.find((m) => m.id === mode);
  return (
    <section className="listen-section" aria-label="Practise">
      <span className="label-eyebrow">Practise</span>
      <p className="practise-jobs-lead">
        {current
          ? current.desc
          : "Play this verse as usual. Pick a job when you want to work it."}
      </p>
      <div className="practise-jobs" role="group" aria-label="Practise">
        {FOCUS_JOBS.map((m) => {
          const on = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              className={`practise-job tap${on ? " on" : ""}`}
              aria-pressed={on}
              onClick={() => onPick(on ? "verse" : m.id)}
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
  const { plus: plusOn } = usePlus();
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

  return (
    <Sheet title="Settings" onClose={onClose}>
      <div className="listen-sheet">
        <p className="listen-sheet-lead">
          {mushaf
            ? "Reading stays free. Repeat on the player loops this verse."
            : `Drill, Masked, or Relay — or just play the verse. ${PLUS_NAME} is extra word repeats and extra qaris.`}
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
            <PlusRow plusOn={plusOn} />
            {playback}
            {verses}
          </>
        )}
      </div>
    </Sheet>
  );
}
