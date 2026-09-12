"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Sheet } from "@/components/sheet";
import { useAppData } from "@/lib/app-data";

export function ReciterSheet({
  currentId,
  onPick,
  onClose,
  hint = "Switching mid-playback keeps your place",
}: {
  currentId: number | null | undefined;
  onPick: (id: number, name: string) => void;
  onClose: () => void;
  hint?: string;
}) {
  const { recitations } = useAppData();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const list = q ? recitations.filter((r) => r.name.toLowerCase().includes(q)) : recitations;

  return (
    <Sheet title="Reciter" onClose={onClose} maxHeight="80dvh">
      <div className="field">
        <Icon name="search" size={16} style={{ color: "var(--text-muted)", flex: "none" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reciters"
          aria-label="Search reciters"
        />
      </div>
      <div className="info-line">
        <Icon name="info" size={13} />
        {hint}
      </div>
      <div className="sheet-list" style={{ gap: 2 }}>
        {list.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)", padding: "12px 4px" }}>
            No reciter matches “{query}”.
          </p>
        ) : (
          list.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`qari-row${r.id === currentId ? " on" : ""}`}
              onClick={() => {
                onPick(r.id, r.name);
                onClose();
              }}
              aria-current={r.id === currentId}
            >
              <span className="qari-avatar">
                <Icon name="mic" size={17} />
              </span>
              <span className="qari-text">
                <b>{r.name}</b>
                {r.style ? <span>{r.style}</span> : null}
              </span>
              {r.id === currentId ? (
                <Icon name="check" size={19} style={{ color: "var(--action-primary)" }} />
              ) : null}
            </button>
          ))
        )}
      </div>
    </Sheet>
  );
}
