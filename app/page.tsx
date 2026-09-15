import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { LandingFocusDemo } from "@/components/landing-focus-demo";
import { LANDING } from "@/lib/landing";

export const metadata: Metadata = {
  title: LANDING.metaTitle,
  description: LANDING.metaDescription,
};

export default function LandingPage() {
  return (
    <main className="landing" id="main">
      <header className="landing-top">
        <span className="landing-mark" aria-hidden="true">
          <Icon name="book-open" size={18} />
        </span>
        <nav className="landing-nav" aria-label="Marketing">
          <Link href="/pricing">{LANDING.plusTitle}</Link>
          <Link href="/home">Open app</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="label-eyebrow salaam">{LANDING.salaam}</p>
          <p className="landing-brand">{LANDING.brand}</p>
          <h1>{LANDING.headline}</h1>
          <p className="landing-lead">{LANDING.lead}</p>
          <div className="landing-cta">
            <Link className="btn-primary" href={LANDING.primaryHref}>
              {LANDING.primaryCta}
            </Link>
            <Link className="btn-secondary" href={LANDING.secondaryHref}>
              {LANDING.secondaryCta}
            </Link>
          </div>
          <p className="landing-free">{LANDING.freeLine}</p>
        </div>

        <div className="landing-hero-demo">
          <p className="landing-demo-kicker">Try Focus on Al-ʿAṣr — no account</p>
          <LandingFocusDemo />
        </div>
      </section>

      <section className="landing-focus" aria-labelledby="landing-focus-title">
        <div className="landing-section-head">
          <h2 id="landing-focus-title">{LANDING.focusTitle}</h2>
          <p>
            {LANDING.focusLead} Use the live floor above — same Word Reps, Masked, and Relay chrome as
            in the app.
          </p>
        </div>
        <div className="landing-jobs">
          {LANDING.jobs.map((job) => (
            <article key={job.id} className="landing-job">
              <div className="landing-job-top">
                <span className="landing-job-icon" aria-hidden="true">
                  <Icon name={job.icon} size={18} />
                </span>
                <h3>{job.title}</h3>
              </div>
              <p>{job.blurb}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-plus" aria-labelledby="landing-plus-title">
        <div className="landing-plus-inner">
          <span className="landing-plus-badge" aria-hidden="true">
            <Icon name="sparkles" size={18} />
          </span>
          <h2 id="landing-plus-title">{LANDING.plusTitle}</h2>
          <p className="landing-plus-lead">{LANDING.plusLead}</p>
          <ul>
            {LANDING.plusPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <Link className="btn-primary" href={LANDING.primaryHref}>
            {LANDING.primaryCta}
          </Link>
        </div>
      </section>

      <section className="landing-upcoming" aria-labelledby="landing-upcoming-title">
        <div className="landing-section-head">
          <h2 id="landing-upcoming-title">{LANDING.upcomingTitle}</h2>
          <p>{LANDING.upcomingLead}</p>
        </div>
        <div className="landing-upcoming-grid">
          {LANDING.upcoming.map((item) => (
            <article key={item.id} className="landing-upcoming-card">
              <div className="landing-upcoming-top">
                <span className="landing-job-icon" aria-hidden="true">
                  <Icon name={item.icon} size={18} />
                </span>
                <span className={item.plus ? "landing-plus-tag" : "landing-free-tag"}>
                  {item.plus ? "Plus" : "Free"}
                </span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.blurb}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-close" aria-labelledby="landing-close-title">
        <h2 id="landing-close-title">{LANDING.closeTitle}</h2>
        <p>{LANDING.closeLead}</p>
        <div className="landing-cta">
          <Link className="btn-primary" href={LANDING.closeHref}>
            {LANDING.closeCta}
          </Link>
          <Link className="btn-secondary" href="/home">
            Open the mushaf
          </Link>
        </div>
      </section>

      <footer className="landing-foot">
        <Link href="/home">Mushaf</Link>
        <span aria-hidden="true">·</span>
        <Link href="/pricing">Pricing</Link>
        <span aria-hidden="true">·</span>
        <Link href="/account">Account</Link>
      </footer>
    </main>
  );
}
