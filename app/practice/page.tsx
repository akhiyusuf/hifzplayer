import { PracticePlanner } from "@/components/practice-planner";
import { OfflineBanner } from "@/components/offline-banner";

/** Practice tab — memorization planner (Plus) + drills on the open surah. */
export default function PracticePage() {
  return (
    <main className="shell" id="main">
      <nav className="page-nav">
        <h1>Practice</h1>
      </nav>
      <OfflineBanner />
      <PracticePlanner />
    </main>
  );
}
