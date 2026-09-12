"use client";

import { Icon } from "@/components/icon";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

const POINTS = [
  {
    icon: "play" as const,
    title: "Listen",
    body: "Tap a surah. Use Set up if you only want some verses.",
  },
  {
    icon: "book-open" as const,
    title: "Read along",
    body: "Play follows the words. Translation sits above play. Tajweed colours are in Settings.",
  },
  {
    icon: "brackets" as const,
    title: "Practise when you want",
    body: "Focus — Drill, Masked, and Relay — is there on the player. Reading stays free.",
  },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  return (
    <main className="shell onboard" id="main">
      <span className="onboard-mark" aria-hidden="true">
        <Icon name="book-open" size={22} />
      </span>
      <span className="label-eyebrow">{APP_TAGLINE}</span>
      <h1>{APP_NAME}</h1>
      <p className="onboard-lead">Open a surah. Play follows the words. Reading stays free.</p>
      <ul className="onboard-points">
        {POINTS.map((point) => (
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
