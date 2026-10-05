import { Icon } from "@/components/icon";

/** Practice tab — drills live on the open surah (including free AI Ustadh). */
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
            Open a surah from Menu. Practice → AI Ustadh for free mic coaching, or Word Reps, Masked, and
            Relay on Mushaf or Focus.
          </p>
        </div>
      </div>
    </main>
  );
}
