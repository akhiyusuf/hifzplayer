"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { PassageRange } from "@/components/passage-range";
import { useAppData } from "@/lib/app-data";
import { KEYS } from "@/lib/constants";
import { usePlus } from "@/lib/plus";
import { plannerLocked, plannerLockedPitch, practiceLeadCopy } from "@/lib/plus-presence";
import {
  AYAH_PER_DAY_OPTIONS,
  type AyahStateMap,
  type AyahsPerDay,
  type PracticePlan,
  applyAyahOutcome,
  createPlan,
  formatAyahRange,
  memorizedCount,
  normalizeAyahState,
  normalizePlan,
  planTotal,
  practiceRangeHref,
  primarySpan,
  todayQueues,
} from "@/lib/practice-plan";
import { streakCount } from "@/lib/sessions";
import { getStore, setStore } from "@/lib/storage";

function loadPlan(versesCount?: number): PracticePlan | null {
  return normalizePlan(getStore(KEYS.plan), versesCount);
}

function loadAyahState(): AyahStateMap {
  return normalizeAyahState(getStore(KEYS.ayahState));
}

function savePlan(plan: PracticePlan | null) {
  if (!plan) {
    try {
      window.localStorage.removeItem(KEYS.plan);
    } catch {
      /* private mode */
    }
    return;
  }
  setStore(KEYS.plan, plan);
}

function saveAyahState(state: AyahStateMap) {
  setStore(KEYS.ayahState, state);
}

function PlannerLockedCard({ onUnlock }: { onUnlock: () => void }) {
  const pitch = plannerLockedPitch();
  return (
    <button type="button" className="lists-locked tap" onClick={onUnlock} aria-label={pitch.title}>
      <span className="lists-locked-mark">
        <Icon name="sparkles" size={22} />
      </span>
      <b>{pitch.title}</b>
      <span>{pitch.body}</span>
      <span className="occ-meta">{pitch.cta}</span>
    </button>
  );
}

function SetupForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: PracticePlan | null;
  onSaved: (plan: PracticePlan) => void;
  onCancel?: () => void;
}) {
  const { chapters, status } = useAppData();
  const [surah, setSurah] = useState(initial?.surah ?? 67);
  const chapter = chapters.find((c) => c.id === surah);
  const versesCount = chapter?.verses_count || initial?.to || 30;
  const [from, setFrom] = useState(initial?.from ?? 1);
  const [to, setTo] = useState(initial?.to ?? 30);
  const [ayahsPerDay, setAyahsPerDay] = useState<AyahsPerDay>(initial?.ayahsPerDay ?? 3);
  const [seeded, setSeeded] = useState(Boolean(initial));

  useEffect(() => {
    if (!chapter) return;
    if (seeded && initial && initial.surah === chapter.id) {
      setFrom(Math.min(initial.from, chapter.verses_count));
      setTo(Math.min(initial.to, chapter.verses_count));
      setSeeded(false);
      return;
    }
    if (!initial || initial.surah !== chapter.id) {
      setFrom(1);
      setTo(chapter.verses_count);
    }
  }, [chapter?.id, chapter?.verses_count, initial, seeded]);

  const save = () => {
    const plan = createPlan({ surah, from, to: Math.min(to, versesCount), ayahsPerDay });
    if (!plan) return;
    savePlan(plan);
    onSaved(plan);
  };

  if (status === "loading" && !chapters.length) {
    return (
      <div className="status-block" style={{ padding: "32px 20px" }}>
        <div className="spinner" />
        <p>Loading surahs…</p>
      </div>
    );
  }

  return (
    <section className="picker-section plan-setup">
      <div className="index-head">
        <span className="label-eyebrow">Set up in under 30 seconds</span>
      </div>
      <div className="plan-card">
        <PassageRange
          versesCount={versesCount}
          chapters={chapters.length ? chapters : undefined}
          chapterId={surah}
          onChapter={(id) => setSurah(id)}
          from={from}
          to={to}
          onFrom={setFrom}
          onTo={setTo}
          eyebrow="Ayah range (optional — whole surah by default)"
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          <span className="label-eyebrow">Ayahs per day</span>
          <div className="rounds-row" role="group" aria-label="Ayahs per day">
            {AYAH_PER_DAY_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={ayahsPerDay === n ? "on" : undefined}
                onClick={() => setAyahsPerDay(n)}
                aria-pressed={ayahsPerDay === n}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="btn-primary" onClick={save} style={{ marginTop: 8 }}>
          <Icon name="check" size={18} />
          {initial ? "Save plan" : "Start plan"}
        </button>
        {onCancel ? (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </section>
  );
}

function TodayCard({
  title,
  arabicHint,
  count,
  rangeLabel,
  icon,
  empty,
  children,
}: {
  title: string;
  arabicHint: string;
  count: number;
  rangeLabel: string | null;
  icon: string;
  empty: string;
  children?: ReactNode;
}) {
  return (
    <article className={`plan-today-card${count === 0 ? " empty" : ""}`}>
      <div className="plan-today-head">
        <span className="plan-today-tile">
          <Icon name={icon} size={18} />
        </span>
        <div className="plan-today-titles">
          <b>
            {title}{" "}
            <span className="plan-ar" lang="ar" dir="rtl">
              {arabicHint}
            </span>
          </b>
          <span>
            {count === 0 ? empty : `${count} ayah${count === 1 ? "" : "s"}${rangeLabel ? ` · ${rangeLabel}` : ""}`}
          </span>
        </div>
        {count > 0 ? <span className="plan-count">{count}</span> : null}
      </div>
      {count > 0 ? <div className="plan-today-actions">{children}</div> : null}
    </article>
  );
}

function TodayView({
  plan,
  state,
  onState,
  onEdit,
  onReset,
}: {
  plan: PracticePlan;
  state: AyahStateMap;
  onState: (next: AyahStateMap) => void;
  onEdit: () => void;
  onReset: () => void;
}) {
  const router = useRouter();
  const { chapters } = useAppData();
  const [now, setNow] = useState(() => Date.now());
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    setStreak(streakCount());
    setNow(Date.now());
  }, [state]);

  const chapter = chapters.find((c) => c.id === plan.surah);
  const queues = useMemo(() => todayQueues(plan, state, now), [plan, state, now]);
  const memorized = memorizedCount(plan, state);
  const total = planTotal(plan);
  const surahName = chapter ? chapter.name_simple : `Surah ${plan.surah}`;

  const openRange = useCallback(
    (ayahs: number[]) => {
      const span = primarySpan(ayahs);
      if (!span) return;
      router.push(practiceRangeHref(plan.surah, span.from, span.to));
    },
    [plan.surah, router],
  );

  const bump = useCallback(
    (ayahs: number[], outcome: "learned" | "gotIt" | "shaky") => {
      const next = applyAyahOutcome(state, plan.surah, ayahs, outcome, Date.now());
      saveAyahState(next);
      onState(next);
    },
    [onState, plan.surah, state],
  );

  const newSpan = primarySpan(queues.newAyahs);
  const reviewSpan = primarySpan(queues.reviewAyahs);
  const revisionSpan = primarySpan(queues.revisionAyahs);

  return (
    <div className="plan-today">
      <div className="plan-progress">
        <div className="plan-progress-line">
          <b>
            {memorized} of {total} ayahs memorized
          </b>
          {streak > 0 ? (
            <span className="streak-pill plan-streak">
              <Icon name="flame" size={13} />
              <span className="num">{streak}</span>
            </span>
          ) : null}
        </div>
        <div className="hc-track" aria-hidden="true">
          <i style={{ width: `${total ? Math.min(100, (memorized / total) * 100) : 0}%` }} />
        </div>
        <p className="plan-progress-sub">
          {surahName} {formatAyahRange(plan.from, plan.to)} · {plan.ayahsPerDay}/day
        </p>
      </div>

      <TodayCard
        title="New"
        arabicHint="سبق"
        count={queues.newAyahs.length}
        rangeLabel={newSpan ? formatAyahRange(newSpan.from, newSpan.to) : null}
        icon="plus"
        empty="No new ayahs left in this plan"
      >
        <button type="button" className="btn-primary" onClick={() => openRange(queues.newAyahs)}>
          <Icon name="play" size={16} />
          Open · pick Word Reps / Masked / Relay
        </button>
        <button type="button" className="btn-secondary" onClick={() => bump(queues.newAyahs, "learned")}>
          Mark learned
        </button>
      </TodayCard>

      <TodayCard
        title="Review"
        arabicHint="سبقي"
        count={queues.reviewAyahs.length}
        rangeLabel={reviewSpan ? formatAyahRange(reviewSpan.from, reviewSpan.to) : null}
        icon="rotate-cw"
        empty="Nothing due from the last 7 days"
      >
        <button type="button" className="btn-primary" onClick={() => openRange(queues.reviewAyahs)}>
          <Icon name="play" size={16} />
          Open drills
        </button>
        <div className="plan-outcome-row">
          <button type="button" className="btn-secondary" onClick={() => bump(queues.reviewAyahs, "gotIt")}>
            Got it
          </button>
          <button type="button" className="btn-secondary" onClick={() => bump(queues.reviewAyahs, "shaky")}>
            Shaky
          </button>
        </div>
      </TodayCard>

      <TodayCard
        title="Revision"
        arabicHint="منزل"
        count={queues.revisionAyahs.length}
        rangeLabel={revisionSpan ? formatAyahRange(revisionSpan.from, revisionSpan.to) : null}
        icon="book-open"
        empty="No older ayahs due today"
      >
        <button type="button" className="btn-primary" onClick={() => openRange(queues.revisionAyahs)}>
          <Icon name="play" size={16} />
          Open drills
        </button>
        <div className="plan-outcome-row">
          <button type="button" className="btn-secondary" onClick={() => bump(queues.revisionAyahs, "gotIt")}>
            Got it
          </button>
          <button type="button" className="btn-secondary" onClick={() => bump(queues.revisionAyahs, "shaky")}>
            Shaky
          </button>
        </div>
      </TodayCard>

      <div className="plan-foot-actions">
        <button type="button" className="btn-secondary" onClick={onEdit}>
          <Icon name="pencil" size={16} />
          Edit plan
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            if (typeof window !== "undefined" && !window.confirm("Reset plan and progress on this device?")) {
              return;
            }
            onReset();
          }}
        >
          <Icon name="rotate-ccw" size={16} />
          Reset
        </button>
      </div>
    </div>
  );
}

