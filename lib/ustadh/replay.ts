import {
  flaggedExpectedIndexes,
  heardForExpected,
  heardIndexesCovering,
  spanOf,
  type AlignOp,
} from "./interrupt.ts";
import type { AsrWord, ExpectedPhrase, ExpectedWord, ReplayDecision } from "./types.ts";

/** The second miss of the same word unit asks the client to slow that clip. */
export const USTADH_SLOW_AFTER = 2;

function missCountFor(targetId: string, prior: Record<string, number> | undefined) {
  const raw = prior?.[targetId];
  const previous = typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
  return Math.min(99, previous + 1);
}

/**
 * One decision per flagged word.
 * A repeated miss on that word becomes `slow_word`.
 * Two or more mismatches inside one phrase become `replay_phrase` for the
 * whole phrase (the waqf span, not a mid-phrase cut).
 * A single first miss becomes `replay_word`.
 */
export function replayDecisions(input: {
  words: ExpectedWord[];
  phrases: ExpectedPhrase[];
  heard: AsrWord[];
  ops: AlignOp[];
  missCounts?: Record<string, number>;
}): ReplayDecision[] {
  const flagged = new Set(flaggedExpectedIndexes(input.ops));
  if (!flagged.size) return [];

  const phraseById = new Map(input.phrases.map((phrase) => [phrase.id, phrase]));
  const cluster = new Set<number>();
  for (const phrase of input.phrases) {
    const missed = phrase.wordIndexes.filter((index) => flagged.has(index));
    if (missed.length >= 2) for (const index of missed) cluster.add(index);
  }

  const decisions: ReplayDecision[] = [];
  for (const word of input.words) {
    if (!flagged.has(word.index)) continue;
    const missCount = missCountFor(word.targetId, input.missCounts);
    const phrase = phraseById.get(word.phraseId);
    const heardIndex = heardForExpected(input.ops, word.index);
    const heardWord = heardIndex == null ? undefined : input.heard[heardIndex];

    let action: ReplayDecision["action"] = "replay_word";
    let targetId = word.targetId;
    let start = heardWord?.start;
    let end = heardWord?.end;

    if (missCount >= USTADH_SLOW_AFTER) {
      action = "slow_word";
    } else if (cluster.has(word.index) && phrase) {
      action = "replay_phrase";
      targetId = phrase.id;
      const covered = heardIndexesCovering(input.ops, new Set(phrase.wordIndexes));
      const span = spanOf(input.heard, covered);
      start = span.start;
      end = span.end;
    }

    decisions.push({
      action,
      targetId,
      wordIndex: word.index,
      phraseId: word.phraseId,
      ...(start != null ? { start } : {}),
      ...(end != null ? { end } : {}),
      missCount,
      pos: word.pos,
      verseKey: word.verseKey,
    });
  }

  return decisions;
}
