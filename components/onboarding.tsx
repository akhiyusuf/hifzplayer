"use client";

import { BrandLogo } from "@/components/brand-logo";
import { Icon } from "@/components/icon";
import { SALAAM } from "@/lib/greeting";
import { ONBOARDING_LEAD, ONBOARDING_POINTS } from "@/lib/onboarding";

export function Onboarding({ onDone }: { onDone: () => void }) {
  return (
    <main className="shell onboard" id="main">
      <BrandLogo variant="lockup" height={40} className="onboard-logo" />
      <span className="label-eyebrow salaam">{SALAAM}</span>
      <h1 className="sr-only">Diras</h1>
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
