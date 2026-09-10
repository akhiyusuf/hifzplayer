import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";

export const metadata: Metadata = { title: "Data & attributions — Hifz" };

const SOURCES = [
  {
    href: "https://api-docs.quran.foundation/",
    icon: "book",
    title: "Quran text & audio",
    body: "Quran Foundation — quran.com v4 API",
  },
  {
    href: "https://quran.com/about-us",
    icon: "languages",
    title: "Translation",
    body: "Saheeh International, via the quran.com v4 API",
  },
  {
    href: "https://quran.com/about-us",
    icon: "palette",
    title: "Tajweed colouring",
    body: "Rule classes from the v4 word markup",
  },
  {
    href: "https://creativecommons.org/licenses/by/4.0/",
    icon: "git-compare",
    title: "Confusable words",
    beta: true,
    body: "QuranMorph — SinaLab, Birzeit University. Akra, Hammouda & Jarrar (2025), “QuranMorph: Morphologically Annotated Quranic Corpus”. Licensed CC-BY-4.0.",
  },
  {
    href: "https://qul.tarteel.ai/",
    icon: "layers",
    title: "Recurring phrases",
    beta: true,
    body: "Mutashabihat dataset — Quranic Universal Library (QUL).",
  },
];

export default function CreditsPage() {
  return (
    <main className="shell" id="main">
      <nav className="page-nav">
        <Link className="icon-btn sm tap" href="/" aria-label="Back">
          <Icon name="chevron-left" size={19} />
        </Link>
        <h1>Data & attributions</h1>
      </nav>
      <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 11 }}>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-secondary)", marginBottom: 2 }}>
          Quran text, translations, and recitations are provided by the sources below.
        </p>
        {SOURCES.map((s) => (
          <a
            key={s.title}
            className="credit-card"
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            <span className="credit-tile">
              <Icon name={s.icon} size={18} />
            </span>
            <span className="credit-text">
              <b style={{ display: "flex", alignItems: "center", gap: 7 }}>
                {s.title}
                {s.beta && <span className="badge-beta">Beta</span>}
              </b>
              <span>{s.body}</span>
            </span>
            <Icon name="external-link" size={16} />
          </a>
        ))}
        <p style={{ fontSize: 12, lineHeight: 1.5, color: "var(--text-muted)", marginTop: 6 }}>
          API content is cached on this device for no more than seven days, in line with the Quran Foundation
          developer terms. The QuranMorph corpus is provided for peaceful, non-military and non-malicious use only.
        </p>
        <p style={{ fontSize: 12, lineHeight: 1.5, color: "var(--text-muted)" }}>
          Recurring-phrase and confusable-word markings are algorithmic candidates, not a curated list. They point
          out where the text resembles itself; they do not interpret it.
        </p>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11.5,
            color: "var(--text-muted)",
            marginTop: 2,
          }}
        >
          <Icon name="shield-check" size={14} />
          Quran content is always free to access.
        </span>
      </div>
    </main>
  );
}
