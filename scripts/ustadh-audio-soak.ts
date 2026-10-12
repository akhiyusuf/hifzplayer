/**
 * AI Ustadh audio soak — feeds preloaded reference recitation through the real
 * ASR path and the live-highlight pipeline, so regressions show up without a
 * human reciting.
 *
 *   node --experimental-strip-types scripts/ustadh-audio-soak.ts [options]
 *
 * Options
 *   --verses 1:2,1:7        fixture verse keys (default: a small Fatiha/Ikhlas set)
 *   --variants ayah,wbw,skip,stop   audio builds (default: ayah,skip)
 *       ayah  Mishary Alafasy ayah mp3 (continuous recitation, word segments from quran.com)
 *       wbw   Quran.com word-by-word clips joined with short gaps
 *       skip  ayah audio with one middle word cut out → expect that word underlined
 *       stop  ayah audio cut after ~half the words → expect the next word underlined
 *   --peek-ms 1500          rolling peek cadence (matches USTADH_PEEK.intervalMs)
 *   --endpoint URL          POST to a deployed Worker (https://host) instead of calling
 *                           Groq in-process (in-process needs GROQ_API_KEY)
 *   --record                write lib/ustadh/fixtures/asr-recorded.json for the offline
 *                           replay test (lib/ustadh/asr-recorded.test.ts)
 *   --pace-ms 3000          pause between ASR calls (Groq rate limits; 429s back off too)
 *   --verbose               print every peek transcript
 *
 * Needs ffmpeg + network (api.quran.com, verses.quran.com, Groq or the Worker).
 * Exit code 1 when any highlight invariant fails.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fixtureDir, fixtureVerse } from "../lib/ustadh/fixtures/load.ts";
import { handleAsrRequest } from "../lib/ustadh/request.ts";
import { checkTakeInvariants, runTakePipeline, type PeekSample, type SoakTake } from "../lib/ustadh/soak.ts";
import { coachPayloadForVerse, primaryReplay, turnOutcome } from "../lib/ustadh/coach.ts";
import { USTADH_PEEK } from "../lib/ustadh/highlight.ts";
import type { AsrWord, UstadhAsrResponse } from "../lib/ustadh/types.ts";

const AUDIO_BASE = "https://verses.quran.com/";
const API = "https://api.quran.com/api/v4";
const RECITER = 7; // Mishary Rashid Alafasy
const LEAD_MS = 400;
const RATE = 16_000;

type Args = {
  verses: string[];
  variants: string[];
  peekMs: number;
  endpoint: string | null;
  record: boolean;
  verbose: boolean;
  /** Pause between ASR calls (Groq rate limits ~20 req/min on small plans). */
  paceMs: number;
};

function parseArgs(argv: string[]): Args {
  const get = (name: string) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    verses: (get("verses") || "1:2,1:4,1:7,112:1,112:4").split(",").filter(Boolean),
    variants: (get("variants") || "ayah,skip").split(",").filter(Boolean),
    peekMs: Number(get("peek-ms") || USTADH_PEEK.intervalMs),
    endpoint: get("endpoint") || null,
    record: argv.includes("--record"),
    verbose: argv.includes("--verbose"),
    paceMs: Number(get("pace-ms") || 3_000),
  };
}

const cacheDir = join(process.cwd(), "node_modules", ".cache", "ustadh-soak");
mkdirSync(cacheDir, { recursive: true });

async function download(url: string): Promise<string> {
  const name = url.replace(/[^A-Za-z0-9._-]/g, "_");
  const path = join(cacheDir, name);
  if (existsSync(path)) return path;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  return path;
}

function ffmpeg(args: string[]) {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "ignore", "inherit"] });
}

/** Decode to raw 16 kHz mono s16le samples. */
function decode(path: string): Int16Array {
  const out = join(cacheDir, `${Math.random().toString(36).slice(2)}.raw`);
  ffmpeg(["-i", path, "-ac", "1", "-ar", String(RATE), "-f", "s16le", out]);
  const buf = readFileSync(out);
  return new Int16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2);
}

function silence(ms: number) {
  return new Int16Array(Math.round((ms / 1000) * RATE));
}

function concat(parts: Int16Array[]): Int16Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Int16Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

const msOf = (samples: number) => Math.round((samples / RATE) * 1000);
const samplesOf = (ms: number) => Math.round((ms / 1000) * RATE);

/** Encode a sample prefix like the browser recorder would (webm/opus). */
function encodePrefix(samples: Int16Array, untilMs: number, tag: string): Blob {
  const raw = join(cacheDir, `${tag}.raw`);
  const webm = join(cacheDir, `${tag}.webm`);
  const slice = samples.subarray(0, Math.min(samples.length, samplesOf(untilMs)));
  writeFileSync(raw, Buffer.from(slice.buffer, slice.byteOffset, slice.byteLength));
  ffmpeg(["-f", "s16le", "-ar", String(RATE), "-ac", "1", "-i", raw, "-c:a", "libopus", "-b:a", "32k", webm]);
  return new Blob([readFileSync(webm)], { type: "audio/webm" });
}

