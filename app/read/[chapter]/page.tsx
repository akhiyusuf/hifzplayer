import { PlayerScreen } from "@/components/player";

function num(v: string | string[] | undefined, fallback: number) {
  const s = Array.isArray(v) ? v[0] : v;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function str(v: string | string[] | undefined): string | null {
  const s = Array.isArray(v) ? v[0] : v;
  return s || null;
}

export default async function ReadPage({
  params,
  searchParams,
}: {
  params: Promise<{ chapter: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { chapter: ch } = await params;
  const q = await searchParams;
  const chapter = num(ch, 1);
  const from = num(q.from, 1);
  const to = num(q.to, from);
  const reciter = q.reciter ? num(q.reciter, 0) : null;
  const focusRaw = str(q.focus);
  let focus = null;
  if (focusRaw) {
    const [verse, f, t] = focusRaw.split("-").map(Number);
    if (verse) {
      const start = f && f > 0 ? f : 1;
      focus = { verse, from: start, to: t && t >= start ? t : start };
    }
  }
  return (
    <PlayerScreen
      chapter={chapter}
      from={from}
      to={to}
      reciterParam={reciter && reciter > 0 ? reciter : null}
      focus={focus}
      cameFrom={str(q.back)}
      heldAt={q.held ? Number(q.held) : null}
      matchOf={str(q.match)}
    />
  );
}
