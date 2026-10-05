import { arabicEqual, normalizeArabic } from "./arabic.ts";
import type { AsrWord, ExpectedPhrase, ExpectedWord, InterruptHint } from "./types.ts";

export type AlignOp =
  | { kind: "match"; expectedIndex: number; heardIndex: number }
  | { kind: "sub"; expectedIndex: number; heardIndex: number }
  | { kind: "del"; expectedIndex: number }
  | { kind: "ins"; heardIndex: number };

type Step = "match" | "sub" | "del" | "ins";

/** Monotonic alignment. Equal cost prefers a match over a skip. */
export function alignWords(expected: string[], heard: string[]): AlignOp[] {
  const n = expected.length;
  const m = heard.length;
  const normE = expected.map((word) => normalizeArabic(word));
  const normH = heard.map((word) => normalizeArabic(word));
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  const prev: Step[][] = Array.from({ length: n + 1 }, () => Array<Step>(m + 1).fill("match"));

  for (let i = 1; i <= n; i++) {
    dp[i][0] = i;
    prev[i][0] = "del";
  }
  for (let j = 1; j <= m; j++) {
    dp[0][j] = j;
    prev[0][j] = "ins";
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const same = normE[i - 1].length > 0 && normE[i - 1] === normH[j - 1];
      const diag = dp[i - 1][j - 1] + (same ? 0 : 1);
      const del = dp[i - 1][j] + 1;
      const ins = dp[i][j - 1] + 1;
      let best = diag;
      let step: Step = same ? "match" : "sub";
      if (del < best) {
        best = del;
        step = "del";
      }
      if (ins < best) {
        best = ins;
        step = "ins";
      }
      dp[i][j] = best;
      prev[i][j] = step;
    }
  }

  const ops: AlignOp[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const step = i > 0 && j > 0 ? prev[i][j] : i > 0 ? "del" : "ins";
    if ((step === "match" || step === "sub") && i > 0 && j > 0) {
      ops.push({ kind: step, expectedIndex: i - 1, heardIndex: j - 1 });
      i -= 1;
      j -= 1;
    } else if (step === "del" && i > 0) {
      ops.push({ kind: "del", expectedIndex: i - 1 });
      i -= 1;
    } else if (j > 0) {
      ops.push({ kind: "ins", heardIndex: j - 1 });
      j -= 1;
    } else if (i > 0) {
      ops.push({ kind: "del", expectedIndex: i - 1 });
      i -= 1;
    } else {
      break;
    }
  }
  ops.reverse();
  return ops;
}

export function flaggedExpectedIndexes(ops: AlignOp[]): number[] {
  const out: number[] = [];
  for (const op of ops) {
    if (op.kind === "sub" || op.kind === "del") out.push(op.expectedIndex);
  }
  return out;
}

export function heardForExpected(ops: AlignOp[], expectedIndex: number): number | undefined {
  for (const op of ops) {
    if ((op.kind === "match" || op.kind === "sub") && op.expectedIndex === expectedIndex) {
      return op.heardIndex;
    }
  }
  return undefined;
}

/** Heard tokens aligned to these expected indexes, including insertions after them. */
export function heardIndexesCovering(ops: AlignOp[], expectedIndexes: Set<number>): number[] {
  if (!expectedIndexes.size) return [];
  let first: number | null = null;
  for (const index of expectedIndexes) {
    if (first == null || index < first) first = index;
  }
  const out: number[] = [];
  let lastExpected: number | null = null;
  for (const op of ops) {
    if (op.kind === "match" || op.kind === "sub") {
      lastExpected = op.expectedIndex;
      if (expectedIndexes.has(op.expectedIndex)) out.push(op.heardIndex);
    } else if (op.kind === "del") {
      lastExpected = op.expectedIndex;
    } else if (op.kind === "ins") {
      const anchor = lastExpected ?? first;
      if (anchor != null && expectedIndexes.has(anchor)) out.push(op.heardIndex);
    }
  }
  return out;
}

export function spanOf(heard: AsrWord[], indexes: number[]): { start?: number; end?: number } {
  let start: number | undefined;
  let end: number | undefined;
  for (const index of indexes) {
    const word = heard[index];
    if (!word) continue;
    if (start == null || word.start < start) start = word.start;
    if (end == null || word.end > end) end = word.end;
  }
  return { start, end };
}

