"use client";

import { Icon } from "@/components/icon";
import { APP_NAME } from "@/lib/brand";
import { SALAAM } from "@/lib/greeting";
import {
  ONBOARDING_LEAD,
  ONBOARDING_POINTS,
  ONBOARDING_PRIMARY_CTA,
  ONBOARDING_SECONDARY_CTA,
  RITUAL_ARABIC,
  RITUAL_SURAH,
} from "@/lib/onboarding";

export function Onboarding({
  onFocus,
  onBrowse,
}: {
  /** Start the first-surah Focus ritual. */
  onFocus: () => void;
  /** Skip into the reading hub without Focus. */
  onBrowse: () => void;
}) {
  return (
    <main className="shell onboard" id="main">
      <span className="onboard-mark" aria-hidden="true">
        <Icon name="brackets" size={22} />
      </span>
      <span className="label-eyebrow salaam">{SALAAM}</span>
      <h1>{APP_NAME}</h1>
      <p className="onboard-lead">{ONBOARDING_LEAD}</p>

      <div className="onboard-ritual" aria-label={`First surah · ${RITUAL_SURAH}`}>
        <span className="onboard-ritual-label">First surah · {RITUAL_SURAH}</span>
        <p className="onboard-ritual-ar" lang="ar" dir="rtl">
          {RITUAL_ARABIC}
        </p>
      </div>

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

      <button type="button" className="btn-primary" onClick={onFocus}>
        {ONBOARDING_PRIMARY_CTA}
      </button>
      <button type="button" className="btn-secondary onboard-secondary" onClick={onBrowse}>
        {ONBOARDING_SECONDARY_CTA}
      </button>
    </main>
  );
}
