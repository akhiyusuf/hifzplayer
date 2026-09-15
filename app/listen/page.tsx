import Link from "next/link";
import { Icon } from "@/components/icon";
import { ListenLists, ListenPageIntro } from "@/components/listen-lists";
import { OfflineBanner } from "@/components/offline-banner";

export default function ListenPage() {
  return (
    <main className="shell" id="main">
      <nav className="page-nav">
        <Link className="icon-btn sm tap" href="/home" aria-label="Back">
          <Icon name="chevron-left" size={19} />
        </Link>
        <h1>Listen</h1>
      </nav>
      <OfflineBanner />
      <div className="picker-body" style={{ paddingTop: 12 }}>
        <ListenPageIntro />
        <ListenLists />
      </div>
    </main>
  );
}
