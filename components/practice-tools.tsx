"use client";

import { Icon } from "./icon";
import { FOCUS_JOBS, type ModeId } from "@/lib/constants";

/**
 * On-page practice tools for Mushaf and Focus views.
 * These are Plus features — the parent gates via onPick.
 */
export function PracticeTools({
  mode,
  plusOn,
  onPick,
}: {
  mode: string;
  plusOn: boolean;
  onPick: (id: ModeId) => void;
}) {
  return (
    <div className="practice-tools" role="toolbar" aria-label="Practice">
      <span className="practice-tools-label">Practice</span>
      <div className="practice-tools-row">
        {FOCUS_JOBS.map((job) => {
          const on = mode === job.id;
          return (
            <button
              key={job.id}
              type="button"
              className={`practice-tool tap${on ? " on" : ""}${plusOn || on ? "" : " locked"}`}
              aria-pressed={on}
              onClick={() => onPick(on ? "verse" : job.id)}
            >
              <Icon name={job.icon} size={16} />
              <span>{job.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
