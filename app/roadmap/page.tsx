import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { APP_NAME } from "@/lib/brand";
import { backHref } from "@/lib/nav";
import {
  ASK_PROMPTS,
  ROADMAP_STATUS_LABEL,
  featuredRoadmap,
  listedRoadmap,
  type RoadmapItem,
} from "@/lib/roadmap";

export const metadata: Metadata = { title: `What's coming — ${APP_NAME}` };

function Status({ item }: { item: RoadmapItem }) {
  return (
    <span className={`road-status${item.featured ? " hot" : ""}`}>
      {ROADMAP_STATUS_LABEL[item.status]}
      {item.plus ? "" : " · stays free"}
    </span>
  );
}

function AskPreview() {
  const ask = featuredRoadmap()[0];
  if (!ask) return null;
  return (
    <section className="road-hero" aria-labelledby="road-ask-title">
      <span className="road-hero-ar" lang="ar" dir="rtl">
        {ask.arabic}
      </span>
      <Status item={ask} />
      <h2 id="road-ask-title">{ask.title}</h2>
      <p>{ask.blurb}</p>
      <p className="road-detail">{ask.detail}</p>
      <div className="road-ask" aria-hidden="true">
        <Icon name="sparkles" size={16} />
        <span>Ask about what you are reading</span>
      </div>
      <ul className="road-chips">
        {ASK_PROMPTS.map((prompt) => (
          <li key={prompt}>{prompt}</li>
        ))}
      </ul>
    </section>
  );
}

function ItemCard({ item }: { item: RoadmapItem }) {
  return (
    <article className="road-card">
      <span className="road-tile" aria-hidden="true">
        <Icon name={item.icon} size={18} />
      </span>
      <div className="road-text">
        <div className="road-card-top">
          <h2>
            {item.title}
            {item.arabic ? (
              <span className="road-ar" lang="ar" dir="rtl">
                {item.arabic}
              </span>
            ) : null}
          </h2>
          <Status item={item} />
        </div>
        <p>{item.blurb}</p>
        <p className="road-detail">{item.detail}</p>
      </div>
    </article>
  );
}

export default async function RoadmapPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  return (
    <main className="shell" id="main">
      <nav className="page-nav">
        <Link className="icon-btn sm tap" href={backHref(from)} aria-label="Back">
          <Icon name="chevron-left" size={19} />
        </Link>
        <h1>What&apos;s coming</h1>
      </nav>
      <div className="road-page">
        <p className="road-lead">
          The mushaf stays. These are next — parked until the page was ready, and one new way to sit with the book.
        </p>
        <AskPreview />
        <span className="label-eyebrow">On the page</span>
        {listedRoadmap().map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
        <p className="road-foot">
          No dates until something actually ships. Reading, audio, translation, and tajweed stay free either way.
        </p>
      </div>
    </main>
  );
}
