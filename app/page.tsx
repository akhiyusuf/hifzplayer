import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { LANDING } from "@/lib/landing";

export const metadata: Metadata = {
  title: LANDING.metaTitle,
  description: LANDING.metaDescription,
};

function FocusStage() {
  return (
    <div className="landing-stage-card" aria-hidden="true">
      <div className="landing-stage-bar">
        <span className="landing-stage-pill">{LANDING.stageEyebrow}</span>
        <span className="landing-stage-modes">
          <i className="on">Word Reps</i>
          <i>Masked</i>
          <i>Relay</i>
        </span>
      </div>
      <p className="landing-stage-ayah">
        <span className="w dim">وَ</span>
        <span className="w hot">ٱلْعَصْرِ</span>
        <span className="w dim"> إِنَّ ٱلْإِنسَٰنَ لَفِى خُسْرٍ</span>
      </p>
      <div className="landing-stage-meta">
        <span className="landing-rep-chip">×5</span>
        <span>{LANDING.stageCaption}</span>
      </div>
      <span className="landing-glow" />
    </div>
  );
}

function JobSample({ kind }: { kind: "reps" | "masked" | "relay" }) {
  if (kind === "reps") {
    return (
      <div className="landing-job-sample" aria-hidden="true">
        <span className="landing-sample-ar">
          <i className="dim">رَبَّنَا</i> <b>ءَاتِنَا</b> <i className="dim">فِى ٱلدُّنْيَا</i>
        </span>
        <span className="landing-rep-chip">×10</span>
      </div>
    );
  }
  if (kind === "masked") {
    return (
      <div className="landing-job-sample masked" aria-hidden="true">
        <span className="landing-sample-ar">
          <i className="dim">ٱهْدِنَا</i> <b className="blank">····</b> <i className="dim">ٱلْمُسْتَقِيمَ</i>
        </span>
        <span className="landing-sample-hint">Tap to reveal</span>
      </div>
    );
  }
  return (
    <div className="landing-job-sample relay" aria-hidden="true">
      <span className="landing-sample-ar">
        <i className="you">أنت</i>
        <span className="sep">→</span>
        <i className="qari">القاري</i>
        <span className="sep">→</span>
        <i className="you">أنت</i>
      </span>
      <span className="landing-sample-hint">Your turn · then the qari</span>
    </div>
  );
}

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
        <FocusStage />
      </section>

      <section className="landing-focus" aria-labelledby="landing-focus-title">
        <div className="landing-section-head">
          <h2 id="landing-focus-title">{LANDING.focusTitle}</h2>
          <p>{LANDING.focusLead}</p>
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
              <JobSample kind={job.sample.kind} />
            </article>
          ))}
        </div>
      </section>

      <section className="landing-plus" aria-labelledby="landing-plus-title">
        <div className="landing-plus-inner">
          <span className="landing-plus-badge" aria-hidden="true">
            <Icon name="sparkles" size={16} />
          </span>
          <h2 id="landing-plus-title">{LANDING.plusTitle}</h2>
          <p className="landing-plus-lead">{LANDING.plusLead}</p>
          <ul>
            {LANDING.plusPoints.map((line) => (
              <li key={line}>{line}</li>
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
                {item.plus ? <span className="landing-plus-tag">Plus</span> : <span className="landing-free-tag">Free</span>}
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
            {LANDING.secondaryCta}
          </Link>
        </div>
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
