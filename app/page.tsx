"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { OfflineBanner } from "@/components/offline-banner";
import { PracticeSheet } from "@/components/practice-sheet";
import { ReciterSheet } from "@/components/reciter-sheet";
import { useAppData } from "@/lib/app-data";
import { greeting, listSessions, streakCount, timeAgo } from "@/lib/sessions";
import type { Session } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const { chapters, status, reload, reciterId, setReciterId, reciterName } = useAppData();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [qariOpen, setQariOpen] = useState(false);
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

  const spanFor = (chapter: number, versesCount: number) => {
    const last = [continueSession, ...pickups].find((s) => s?.chapter === chapter);
    if (last) {
      return { from: last.from, to: last.to, at: String(last.verse) };
    }
    const to = versesCount <= 12 ? versesCount : Math.min(10, versesCount);
    return { from: 1, to };
  };

  const startChapter = (chapter: number, versesCount: number) => {
    const span = spanFor(chapter, versesCount);
    router.push(
      hrefFor(chapter, span.from, span.to, span.at ? { at: span.at } : undefined),
    );
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
            <Icon name="settings" size={18} />
          </Link>
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
                <button className="qari-inline tap" onClick={() => setQariOpen(true)} aria-label="Change reciter">
                  <Icon name="mic" size={14} style={{ color: "var(--text-muted)", flex: "none" }} />
                  <span>{reciterName(reciterId)}</span>
                  <Icon name="chevron-down" size={13} style={{ color: "var(--text-muted)", flex: "none" }} />
                </button>
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
                      <div key={c.id} className={`index-row${on ? " sel" : ""}`}>
                        <button
                          type="button"
                          className="index-play tap"
                          aria-label={`Play ${c.name_simple}`}
                          onClick={() => {
                            setSelectedId(c.id);
                            startChapter(c.id, c.verses_count);
                          }}
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
                            name="play"
                            size={16}
                            style={{
                              color: on ? "var(--action-primary)" : "var(--text-muted)",
                              flex: "none",
                            }}
                          />
                        </button>
                        <button
                          type="button"
                          className="index-setup tap"
                          aria-label={`Set up ${c.name_simple}`}
                          onClick={() => {
                            setSelectedId(c.id);
                            setPracticeOpen(true);
                          }}
                        >
                          <Icon name="settings-2" size={15} />
                          <span>Set up</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
            <div className="link-row">
              <Link href="/roadmap">What&apos;s coming</Link>
              <span aria-hidden="true">·</span>
              <Link href="/credits">Data & attributions</Link>
              <span aria-hidden="true">·</span>
              <Link href="/privacy">Privacy</Link>
            </div>
          </>
        )}
      </div>
      {practiceOpen && selected && (
        <PracticeSheet
          surahName={selected.name_simple}
          versesCount={selected.verses_count}
          initialFrom={spanFor(selected.id, selected.verses_count).from}
          initialTo={spanFor(selected.id, selected.verses_count).to}
          initialMode="verse"
          onStart={(from, to, mode) => {
            setPracticeOpen(false);
            router.push(hrefFor(selected.id, from, to, mode !== "verse" ? { mode } : {}));
          }}
          onClose={() => setPracticeOpen(false)}
        />
      )}
      {qariOpen ? (
        <ReciterSheet
          currentId={reciterId}
          hint="Applies to every passage you open"
          onPick={(id) => setReciterId(id)}
          onClose={() => setQariOpen(false)}
        />
      ) : null}
    </main>
  );
}
