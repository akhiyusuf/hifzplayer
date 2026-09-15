import { Icon } from "@/components/icon";

/** Practice tab — blank for now. Drills live on the open surah. */
export default function PracticePage() {
  return (
    <main className="shell" id="main">
      <div className="status-block" style={{ padding: "48px 20px" }}>
        <div className="status-medallion">
          <Icon name="brackets" size={30} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1>Practice</h1>
          <p>Open a surah from Menu. Word Reps, Masked, and Relay sit on the page — Mushaf or Focus view.</p>
        </div>
      </div>
    </main>
  );
}
