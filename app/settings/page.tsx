"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { KEYS } from "@/lib/constants";
import { getStore, setStore } from "@/lib/storage";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/lib/toast";

function usePref<T>(key: string, fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    const stored = getStore<T>(key);
    setValue(stored != null ? stored : fallback);
  }, [key]);
  return [
    value,
    (next: T) => {
      setValue(next);
      setStore(key, next);
    },
  ];
}

function Row({
  title,
  sub,
  checked,
  onChange,
}: {
  title: string;
  sub: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="settings-row"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
    >
      <span className="st">
        <b>{title}</b>
        <span>{sub}</span>
      </span>
      <button
        className={`switch${checked ? " on" : ""}`}
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
      >
        <i />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { dark, toggle } = useTheme();
  const { showToast } = useToast();
  const [taj, setTaj] = usePref(KEYS.taj, false);
  const [phrases, setPhrases] = usePref(KEYS.layerPhrases, true);
  const [confusables, setConfusables] = usePref(KEYS.layerConfusables, true);
  const [translation, setTranslation] = usePref(KEYS.showTranslation, true);
  const gap = { marginTop: 6 };

  return (
    <main className="shell" id="main">
      <nav className="page-nav">
        <Link className="icon-btn sm tap" href="/" aria-label="Back">
          <Icon name="chevron-left" size={19} />
        </Link>
        <h1>Settings</h1>
      </nav>
      <div
        style={{
          flex: 1,
          padding: "16px 20px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 9,
          maxWidth: 640,
        }}
      >
        <span className="label-eyebrow">Appearance</span>
        <Row title="Dark theme" sub="Easier on the eyes at night" checked={dark} onChange={toggle} />
        <Row title="Tajweed colours" sub="Colour letters by recitation rule" checked={taj} onChange={setTaj} />
        <Row
          title="Show translation while playing"
          sub="Keeps the current verse's meaning above the player"
          checked={translation}
          onChange={setTranslation}
        />
        <span className="label-eyebrow" style={gap}>
          Study layers
        </span>
        <Row
          title="Recurring phrases"
          sub="Marks passages that recur elsewhere in the Quran"
          checked={phrases}
          onChange={setPhrases}
        />
        <Row
          title="Near-twin words"
          sub="Marks words that look like a different word elsewhere"
          checked={confusables}
          onChange={setConfusables}
        />
        <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "2px 4px 0" }}>
          Changes apply when you next open a passage. Inside the player, the Layers chips switch them instantly.
        </p>
        <span className="label-eyebrow" style={gap}>
          Data
        </span>
        <button
          className="settings-row"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            textAlign: "left",
          }}
          onClick={() => {
            if (window.confirm("Clear your reading history, recents and day streak? This cannot be undone.")) {
              for (const k of ["hifz.sessions", "hifz.days", KEYS.recents]) window.localStorage.removeItem(k);
              showToast("Reading history cleared");
            }
          }}
        >
          <span className="st">
            <b>Clear reading history</b>
            <span>Removes sessions, recents and your day streak from this device</span>
          </span>
          <Icon name="rotate-ccw" size={17} style={{ color: "var(--state-error)", flex: "none" }} />
        </button>
        <button
          className="settings-row"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            textAlign: "left",
          }}
          onClick={() => {
            for (const k of [KEYS.chapters, KEYS.recitations]) window.localStorage.removeItem(k);
            showToast("Cached content cleared — it re-downloads on next use");
          }}
        >
          <span className="st">
            <b>Clear cached content</b>
            <span>Surah and reciter lists re-download on next use (kept at most 7 days)</span>
          </span>
          <Icon name="cloud-off" size={17} style={{ color: "var(--text-muted)", flex: "none" }} />
        </button>
        <span className="label-eyebrow" style={gap}>
          About
        </span>
        <div className="link-row" style={{ justifyContent: "flex-start", padding: "0 4px" }}>
          <Link href="/credits">Data & attributions</Link>
          <span aria-hidden="true">·</span>
          <Link href="/privacy">Privacy</Link>
          <span aria-hidden="true">·</span>
          <span>v0.1.0</span>
        </div>
      </div>
    </main>
  );
}
