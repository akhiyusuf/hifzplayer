"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { ThemePicker } from "@/components/theme-picker";
import { PLUS_NAME } from "@/lib/brand";
import { KEYS, TAJWEED_LEGEND } from "@/lib/constants";
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

function PlusStatus() {
  const [label, setLabel] = useState("3× repeats and extra relay qaris.");
  const [active, setActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/status");
        const data = (await res.json()) as {
          plus?: boolean;
          planId?: string | null;
          until?: string | null;
        };
        if (cancelled) return;
        if (data.plus) {
          setActive(true);
          const names: Record<string, string> = { monthly: "Monthly", annual: "Annual", lifetime: "Lifetime" };
          const plan = names[data.planId || ""] || "Plus";
          setLabel(
            data.planId === "lifetime"
              ? "Lifetime · 3× repeats, extra qaris"
              : data.until
                ? `${plan} · until ${new Date(data.until).toLocaleDateString()}`
                : `${plan} · 3× repeats, extra qaris`,
          );
        }
      } catch {
        /* keep the default copy */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link
      href="/pricing?from=settings"
      className="settings-row"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <span className="st">
        <b>{active ? `${PLUS_NAME} is on` : PLUS_NAME}</b>
        <span>{label}</span>
      </span>
      <Icon name="sparkles" size={17} style={{ color: "var(--action-primary)", flex: "none" }} />
    </Link>
  );
}

function ComingSoonNote() {
  return (
    <p style={{ fontSize: 12, lineHeight: 1.45, color: "var(--text-muted)", margin: "2px 4px 0" }}>
      Recurring phrases and near-twin words are coming later.{" "}
      <Link href="/credits?from=settings" style={{ color: "inherit" }}>
        Sources
      </Link>
    </p>
  );
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
  const [translation, setTranslation] = usePref(KEYS.showTranslation, true);
  const [legend, setLegend] = useState(false);
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
        <span className="label-eyebrow">You</span>
        <Link
          href="/account?from=settings"
          className="settings-row"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <span className="st">
            <b>Account</b>
            <span>Sign in so {PLUS_NAME} follows you, not just this browser</span>
          </span>
          <Icon name="user" size={17} style={{ color: "var(--action-primary)", flex: "none" }} />
        </Link>
        <PlusStatus />
        <span className="label-eyebrow" style={gap}>
          Reading
        </span>
        <ThemePicker />
        <Row title="Dark theme" sub="Easier on the eyes at night" checked={dark} onChange={toggle} />
        <Row title="Tajweed colours" sub="Colour letters by recitation rule" checked={taj} onChange={setTaj} />
        <button
          type="button"
          className="legend-toggle"
          onClick={() => setLegend((v) => !v)}
          aria-expanded={legend}
        >
          {TAJWEED_LEGEND.slice(0, 3).map((l) => (
            <span key={l.label} className="legend-swatch" style={{ background: l.color }} />
          ))}
          Colour legend
          <Icon name={legend ? "chevron-up" : "chevron-down"} size={16} style={{ color: "var(--text-muted)" }} />
        </button>
        {legend ? (
          <div className="legend-grid">
            {TAJWEED_LEGEND.map((l) => (
              <span key={l.label} className="lg">
                <span className="legend-swatch" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        ) : null}
        <Row
          title="Show translation while playing"
          sub="Verse meaning sits above play while you read. Focus shows it under the Arabic."
          checked={translation}
          onChange={setTranslation}
        />
        <ComingSoonNote />
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
          <Link href="/credits?from=settings">Data & attributions</Link>
          <span aria-hidden="true">·</span>
          <Link href="/privacy?from=settings">Privacy</Link>
          <span aria-hidden="true">·</span>
          <span>v0.1.0</span>
        </div>
      </div>
    </main>
  );
}