export function joinHeard(heard: AsrWord[], indexes: number[]): string {
  return indexes
    .map((index) => heard[index]?.word || "")
    .filter(Boolean)
    .join(" ");
}

export function joinExpected(words: ExpectedWord[], indexes: number[]): string {
  return indexes
    .map((index) => words[index]?.ar || "")
    .filter(Boolean)
    .join(" ");
}

function phraseById(phrases: ExpectedPhrase[], id: string) {
  return phrases.find((phrase) => phrase.id === id) || null;
}

/**
 * Ladder for each miss: the whole ayah, else its waqf phrase, else the word.
 * Hints are ordered by the earliest flagged word. Play `interrupts[0]` and stop listening.
 */
export function interruptHints(input: {
  words: ExpectedWord[];
  phrases: ExpectedPhrase[];
  heard: AsrWord[];
  ops: AlignOp[];
}): InterruptHint[] {
  const flagged = new Set(flaggedExpectedIndexes(input.ops));
  if (!flagged.size || !input.words.length) return [];

  const byVerse = new Map<string, number[]>();
  for (const word of input.words) {
    const bucket = byVerse.get(word.verseKey) || [];
    bucket.push(word.index);
    byVerse.set(word.verseKey, bucket);
  }

  const ayahFailed = new Set<string>();
  for (const [verseKey, indexes] of byVerse) {
    const missed = indexes.filter((index) => flagged.has(index));
    if (!missed.length) continue;
    if (missed.length === indexes.length) {
      ayahFailed.add(verseKey);
      continue;
    }
    const phrasesInVerse = input.phrases.filter((phrase) => phrase.verseKey === verseKey);
    const phrasesHit = phrasesInVerse.filter((phrase) =>
      phrase.wordIndexes.some((index) => flagged.has(index)),
    );
    if (
      phrasesInVerse.length >= 2 &&
      phrasesHit.length === phrasesInVerse.length &&
      missed.length / indexes.length >= 0.5
    ) {
      ayahFailed.add(verseKey);
    }
  }

  const hints: InterruptHint[] = [];

  for (const [verseKey, indexes] of byVerse) {
    if (!ayahFailed.has(verseKey)) continue;
    const covered = heardIndexesCovering(input.ops, new Set(indexes));
    const span = spanOf(input.heard, covered);
    const heardText = joinHeard(input.heard, covered);
    hints.push({
      type: "ayah",
      expected: joinExpected(input.words, indexes),
      ...(heardText ? { heard: heardText } : {}),
      ...span,
      verseKey,
      wordIndex: indexes.find((index) => flagged.has(index)),
    });
  }

  for (const phrase of input.phrases) {
    if (ayahFailed.has(phrase.verseKey)) continue;
    const missed = phrase.wordIndexes.filter((index) => flagged.has(index));
    if (missed.length < 2) continue;
    const covered = heardIndexesCovering(input.ops, new Set(phrase.wordIndexes));
    const span = spanOf(input.heard, covered);
    const heardText = joinHeard(input.heard, covered);
    hints.push({
      type: "phrase",
      expected: joinExpected(input.words, phrase.wordIndexes),
      ...(heardText ? { heard: heardText } : {}),
      ...span,
      verseKey: phrase.verseKey,
      phraseId: phrase.id,
      wordIndex: missed[0],
    });
  }

  for (const phrase of input.phrases) {
    if (ayahFailed.has(phrase.verseKey)) continue;
    const missed = phrase.wordIndexes.filter((index) => flagged.has(index));
    if (missed.length >= 2) continue;
    for (const index of missed) {
      const word = input.words[index];
      if (!word) continue;
      const heardIndex = heardForExpected(input.ops, index);
      const heardWord = heardIndex == null ? undefined : input.heard[heardIndex];
      const same = heardWord ? arabicEqual(word.ar, heardWord.word) : false;
      if (same) continue;
      hints.push({
        type: "word",
        expected: word.ar,
        ...(heardWord ? { heard: heardWord.word, start: heardWord.start, end: heardWord.end } : {}),
        verseKey: word.verseKey,
        phraseId: phraseById(input.phrases, word.phraseId)?.id || word.phraseId,
        wordIndex: index,
      });
    }
  }

  hints.sort((a, b) => (a.wordIndex ?? 0) - (b.wordIndex ?? 0));

  return hints;
}
