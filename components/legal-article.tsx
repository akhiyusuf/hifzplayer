import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import { backHref } from "@/lib/nav";

export function LegalArticle({
  title,
  from,
  updated,
  children,
}: {
  title: string;
  from?: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="shell" id="main">
      <nav className="page-nav">
        <Link className="icon-btn sm tap" href={backHref(from)} aria-label="Back">
          <Icon name="chevron-left" size={19} />
        </Link>
        <h1>{title}</h1>
      </nav>
      <div className="legal-article">
        <p className="legal-updated">Updated {updated}</p>
        {children}
      </div>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="legal-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
