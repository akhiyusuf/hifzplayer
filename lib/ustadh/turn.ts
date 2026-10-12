import { alignWords, interruptHints } from "./interrupt.ts";
import { replayDecisions } from "./replay.ts";
import type { AsrWord, ExpectedPhrase, ExpectedWord, InterruptHint, ReplayDecision } from "./types.ts";

export function assessUstadhTurn(input: {
  words: ExpectedWord[];
  phrases: ExpectedPhrase[];
  heard: AsrWord[];
  missCounts?: Record<string, number>;
}): { interrupts: InterruptHint[]; replays: ReplayDecision[] } {
  if (!input.words.length) return { interrupts: [], replays: [] };
  const ops = alignWords(
    input.words.map((word) => word.ar),
    input.heard.map((word) => word.word),
  );
  const shared = { words: input.words, phrases: input.phrases, heard: input.heard, ops };
  return {
    interrupts: interruptHints(shared),
    replays: replayDecisions({ ...shared, missCounts: input.missCounts }),
  };
}
