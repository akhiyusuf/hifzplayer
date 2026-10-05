import { Icon } from "@/components/icon";

/** Practice tab — drills live on the open surah. */
export default function PracticePage() {
  return (
    <main className="shell" id="main">
      <div className="status-block" style={{ padding: "48px 20px" }}>
        <div className="status-medallion">
          <Icon name="mic" size={30} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1>Practice</h1>
          <p>
            Open a surah from Menu. Practice → Word Reps, Masked, or Relay on Mushaf or Focus. AI
            Ustadh is coming soon as part of Diras Plus.
          </p>
        </div>
      </div>
    </main>
  );
}
