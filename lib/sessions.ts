import { getStore, setStore } from "./storage";
import type { Session } from "./types";

const SESSIONS = "hifz.sessions";
const DAYS = "hifz.days";

const keyOf = (s: { chapter: number; from: number; to: number }) => `${s.chapter}:${s.from}-${s.to}`;

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function listSessions(): Session[] {
  return [...(getStore<Session[]>(SESSIONS) || [])].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function upsertSession(s: Session) {
  const next = listSessions().filter((x) => keyOf(x) !== keyOf(s));
  next.unshift(s);
  setStore(SESSIONS, next.slice(0, 12));
}

export function markToday() {
  const days = getStore<string[]>(DAYS) || [];
  const t = today();
  if (days[0] !== t) setStore(DAYS, [t, ...days.filter((d) => d !== t)].slice(0, 400));
}

export function streakCount(): number {
  const days = getStore<string[]>(DAYS) || [];
  if (!days.length) return 0;
  const set = new Set(days);
  const d = new Date();
  const fmt = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  if (!set.has(fmt(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(fmt(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  const w = Math.floor(d / 7);
  return `${w} week${w === 1 ? "" : "s"} ago`;
}
