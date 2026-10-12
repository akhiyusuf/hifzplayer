"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { useAuth } from "@/components/auth-root";
import { useToast } from "@/lib/toast";

/** Settings row that shows the user's current display name + lets them change it. */
export function ChangeNameRow() {
  const { loaded, signedIn, name, refresh } = useAuth();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name || "");
  const [busy, setBusy] = useState(false);

  if (!loaded || !signedIn) return null;

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not save name");
      }
      await refresh();
      setEditing(false);
      showToast("Name updated");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save name");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div
        className="settings-row"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 10,
        }}
      >
        <span className="st">
          <b>Display name</b>
          <span>This shows on your account, in emails, and on the payment screen.</span>
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={50}
          placeholder="Your first name"
          style={{ width: "100%", padding: "10px 12px" }}
          autoFocus
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn-primary"
            style={{ flex: 1 }}
            disabled={busy || !value.trim()}
            onClick={save}
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => {
              setEditing(false);
              setValue(name || "");
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="settings-row"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        textDecoration: "none",
        color: "inherit",
        textAlign: "left",
        cursor: "pointer",
      }}
      onClick={() => {
        setValue(name || "");
        setEditing(true);
      }}
    >
      <span className="st">
        <b>Display name</b>
        <span>{name || "Not set"}</span>
      </span>
      <Icon name="pencil" size={17} style={{ color: "var(--action-primary)", flex: "none" }} />
    </button>
  );
}
