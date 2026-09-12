import Link from "next/link";
import { Icon } from "@/components/icon";
import { ListenLists } from "@/components/listen-lists";
import { OfflineBanner } from "@/components/offline-banner";
import { PLUS_NAME } from "@/lib/brand";

export default function ListenPage() {
  return (
    <main className="shell" id="main">
      <nav className="page-nav">
        <Link className="icon-btn sm tap" href="/" aria-label="Back">
          <Icon name="chevron-left" size={19} />
        </Link>
        <h1>Listen</h1>
      </nav>
      <OfflineBanner />
      <div className="picker-body" style={{ paddingTop: 12 }}>
        <p className="lists-lead">
          Occasion lists for Friday, night, morning, and the rest. Reading stays on Read. Playing a list is{" "}
          {PLUS_NAME}.
        </p>
        <ListenLists />
      </div>
    </main>
  );
}
