import { resolveWordAudioUrl } from "../audio-url.ts";
import type { Verse } from "../types.ts";
import type { ExpectedPhrase, ExpectedWord, ReplayDecision } from "./types.ts";

const SLOW_RATE = 0.75;
const GAP_MS = 120;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function playUrl(url: string, rate: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const audio = new Audio(url);
    audio.playbackRate = rate;
    const onAbort = () => {
      try {
        audio.pause();
        audio.src = "";
      } catch {
        /* ignore */
      }
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    audio.onended = () => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    audio.onerror = () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new Error("audio error"));
    };
    audio.play().catch((err) => {
      signal?.removeEventListener("abort", onAbort);
      reject(err);
    });
  });
}

function wordsForPhrase(
  words: ExpectedWord[],
  phrases: ExpectedPhrase[],
  phraseId: string,
): ExpectedWord[] {
  const phrase = phrases.find((row) => row.id === phraseId);
  if (!phrase) return [];
  return phrase.wordIndexes.map((index) => words[index]).filter(Boolean);
}

function resolveClip(word: ExpectedWord | { audio?: string | null; verseKey?: string; pos?: number }) {
  if (word.audio) return resolveWordAudioUrl(word.audio);
  if ("targetId" in word && typeof (word as ExpectedWord).targetId === "string") {
    return resolveWordAudioUrl((word as ExpectedWord).targetId);
  }
  return null;
}

/** Words a replay decision will play, in order (phrase → every member; word → one). */
export function replayWordIndexes(input: {
  decision: ReplayDecision;
  words: ExpectedWord[];
  phrases: ExpectedPhrase[];
}): number[] {
  const { decision, words, phrases } = input;
  if (decision.action === "replay_phrase") {
    const phraseId = decision.phraseId || decision.targetId;
    return wordsForPhrase(words, phrases, phraseId).map((word) => word.index);
  }
  if (decision.wordIndex != null && words[decision.wordIndex]) return [decision.wordIndex];
  const word = words.find((row) => row.targetId === decision.targetId || row.audio === decision.targetId);
  return word ? [word.index] : [];
}

/**
 * Play the interrupt’s replay using existing wbw URLs.
 * Phrase → sequential word clips. slow_word → same clip at 0.75×.
 * `onWord(index)` fires just before each clip so the Mushaf can follow Ustadh.
 */
export async function playUstadhReplay(input: {
  decision: ReplayDecision;
  words: ExpectedWord[];
  phrases: ExpectedPhrase[];
  verses: Verse[];
  signal?: AbortSignal;
  onWord?: (index: number) => void;
}): Promise<void> {
  const { decision, words, phrases, signal, onWord } = input;
  const rate = decision.action === "slow_word" ? SLOW_RATE : 1;

  if (decision.action === "replay_phrase") {
    const phraseId = decision.phraseId || decision.targetId;
    const members = wordsForPhrase(words, phrases, phraseId);
    for (const word of members) {
      if (signal?.aborted) return;
      const url = resolveClip(word);
      if (!url) continue;
      onWord?.(word.index);
      try {
        await playUrl(url, 1, signal);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
      await sleep(GAP_MS);
    }
    return;
  }

  const word =
    decision.wordIndex != null
      ? words[decision.wordIndex]
      : words.find((row) => row.targetId === decision.targetId || row.audio === decision.targetId);
  const url =
    (word && resolveClip(word)) ||
    resolveWordAudioUrl(decision.targetId) ||
    null;
  if (!url) return;
  if (word) onWord?.(word.index);
  try {
    await playUrl(url, rate, signal);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return;
  }
}
