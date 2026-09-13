"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./icon";
import { Sheet } from "./sheet";
import { ThemePicker } from "./theme-picker";
import { useAppData } from "@/lib/app-data";
import { isPaidRelay, isPaidRepeat } from "@/lib/billing/gates";
import { FOCUS_JOBS, type ModeId } from "@/lib/constants";
import {
  RELAY_ROUNDS,
  readRelayDraft,
  sidebarKind,
  writeRelayDraft,
  type RelayDraft,
  type RelaySeat,
} from "@/lib/player-chrome";
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
    <label className="sidebar-row">
      <span className="sidebar-k">{label}</span>
      <span className="sidebar-v">{value}</span>
      <Icon name="chevron-down" size={16} style={{ color: "var(--text-muted)", flex: "none" }} />
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
    <div className="sidebar-row sidebar-row-stack">
      <span className="sidebar-k">Mode</span>
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
    <section className="sidebar-jobs" aria-label="Drill type">
      <span className="sidebar-k">Drill type</span>
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
    <div className="player-side-foot sidebar-group">
      <div className="sidebar-row sidebar-row-stack">
        <span className="sidebar-k">Theme</span>
        <div className="style-toggle sidebar-seg" role="group" aria-label="Theme">
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

function defaultOrder(reciterId: number): RelaySeat[] {
  return [{ kind: "qari", reciterId }, { kind: "you" }];
}

