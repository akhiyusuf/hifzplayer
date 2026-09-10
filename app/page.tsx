"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { OfflineBanner } from "@/components/offline-banner";
import { PracticeSheet } from "@/components/practice-sheet";
import { Sheet } from "@/components/sheet";
import { useAppData } from "@/lib/app-data";
import { KEYS } from "@/lib/constants";
import { greeting, listSessions, streakCount, timeAgo } from "@/lib/sessions";
import { getStore, setStore } from "@/lib/storage";
import { useTheme } from "@/lib/theme";
import type { Session } from "@/lib/types";

function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      className="icon-btn tap"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      style={dark ? { color: "var(--action-primary)" } : undefined}
    >
      <Icon name={dark ? "sun" : "moon"} size={19} />
    </button>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { chapters, recitations, status, reload, reciterId, setReciterId, reciterName } = useAppData();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [qariOpen, setQariOpen] = useState(false);
  const [taj, setTaj] = useState(false);
  const [continueSession, setContinueSession] = useState<Session | null>(null);
  const [pickups, setPickups] = useState<Session[]>([]);
  const [streak, setStreak] = useState(0);
  const [greet, setGreet] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sessions = listSessions();
    setContinueSession(sessions[0] ?? null);
    setPickups(sessions.slice(1, 3));
    setStreak(streakCount());
    setGreet(greeting());
    setTaj(!!getStore(KEYS.taj));
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chapters;
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const nq = norm(q);
    return chapters.filter(
      (c) =>
        String(c.id) === q ||
        norm(c.name_simple).includes(nq) ||
        norm(c.translated_name?.name || "").includes(nq) ||
        c.name_arabic.includes(q),
    );
  }, [chapters, query]);

  const selected = chapters.find((c) => c.id === selectedId) || null;

  const hrefFor = (chapter: number, from: number, to: number, extra?: Record<string, string>) => {
    const n = new URLSearchParams({ from: String(from), to: String(to) });
    if (reciterId != null) n.set("reciter", String(reciterId));
    for (const [k, v] of Object.entries(extra || {})) n.set(k, v);
    return `/read/${chapter}?${n.toString()}`;
  };

  const span = continueSession ? continueSession.to - continueSession.from + 1 : 0;
  const at = continueSession ? continueSession.verse - continueSession.from + 1 : 0;

  return (
    <main className="shell" id="main">
      <div className="read-head">
        <div className="rh-left">
          <span className="label-eyebrow" style={{ letterSpacing: "0.12em" }}>
            {greet || "\u00a0"}
          </span>
          <h1>Read</h1>
        </div>
        <div className="rh-actions">
          <button
            className="icon-btn tap"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search surahs"
            aria-expanded={searchOpen}
          >
            <Icon name="search" size={18} />
          </button>
          <Link className="icon-btn tap" href="/settings" aria-label="Settings">
            <Icon name="settings-2" size={18} />
          </Link>
          <ThemeToggle />
        </div>
      </div>
      <OfflineBanner />
      {searchOpen && (
        <div className="picker-search">
          <div className="field">
            <Icon name="search" size={18} style={{ color: "var(--text-muted)", flex: "none" }} />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search surah, name or number"
              aria-label="Search surahs by name or number"
              autoComplete="off"
            />
            {query && (
              <button className="tap" onClick={() => setQuery("")} aria-label="Clear search">
                <Icon name="x" size={16} style={{ color: "var(--text-muted)" }} />
              </button>
            )}
          </div>
        </div>
      )}
      <div className="picker-body" style={{ paddingTop: 0 }}>
        {status === "loading" && (
          <div className="picker-section" aria-hidden="true">
            <div className="index-card">
              {Array.from({ length: 8 }, (_, i) => (
                <div className="index-row" key={i}>
                  <span className="skel" style={{ width: 24, height: 14 }} />
                  <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <span className="skel" style={{ width: "40%", height: 13 }} />
                    <span className="skel" style={{ width: "60%", height: 10 }} />
                  </span>
                  <span className="skel" style={{ width: 40, height: 18 }} />
                </div>
              ))}
            </div>
          </div>
        )}
        {status === "error" && (
          <div className="status-block">
            <div className="status-medallion">
              <Icon name="cloud-off" size={34} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h2>Can’t reach the library</h2>
              <p>The surah list couldn’t be loaded. Check your connection and try again.</p>
            </div>
            <div className="status-actions">
              <button className="btn-primary" onClick={reload}>
                <Icon name="rotate-cw" size={17} />
                Try again
              </button>
            </div>
          </div>
        )}
        {status === "ready" && (
          <>
            {continueSession && !query && (
              <section className="hero-card">
                {streak >= 2 && (
                  <span className="streak-pill" title={`${streak} days in a row`}>
                    <Icon name="flame" size={13} />
                    <span className="num">{streak}</span>
                  </span>
                )}
                <div className="hc-head">
                  <span className="label-eyebrow" style={{ color: "var(--action-primary)" }}>
                    Continue
                  </span>
                  <span className="hc-title">
                    <h2>{continueSession.name}</h2>
                    <span className="ar">
                      {chapters.find((c) => c.id === continueSession.chapter)?.name_arabic ?? ""}
                    </span>
                  </span>
                  <span className="hc-sub">
                    Verses {continueSession.from}–{continueSession.to} · {continueSession.reciterName}
                  </span>
                </div>
                <div className="hc-progress">
                  <div className="hc-track">
                    <i style={{ width: `${Math.min(100, Math.round((at / span) * 100))}%` }} />
                  </div>
                  <div className="hc-meta">
                    <span>
                      {at} of {span} verses
                    </span>
                    <span>{timeAgo(continueSession.updatedAt)}</span>
                  </div>
                </div>
                <Link
                  className="btn-primary"
                  style={{ padding: 13 }}
                  href={hrefFor(continueSession.chapter, continueSession.from, continueSession.to, {
                    at: String(continueSession.verse),
                    reciter: String(continueSession.reciterId || reciterId || ""),
                  })}
                >
                  <Icon name="play" size={18} />
                  Resume at verse {continueSession.verse}
                </Link>
              </section>
            )}
            {pickups.length > 0 && !query && (
              <section className="picker-section">
                <span className="label-eyebrow">Pick up again</span>
                <div className="chip-row">
                  {pickups.map((s) => (
                    <Link
                      key={`${s.chapter}-${s.from}-${s.to}`}
                      className="recent-chip"
                      href={hrefFor(s.chapter, s.from, s.to, {
                        at: String(s.verse),
                        reciter: String(s.reciterId || reciterId || ""),
                      })}
                    >
                      <span className="rc-tile">
                        <Icon name="rotate-ccw" size={14} />
                      </span>
                      <span className="rc-text">
                        <b>
                          {s.name} {s.from}–{s.to}
                        </b>
                        <span>{s.reciterName}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            <section className="picker-section">
              <div className="index-head">
                <span className="label-eyebrow">Surahs</span>
                <span className="num" style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                  {filtered.length}
                </span>
              </div>
              {filtered.length === 0 ? (
                <div className="status-block" style={{ padding: "32px 8px" }}>
                  <div className="status-medallion">
                    <Icon name="search" size={30} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <h2>No surah matches</h2>
                    <p>
                      Nothing found for “{query}”. Try a different name or number.
                    </p>
                  </div>
                  <div className="status-actions">
                    <button className="btn-secondary" onClick={() => setQuery("")}>
                      Clear search
                    </button>
                  </div>
                </div>
              ) : (
                <div className="index-card">
                  {filtered.map((c) => {
                    const on = selectedId === c.id;
                    return (
                      <button
                        key={c.id}
                        className={`index-row${on ? " sel" : ""}`}
                        onClick={() => {
                          setSelectedId(c.id);
                          setPracticeOpen(true);
                        }}
                        aria-pressed={on}
                      >
                        <span className="in">{c.id}</span>
                        <span className="itext">
                          <b>{c.name_simple}</b>
                          <span>
                            {c.translated_name?.name} · {c.verses_count} verses
                          </span>
                        </span>
                        <span className="iar">{c.name_arabic}</span>
                        <Icon
                          name="chevron-left"
                          size={16}
                          style={{
                            color: on ? "var(--action-primary)" : "var(--text-muted)",
                            flex: "none",
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
            <div className="link-row">
              <Link href="/credits">Data & attributions</Link>
              <span aria-hidden="true">·</span>
              <Link href="/privacy">Privacy</Link>
            </div>
          </>
        )}
      </div>
      {status === "ready" && (
        <div className="picker-foot" style={{ flexDirection: "row", gap: 10 }}>
          <button className="qari-compact tap" onClick={() => setQariOpen(true)} aria-label="Change reciter">
            <Icon name="mic" size={15} style={{ color: "var(--text-muted)", flex: "none" }} />
            <span>{reciterName(reciterId).split(" ").slice(-1)[0]}</span>
            <Icon name="chevron-down" size={14} style={{ color: "var(--text-muted)", flex: "none" }} />
          </button>
          <button
            className="btn-primary"
            style={{ flex: 1, width: "auto" }}
            disabled={!selected}
            onClick={() => selected && setPracticeOpen(true)}
          >
            <Icon name="sliders-horizontal" size={18} />
            {selected ? `Set up ${selected.name_simple}` : "Choose a surah"}
          </button>
        </div>
      )}
      {practiceOpen && selected && (
        <PracticeSheet
          surahName={selected.name_simple}
          versesCount={selected.verses_count}
          initialFrom={1}
          initialTo={Math.min(12, selected.verses_count)}
          initialMode="verse"
          taj={taj}
          onTaj={(v) => {
            setTaj(v);
            setStore(KEYS.taj, v);
          }}
          onStart={(from, to, mode) => {
            setPracticeOpen(false);
            router.push(hrefFor(selected.id, from, to, mode !== "verse" ? { mode } : {}));
          }}
          onClose={() => setPracticeOpen(false)}
        />
      )}
      {qariOpen && (
        <Sheet title="Reciter" onClose={() => setQariOpen(false)} maxHeight="80dvh">
          <div className="info-line">
            <Icon name="info" size={13} />
            Applies to every passage you open
          </div>
          <div className="sheet-list" style={{ gap: 2 }}>
            {recitations.map((r) => (
              <button
                key={r.id}
                className={`qari-row${r.id === reciterId ? " on" : ""}`}
                onClick={() => {
                  setReciterId(r.id);
                  setQariOpen(false);
                }}
                aria-current={r.id === reciterId}
              >
                <span className="qari-avatar">
                  <Icon name="mic" size={17} />
                </span>
                <span className="qari-text">
                  <b>{r.name}</b>
                  {r.style && <span>{r.style}</span>}
                </span>
                {r.id === reciterId && <Icon name="check" size={19} style={{ color: "var(--action-primary)" }} />}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </main>
  );
}
