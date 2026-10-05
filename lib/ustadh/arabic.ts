/**
 * Fold Quranic spelling down to a comparable Arabic skeleton.
 * Diacritics, waqf marks, and alef/hamza variants are ignored so a correct
 * recitation is not flagged for tashkeel the recognizer dropped.
 * Alif maqsura (ى) stays distinct from ya (ي): على and علي are different words.
 *
 * Dagger alef (U+0670) is special: Quranic orthography uses it as a superscript
 * alef that ASR usually writes as a plain ا (العالمين, الصراط, مالك). Stripping
 * it alone would leave العلمين and miss. Expanding alone would turn الرحمن into
 * الرحمان and miss ASR's الرحمن. Matching therefore accepts both forms.
 */
const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED\u08D3-\u08FF]/g;
const DAGGER_ALEF = /\u0670/g;
/** Arabic script blocks used to drop Latin / other ASR noise from the coach UI. */
const ARABIC_CHAR = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

function foldSkeleton(input: string): string {
  return String(input ?? "")
    .normalize("NFC")
    .replace(DIACRITICS, "")
    .replace(/\u0640/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ء/g, "")
    .replace(/ة/g, "ه")
    .replace(/[^\u0621-\u064A\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Canonical skeleton with dagger-alef expanded to ا.
 * Prefer {@link arabicEqual} / {@link normalizeArabicVariants} for matching.
 */
export function normalizeArabic(input: string): string {
  return foldSkeleton(String(input ?? "").replace(DAGGER_ALEF, "ا"));
}

/** Both dagger→ا and dagger-stripped skeletons (deduped, non-empty). */
export function normalizeArabicVariants(input: string): string[] {
  const raw = String(input ?? "");
  const expanded = foldSkeleton(raw.replace(DAGGER_ALEF, "ا"));
  const stripped = foldSkeleton(raw.replace(DAGGER_ALEF, ""));
  const out: string[] = [];
  if (expanded) out.push(expanded);
  if (stripped && stripped !== expanded) out.push(stripped);
  return out;
}

export function arabicEqual(a: string, b: string): boolean {
  const left = normalizeArabicVariants(a);
  const right = new Set(normalizeArabicVariants(b));
  if (!left.length || !right.size) return false;
  return left.some((value) => right.has(value));
}

export function tokenizeArabic(text: string): string[] {
  return String(text ?? "")
    .trim()
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** True when the token contains at least one Arabic-script letter. */
export function hasArabicScript(token: string): boolean {
  return ARABIC_CHAR.test(String(token ?? ""));
}

/** Keep only tokens that contain Arabic script (drops Latin ASR hallucinations). */
export function filterArabicTranscript(text: string): string {
  return tokenizeArabic(text)
    .filter((token) => hasArabicScript(token))
    .join(" ");
}

export function filterArabicAsrWords<T extends { word: string }>(words: T[]): T[] {
  return (words || []).filter((row) => hasArabicScript(row.word));
}

/** Groq's Whisper prompt is capped at 224 tokens. Stay well under that in characters. */
export const QURAN_PROMPT_CHARS = 180;

export function quranAsrPrompt(text: string): string | undefined {
  const flat = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!flat) return undefined;
  if (flat.length <= QURAN_PROMPT_CHARS) return flat;
  const cut = flat.slice(0, QURAN_PROMPT_CHARS);
  const space = cut.lastIndexOf(" ");
  return (space > 40 ? cut.slice(0, space) : cut).trim();
}

/** True when ASR produced tokens but none are Arabic script (Latin / transliteration). */
export function transcriptNeedsArabicRetry(
  text: string,
  words: { word: string }[] | null | undefined = [],
): boolean {
  const list = words || [];
  const tokens = tokenizeArabic(text);
  const hadContent = tokens.length > 0 || list.length > 0;
  if (!hadContent) return false;
  const arabicText = filterArabicTranscript(text);
  const arabicWords = filterArabicAsrWords(list);
  return !arabicText && arabicWords.length === 0;
}

/** Max silent re-transcriptions after a Latin/transliteration first pass. */
export const ARABIC_ASR_RETRY_LIMIT = 3;

const RETRY_PREFIXES = [
  "قرآن كريم باللغة العربية فقط: ",
  "تلاوة قرآنية عربية. اكتب بالحروف العربية فقط وليس لاتينية: ",
  "سورة من القرآن الكريم. فرغ الصوت بالعربية الفصحى فقط بدون transliteration: ",
] as const;

function clipPromptBody(ayah: string, budget: number): string {
  if (ayah.length <= budget) return ayah;
  const cut = ayah.slice(0, budget);
  const space = cut.lastIndexOf(" ");
  return (space > 20 ? cut.slice(0, space) : cut).trim();
}

/**
 * Stronger Whisper prompt for silent Latin→Arabic retries.
 * `attempt` is 1..ARABIC_ASR_RETRY_LIMIT (each retry gets a stronger prefix).
 */
export function strongQuranAsrPrompt(text: string, attempt = 1): string | undefined {
  const ayah = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!ayah) return undefined;
  const index = Math.min(Math.max(1, Math.floor(attempt)), RETRY_PREFIXES.length) - 1;
  const prefix = RETRY_PREFIXES[index];
  const budget = Math.max(40, QURAN_PROMPT_CHARS - prefix.length);
  return `${prefix}${clipPromptBody(ayah, budget)}`;
}

/** Filter transcript text/words to Arabic script only (never surface Latin). */
export function arabicOnlyTranscript(input: {
  text: string;
  words: { word: string; start: number; end: number; probability?: number }[];
}): { text: string; words: { word: string; start: number; end: number; probability?: number }[] } {
  const words = filterArabicAsrWords(input.words || []);
  const fromWords = words.map((row) => row.word).join(" ");
  const text = filterArabicTranscript(input.text) || fromWords;
  return { text, words };
}