type Built = { samples: Int16Array; spokenStartMs: (number | null)[]; expect: SoakTake["expect"]; label: string };

async function buildAudio(key: string, variant: string): Promise<Built | null> {
  const verse = fixtureVerse(key);
  const n = verse.words.length;
  if (variant === "wbw") {
    const parts: Int16Array[] = [silence(LEAD_MS)];
    const starts: number[] = [];
    let at = samplesOf(LEAD_MS);
    for (const word of verse.words) {
      let file: string;
      try {
        file = await download(AUDIO_BASE + word.audio);
      } catch {
        return null; // some wbw clips (e.g. a few waqf-split words) are missing upstream
      }
      const clip = decode(file);
      starts.push(msOf(at));
      parts.push(clip, silence(120));
      at += clip.length + samplesOf(120);
    }
    parts.push(silence(600));
    return { samples: concat(parts), spokenStartMs: starts, expect: { complete: true, missIndexes: [] }, label: `${key} wbw` };
  }

  const meta = (await (await fetch(`${API}/verses/by_key/${key}?audio=${RECITER}`)).json()) as {
    verse: { audio?: { url: string; segments: number[][] } };
  };
  const audio = meta.verse.audio;
  if (!audio?.url) return null;
  const ayah = decode(await download(AUDIO_BASE + audio.url));
  // segments: [index, wordPos, startMs, endMs]
  const seg = new Map<number, { start: number; end: number }>();
  for (const row of audio.segments || []) {
    const [, pos, start, end] = row;
    if (pos && !seg.has(pos)) seg.set(pos, { start: start!, end: end! });
  }
  if (seg.size < n) return null;

  if (variant === "ayah") {
    const starts = verse.words.map((w) => LEAD_MS + seg.get(w.pos)!.start);
    return {
      samples: concat([silence(LEAD_MS), ayah, silence(600)]),
      spokenStartMs: starts,
      expect: { complete: true, missIndexes: [] },
      label: `${key} ayah`,
    };
  }
  if (variant === "skip") {
    if (n < 3) return null;
    const k = Math.floor(n / 2);
    const cut = seg.get(verse.words[k]!.pos)!;
    const next = seg.get(verse.words[k + 1]!.pos)!;
    const head = ayah.subarray(0, samplesOf(cut.start));
    const tail = ayah.subarray(samplesOf(next.start));
    const removed = next.start - cut.start;
    const starts = verse.words.map((w, i) => {
      if (i === k) return null;
      const s = seg.get(w.pos)!.start;
      return LEAD_MS + (i < k ? s : s - removed);
    });
    return {
      samples: concat([silence(LEAD_MS), head, tail, silence(600)]),
      spokenStartMs: starts,
      // The cut can leave a connecting و on the next word (ونستعين), which is then a
      // second, genuine miss — so only require the skipped word to be underlined.
      expect: { missIndexes: [k] },
      label: `${key} skip word ${k + 1}`,
    };
  }
  if (variant === "stop") {
    if (n < 3) return null;
    const keep = Math.ceil(n / 2);
    // Cut before the next word's onset (connected recitation runs words together).
    const lastKept = seg.get(verse.words[keep - 1]!.pos)!;
    const nextStart = seg.get(verse.words[keep]!.pos)!.start;
    const cutMs = Math.max(lastKept.start + 200, Math.min(lastKept.end, nextStart) - 120);
    const starts = verse.words.map((w, i) => (i < keep ? LEAD_MS + seg.get(w.pos)!.start : null));
    return {
      samples: concat([silence(LEAD_MS), ayah.subarray(0, samplesOf(cutMs)), silence(600)]),
      spokenStartMs: starts,
      // Connected recitation bleeds the next word's onset into the cut, so accept an
      // underline on the last kept word or the first dropped one.
      expect: { complete: false, missIndexes: [], firstMissMax: keep },
      label: `${key} stop after ${keep}`,
    };
  }
  return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function asr(
  args: Args,
  key: string,
  blob: Blob,
  mode: "peek" | "final",
  clipSec: number,
): Promise<UstadhAsrResponse> {
  const payload = coachPayloadForVerse(fixtureVerse(key));
  const form = new FormData();
  form.set("audio", blob, "chunk.webm");
  form.set("expectedText", payload.expectedText);
  form.set("expectedWords", JSON.stringify(payload.expectedWords));
  form.set("marks", JSON.stringify(payload.marks));
  form.set("phrases", JSON.stringify(payload.phrases));
  if (payload.surah) form.set("surah", String(payload.surah));
  if (payload.ayahStart) form.set("ayahStart", String(payload.ayahStart));
  if (payload.ayahEnd) form.set("ayahEnd", String(payload.ayahEnd));
  form.set("verseKey", payload.verseKey);
  form.set("sessionId", "soak");
  form.set("chunkStart", "0");
  if (mode === "peek") form.set("mode", "peek");
  form.set("clipSec", clipSec.toFixed(2));
  for (let attempt = 0; attempt < 5; attempt++) {
    let status: number;
    let body: unknown;
    if (args.endpoint) {
      const res = await fetch(`${args.endpoint.replace(/\/$/, "")}/api/ustadh/asr`, { method: "POST", body: form });
      status = res.status;
      body = await res.json().catch(() => null);
    } else {
      const req = new Request("http://soak.local/api/ustadh/asr", { method: "POST", body: form });
      const out = await handleAsrRequest(req);
      status = out.status;
      body = out.body;
    }
    if (status === 200) return body as UstadhAsrResponse;
    if (status === 429 || status >= 500) {
      await sleep(10_000 * (attempt + 1));
      continue;
    }
    throw new Error(`ASR ${status}: ${JSON.stringify(body)}`);
  }
  throw new Error("ASR kept failing (rate limited?)");
}

type Recorded = {
  label: string;
  verseKey: string;
  finalClipSec: number;
  spokenStartMs: (number | null)[];
  expect: SoakTake["expect"];
  peeks: PeekSample[];
  final: AsrWord[];
  finalText: string;
  finalReplays: UstadhAsrResponse["replays"];
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.endpoint && !(process.env.GROQ_API_KEY || "").trim()) {
    console.error("Set GROQ_API_KEY (in-process) or pass --endpoint https://your-worker");
    process.exit(2);
  }
  const recorded: Recorded[] = [];
  let failures = 0;
  let takes = 0;
  for (const key of args.verses) {
    for (const variant of args.variants) {
      const built = await buildAudio(key, variant);
      if (!built) continue;
      const words = coachPayloadForVerse(fixtureVerse(key)).words;
      const totalMs = msOf(built.samples.length);
      const firstVoice = built.spokenStartMs.find((s) => s != null) ?? LEAD_MS;
      const peeks: PeekSample[] = [];
      for (let at = args.peekMs; at < totalMs - 300; at += args.peekMs) {
        if (at <= firstVoice) continue;
        const blob = encodePrefix(built.samples, at, `peek-${key.replace(":", "_")}-${variant}-${at}`);
        const res = await asr(args, key, blob, "peek", at / 1000);
        await sleep(args.paceMs);
        peeks.push({ atMs: at, voicedMs: at - firstVoice, clipSec: at / 1000, heard: res.words || [] });
        if (args.verbose) console.log(`  peek ${at}ms: ${res.text}`);
      }
      const finalBlob = encodePrefix(built.samples, totalMs, `final-${key.replace(":", "_")}-${variant}`);
      const finalRes = await asr(args, key, finalBlob, "final", totalMs / 1000);
      await sleep(args.paceMs);
      const take: SoakTake = {
        label: built.label,
        words,
        spokenStartMs: built.spokenStartMs,
        peeks,
        final: finalRes.words || [],
        finalClipSec: totalMs / 1000,
        expect: built.expect,
      };
      const run = runTakePipeline(take);
      const issues = checkTakeInvariants(take, run);
      takes += 1;
      failures += issues.length;
      const reaches = run.frames.filter((f) => f.kind !== "step").map((f) => f.painted.reach);
      const replay = primaryReplay(finalRes);
      console.log(
        `${issues.length ? "FAIL" : "ok  "} ${built.label} — heard "${finalRes.text}" — verdict ${turnOutcome(finalRes)}` +
          `${replay ? ` (replay ${replay.action} pos ${replay.pos ?? "?"})` : ""} — peek reach ${reaches.join("→")}` +
          ` — underline ${run.final?.missPositions.join(",") || "none"}`,
      );
      for (const issue of issues) console.log(`     · ${issue}`);
      recorded.push({
        label: built.label,
        verseKey: key,
        finalClipSec: totalMs / 1000,
        spokenStartMs: built.spokenStartMs,
        expect: built.expect,
        peeks,
        final: finalRes.words || [],
        finalText: finalRes.text,
        finalReplays: finalRes.replays,
      });
    }
  }
  if (args.record) {
    const path = join(fixtureDir(), "asr-recorded.json");
    writeFileSync(path, `${JSON.stringify({ recordedAt: new Date().toISOString(), takes: recorded }, null, 1)}\n`);
    console.log(`recorded ${recorded.length} takes → ${path}`);
  }
  console.log(`\n${takes} takes, ${failures} invariant failures`);
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
