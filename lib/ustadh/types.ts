/** Word timestamp returned to the practice client. Times are seconds. */
export type AsrWord = {
  word: string;
  start: number;
  end: number;
  probability?: number;
};

/**
 * One expected Quran word, already aligned to the app's word list.
 * `pos` is 1-based within the ayah (`Word.pos`). `targetId` is the
 * word-by-word clip id when the verse key is known (`wbw/001_001_001.mp3`).
 */
export type ExpectedWord = {
  index: number;
  pos: number;
  ar: string;
  verseKey: string;
  audio: string | null;
  targetId: string;
  phraseId: string;
};

/** A phrase whose edges come from waqf marks or an explicit from/to range. */
export type ExpectedPhrase = {
  id: string;
  verseKey: string;
  from: number;
  to: number;
  wordIndexes: number[];
};

export type InterruptType = "word" | "phrase" | "ayah";

/** Stop-listening hint. The first item is the unit to play now. */
export type InterruptHint = {
  type: InterruptType;
  expected: string;
  heard?: string;
  start?: number;
  end?: number;
  verseKey?: string;
  phraseId?: string;
  wordIndex?: number;
};

export type ReplayAction = "replay_word" | "replay_phrase" | "slow_word";

/**
 * Per flagged word: which recorded unit the client should replay.
 * `slow_word` is the same word clip as `replay_word`, played slower after a repeat miss.
 */
export type ReplayDecision = {
  action: ReplayAction;
  targetId: string;
  wordIndex?: number;
  phraseId?: string;
  start?: number;
  end?: number;
  missCount?: number;
  /** 1-based word position in the ayah, matching `Word.pos`. */
  pos?: number;
  verseKey?: string;
};

export type UstadhAsrResponse = {
  model: "whisper-large-v3-turbo";
  language: "ar";
  /** Groq Whisper is a file API. The client uploads short utterances. */
  transport: "chunked";
  text: string;
  words: AsrWord[];
  interrupts: InterruptHint[];
  replays: ReplayDecision[];
  sessionId?: string;
  surah?: number;
  ayahStart?: number;
  ayahEnd?: number;
  chunkStart?: number;
};

export type AsrErrorBody = {
  error: string;
  code: string;
};
