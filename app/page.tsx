import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { APP_NAME, APP_TAGLINE, PLUS_NAME } from "@/lib/brand";
import { SALAAM } from "@/lib/greeting";
import { ONBOARDING_LEAD } from "@/lib/onboarding";

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "The mushaf that keeps up with the reciter. Quran reading stays free. Focus practice and listen lists when you want them.",
};

export default function LandingPage() {
  return (
    <main className="landing" id="main">
      <div className="landing-stage">
        <header className="landing-top">
          <span className="landing-mark" aria-hidden="true">
            <Icon name="book-open" size={18} />
          </span>
          <nav className="landing-nav" aria-label="Marketing">
            <Link href="/pricing">{PLUS_NAME}</Link>
            <Link href="/home">Open app</Link>
          </nav>
        </header>

        <section className="landing-hero">
          <p className="label-eyebrow salaam">{SALAAM}</p>
          <h1>{APP_NAME}</h1>
          <p className="landing-lead">{ONBOARDING_LEAD}</p>
          <div className="landing-cta">
            <Link className="btn-primary" href="/home">
              Open the mushaf
            </Link>
            <Link className="btn-secondary" href="/pricing">
              Try Plus free for 1 day
            </Link>
          </div>
        </section>

        <aside className="landing-mushaf" aria-hidden="true">
          <p className="landing-ayah">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>
          <p className="landing-ayah soft">ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ</p>
          <p className="landing-ayah soft">ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>
          <span className="landing-glow" />
        </aside>
      </div>

      <section className="landing-promise">
        <h2>Built to stay with the words</h2>
        <p>Each word lights as it is recited. Translation sits above play. Practise without leaving the page.</p>
      </section>

      <footer className="landing-foot">
        <Link href="/privacy">Privacy</Link>
        <span aria-hidden="true">·</span>
        <Link href="/credits">Credits</Link>
        <span aria-hidden="true">·</span>
        <Link href="/roadmap">What&apos;s coming</Link>
      </footer>
    </main>
  );
}
