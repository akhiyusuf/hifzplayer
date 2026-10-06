"use client";

import { useEffect, useState } from "react";
import { FOCUS_JOBS, KEYS } from "@/lib/constants";
import { FOCUS_GUIDE_MS, nextFocusGuideStep } from "@/lib/focus-guide";
import { getStore, setStore } from "@/lib/storage";
import { Icon } from "./icon";

function JobDemo({ id }: { id: string }) {
  if (id === "masked") {
    return (
      <div className="focus-guide-demo" aria-hidden="true">
        <span className="w masked">ٱلْحَمْدُ</span>
        <span className="w masked">لِلَّهِ</span>
        <span className="w">رَبِّ</span>
      </div>
    );
  }
  if (id === "relay") {
    return (
      <div className="focus-guide-demo relay" aria-hidden="true">
        <span className="turn-chip now">
          <span className="turn-avatar">
            <Icon name="user" size={14} />
          </span>
          <span className="turn-text">
            <b>You</b>
            <span>this ayah</span>
          </span>
        </span>
        <span className="turn-chip">
          <span className="turn-avatar">
            <Icon name="mic" size={14} />
          </span>
          <span className="turn-text">
            <b>Reciter</b>
            <span>next ayah</span>
          </span>
        </span>
      </div>
    );
  }
  return (
    <div className="focus-guide-demo" aria-hidden="true">
      <span className="w">ٱلْحَمْدُ</span>
      <span className="w cur">لِلَّهِ</span>
      <span className="w">رَبِّ</span>
    </div>
  );
}

export function FocusJobsGuide({
  mode,
  onPick,
}: {
  mode: string;
  onPick: (id: string) => void;
}) {
  const [tour, setTour] = useState(false);
  const [step, setStep] = useState(0);
  const [held, setHeld] = useState(false);
  const job = FOCUS_JOBS[step] || FOCUS_JOBS[0];

  useEffect(() => {
    if (getStore<boolean>(KEYS.focusGuide) === true) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setTour(true);
  }, []);

  useEffect(() => {
    if (!tour || held) return;
    const id = window.setInterval(() => setStep((current) => nextFocusGuideStep(current)), FOCUS_GUIDE_MS);
    return () => window.clearInterval(id);
  }, [tour, held]);

  useEffect(() => {
    if (!tour) return;
    if (mode !== "word" && mode !== "masked" && mode !== "relay") return;
    setStore(KEYS.focusGuide, true);
    setTour(false);
  }, [mode, tour]);

  const showJobs = mode === "verse";
  if (!tour && !showJobs) return null;

  function dismiss() {
    setStore(KEYS.focusGuide, true);
    setTour(false);
  }

  function start(id: string) {
    dismiss();
    onPick(id);
  }

  return (
    <div className="practice-strip focus-guide" role="region" aria-label="Practice modes">
      <div className="practice-strip-head">
        <b>Pick a practice</b>
        <span>{tour ? `${step + 1} of ${FOCUS_JOBS.length}` : "Word Reps, Masked, or Relay"}</span>
      </div>
      {tour ? (
        <div
          className="practice-strip-track"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={FOCUS_JOBS.length}
          aria-valuenow={step + 1}
          aria-label="Practice modes"
        >
          <i style={{ width: `${((step + 1) / FOCUS_JOBS.length) * 100}%` }} />
        </div>
      ) : null}
      <div className="practise-jobs" role="group" aria-label="Practice modes">
        {FOCUS_JOBS.map((item, index) => {
          const spot = tour && index === step;
          return (
            <button
              key={item.id}
              type="button"
              className={`practise-job tap${spot ? " spot" : ""}${!tour && mode === item.id ? " on" : ""}`}
              aria-current={spot ? "step" : undefined}
              aria-pressed={!tour && mode === item.id}
              onClick={() => {
                if (tour) {
                  setHeld(true);
                  setStep(index);
                  return;
                }
                start(item.id);
              }}
            >
              <span className="practise-job-ic">
                <Icon name={item.icon} size={18} />
              </span>
              <span className="st">
                <b>{item.name}</b>
                <span>{item.desc}</span>
              </span>
            </button>
          );
        })}
      </div>
      {tour && job ? (
        <>
          <JobDemo key={job.id} id={job.id} />
          <div className="practice-strip-actions">
            <button type="button" className="focus-act primary" onClick={() => start(job.id)}>
              <Icon name="play" size={15} />
              Try {job.name}
            </button>
            <button type="button" className="focus-act" onClick={dismiss}>
              Not now
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
