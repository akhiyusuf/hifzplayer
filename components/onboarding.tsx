"use client";

import { Icon } from "@/components/icon";
import { APP_NAME } from "@/lib/brand";
import { SALAAM } from "@/lib/greeting";
import { ONBOARDING_LEAD, ONBOARDING_POINTS } from "@/lib/onboarding";

export function Onboarding({ onDone }: { onDone: () => void }) {
  return (
    <main className="shell onboard" id="main">
      <span className="onboard-mark" aria-hidden="true">
        <Icon name="book-open" size={22} />
      </span>
      <span className="label-eyebrow salaam">{SALAAM}</span>
      <h1>{APP_NAME}</h1>
      <p className="onboard-lead">{ONBOARDING_LEAD}</p>
      <ul className="onboard-points">
        {ONBOARDING_POINTS.map((point) => (
          <li key={point.title} className="credit-card">
            <span className="credit-tile">
              <Icon name={point.icon} size={18} />
            </span>
            <span className="credit-text">
              <b>{point.title}</b>
              <span>{point.body}</span>
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className="btn-primary" onClick={onDone}>
        Start reading
      </button>
    </main>
  );
}