function RelaySetup({
  chapter,
  versesCount,
  passageFrom,
  passageTo,
  reciterId,
  initial,
  onStart,
}: {
  chapter: number;
  versesCount: number;
  passageFrom: number;
  passageTo: number;
  reciterId: number;
  initial?: RelayDraft | null;
  onStart: (order: RelaySeat[], vFrom: number, vTo: number, rounds: number) => void | Promise<void>;
}) {
  const { recitations, reciterName } = useAppData();
  const { plus: plusOn, askPlus } = usePlus();
  const draft = initial || readRelayDraft();
  const sameChapter = !draft?.chapter || draft.chapter === chapter;
  const [order, setOrder] = useState<RelaySeat[]>(() =>
    draft?.order?.length ? draft.order : defaultOrder(reciterId),
  );
  const [from, setFrom] = useState(() => {
    const n = sameChapter ? draft?.vFrom || passageFrom : passageFrom;
    return Math.min(versesCount, Math.max(1, n));
  });
  const [to, setTo] = useState(() => {
    const n = sameChapter ? draft?.vTo || passageTo : passageTo;
    return Math.min(versesCount, Math.max(1, n));
  });
  const [rounds, setRounds] = useState(() => draft?.rounds ?? 2);
  const [busy, setBusy] = useState(false);
  const skipWrite = useRef(true);

  useEffect(() => {
    if (skipWrite.current) {
      skipWrite.current = false;
      return;
    }
    writeRelayDraft({ chapter, order, vFrom: from, vTo: to, rounds, start: false });
  }, [chapter, order, from, to, rounds]);

  const move = (index: number, dir: number) => {
    const next = index + dir;
    if (next < 0 || next >= order.length) return;
    const copy = order.slice();
    const item = copy[index];
    copy[index] = copy[next];
    copy[next] = item;
    setOrder(copy);
  };

  const setSeat = (index: number, value: string) => {
    const copy = order.slice();
    copy[index] = value === "you" ? { kind: "you" } : { kind: "qari", reciterId: Number(value.slice(1)) };
    if (isPaidRelay(copy) && !plusOn) {
      askPlus("relay-qaris");
      return;
    }
    setOrder(copy);
  };

  return (
    <>
      <div className="sidebar-range">
        {[
          { label: "From", value: from, set: setFrom },
          { label: "To", value: to, set: setTo },
        ].map((field) => (
          <label key={field.label} className="sidebar-row sidebar-row-range">
            <span className="sidebar-k">{field.label}</span>
            <span className="sidebar-v">
              {chapter}:{field.value}
            </span>
            <Icon name="chevron-down" size={16} style={{ color: "var(--text-muted)", flex: "none" }} />
            <select
              aria-label={`${field.label} verse`}
              value={field.value}
              onChange={(e) => {
                const n = Number(e.target.value);
                field.set(n);
                if (field.label === "From" && to < n) setTo(n);
                if (field.label === "To" && n < from) setFrom(n);
              }}
            >
              {Array.from({ length: versesCount }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {chapter}:{n}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="sidebar-block">
        <span className="sidebar-k">Reciters</span>
        <div className="sheet-list" style={{ marginTop: 6 }}>
          {order.map((seat, index) => {
            const name = seat.kind === "you" ? "You (paced)" : reciterName(seat.reciterId);
            return (
              <div key={`${seat.kind}-${index}`} className={`order-row${seat.kind === "you" ? " you" : ""}`}>
                <Icon name="grip-vertical" size={17} style={{ color: "var(--text-muted)", flex: "none" }} />
                <span className="order-avatar">
                  <Icon name={seat.kind === "you" ? "user" : "mic"} size={16} />
                </span>
                <label className="order-name">
                  {name}
                  <select
                    aria-label={`Participant ${index + 1}`}
                    value={seat.kind === "you" ? "you" : `q${seat.reciterId}`}
                    onChange={(e) => setSeat(index, e.target.value)}
                  >
                    <option value="you">You (paced)</option>
                    <optgroup label="Qaris">
                      {recitations.map((item) => (
                        <option key={item.id} value={`q${item.id}`}>
                          {item.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </label>
                <span className="order-actions">
                <button
                  type="button"
                  className="tap"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${name} up`}
                  style={{ color: "var(--text-muted)", opacity: index === 0 ? 0.3 : 1 }}
                >
                  <Icon name="chevron-up" size={16} />
                </button>
                <button
                  type="button"
                  className="tap"
                  onClick={() => move(index, 1)}
                  disabled={index === order.length - 1}
                  aria-label={`Move ${name} down`}
                  style={{ color: "var(--text-muted)", opacity: index === order.length - 1 ? 0.3 : 1 }}
                >
                  <Icon name="chevron-down" size={16} />
                </button>
                <button
                  type="button"
                  className="tap"
                  onClick={() => {
                    if (order.length <= 1) return;
                    setOrder(order.filter((_, i) => i !== index));
                  }}
                  disabled={order.length <= 1}
                  aria-label={`Remove ${name}`}
                  style={{ color: "var(--text-muted)", opacity: order.length <= 1 ? 0.3 : 1 }}
                >
                  <Icon name="x" size={16} />
                </button>
                </span>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className={`btn-dashed${plusOn ? "" : " locked"}`}
          style={{ marginTop: 8 }}
          onClick={() => {
            const next = [...order, { kind: "qari" as const, reciterId }];
            if (isPaidRelay(next) && !plusOn) {
              askPlus("relay-qaris");
              return;
            }
            setOrder(next);
          }}
        >
          <Icon name={plusOn ? "plus" : "sparkles"} size={16} />
          {plusOn ? "Add participant" : "Add another reciter"}
        </button>
      </div>
      <div className="sidebar-block">
        <span className="sidebar-k">Rounds</span>
        <div className="rounds-row" style={{ marginTop: 6 }} role="group" aria-label="Rounds">
          {RELAY_ROUNDS.map((item) => {
            const locked = isPaidRepeat(item.value) && !plusOn;
            return (
              <button
                key={item.value}
                type="button"
                className={`${rounds === item.value ? "on" : ""}${locked ? " locked" : ""}`}
                onClick={() => (locked ? askPlus("repeats") : setRounds(item.value))}
                aria-pressed={rounds === item.value}
                style={item.value === 0 ? { fontSize: 12 } : undefined}
              >
                {locked ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {item.label}
                    <Icon name="sparkles" size={11} />
                  </span>
                ) : (
                  item.label
                )}
              </button>
            );
          })}
        </div>
      </div>
      <button
        type="button"
        className="btn-primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onStart(order, from, to, rounds);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? (
          <>
            <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            Preparing reciters…
          </>
        ) : (
          <>
            <Icon name="play" size={18} />
            Start relay
          </>
        )}
      </button>
    </>
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
  reciterId,
  relay,
  onRelayStart,
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
  reciterId?: number;
  relay?: RelayDraft | null;
  onRelayStart?: (order: RelaySeat[], vFrom: number, vTo: number, rounds: number) => void | Promise<void>;
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
    translations.find((item) => item.id === transId) || translations.find((item) => item.id === 20);

  const locate = kind === "mushaf" || kind === "word" || kind === "masked";
  const relayOn = kind === "relay";
  const drill = kind !== "mushaf";
  const compactDrill = kind !== "focus";
  const reciter = kind !== "focus" && kind !== "relay";
  const translation = kind === "mushaf";
  const qariId = reciterId || 0;

  return (
    <Sheet title="Settings" side="right" onClose={onClose}>
      <div className="player-side" data-sidebar={kind}>
        <div className="sidebar-group">
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
        </div>
        {locate || relayOn || translation || reciter ? (
          <div className="sidebar-group">
            {locate || relayOn ? (
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
            {relayOn && onRelayStart ? (
              <RelaySetup
                chapter={passage.chapter}
                versesCount={versesCount}
                passageFrom={passage.from}
                passageTo={passage.to}
                reciterId={qariId}
                initial={relay}
                onStart={onRelayStart}
              />
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
                <span className="sidebar-v">{qariName || "Choose a reciter"}</span>
                <Icon name="chevron-down" size={16} style={{ color: "var(--text-muted)", flex: "none" }} />
              </button>
            ) : null}
          </div>
        ) : null}
        <ThemeFoot />
      </div>
    </Sheet>
  );
}