export function PracticePlanner() {
  const { plus, ready, askPlus } = usePlus();
  const { chapters } = useAppData();
  const locked = plannerLocked(plus);
  const [plan, setPlan] = useState<PracticePlan | null>(null);
  const [state, setState] = useState<AyahStateMap>({});
  const [editing, setEditing] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const chapter = chapters.find((c) => c.id === loadPlan()?.surah);
    setPlan(loadPlan(chapter?.verses_count));
    setState(loadAyahState());
    setHydrated(true);
  }, [chapters]);

  if (!hydrated || !ready) {
    return (
      <div className="status-block" style={{ padding: "40px 20px" }}>
        <div className="spinner" />
        <p>Loading practice…</p>
      </div>
    );
  }

  return (
    <div className="picker-body plan-body" style={{ paddingTop: 12 }}>
      <p className="lists-lead">{practiceLeadCopy(plus)}</p>
      {locked ? (
        <section className="picker-section">
          <div className="index-head">
            <span className="label-eyebrow">Memorization planner</span>
          </div>
          <PlannerLockedCard
            onUnlock={() => {
              if (ready) askPlus("planner");
            }}
          />
          <p className="plan-hint">
            Word Reps, Masked, and Relay stay on the open surah — still Diras Plus. AI Ustadh is coming soon.
          </p>
        </section>
      ) : editing || !plan ? (
        <SetupForm
          initial={editing ? plan : null}
          onSaved={(next) => {
            setPlan(next);
            setEditing(false);
          }}
          onCancel={editing && plan ? () => setEditing(false) : undefined}
        />
      ) : (
        <TodayView
          plan={plan}
          state={state}
          onState={setState}
          onEdit={() => setEditing(true)}
          onReset={() => {
            savePlan(null);
            saveAyahState({});
            setPlan(null);
            setState({});
            setEditing(false);
          }}
        />
      )}
      <p className="plan-hint" style={{ marginTop: 8 }}>
        <Link href="/home">Open a surah from Menu</Link> anytime — drills live on Mushaf or Focus.
      </p>
    </div>
  );
}
