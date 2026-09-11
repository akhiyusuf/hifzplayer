export const FREE_REPEAT_MAX = 2;

export type PlusFeature = "repeats" | "focus" | "relay-qaris";

export const PLUS_COPY: Record<PlusFeature, { title: string; body: string }> = {
  repeats: {
    title: "3× and unlimited repeats",
    body: "Playing a word or verse once or twice stays free. Three or more passes, and looping until you stop — including the verse repeat button — are Hifz Plus.",
  },
  focus: {
    title: "Focus mode",
    body: "Mushaf view stays free. Focus — one phrase at a time — is Hifz Plus.",
  },
  "relay-qaris": {
    title: "More than one qari",
    body: "Relay with you and one qari stays free. Adding a second reciter is Hifz Plus.",
  },
};

/** Infinite (0) and 3+ repeats are Plus. 1 and 2 stays free. */
export function isPaidRepeat(count: number) {
  return count === 0 || count > FREE_REPEAT_MAX;
}

export function clampRepeat(count: number, plus: boolean) {
  if (plus || !isPaidRepeat(count)) return count;
  return FREE_REPEAT_MAX;
}

export function qariCount(order: { kind?: string }[] | null | undefined) {
  if (!order) return 0;
  return order.filter((p) => p.kind === "qari").length;
}

export function isPaidRelay(order: { kind?: string }[] | null | undefined) {
  return qariCount(order) > 1;
}
