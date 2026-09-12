export const FREE_REPEAT_MAX = 2;

export type PlusFeature = "repeats" | "focus" | "relay-qaris";

export const PLUS_COPY: Record<PlusFeature, { title: string; body: string }> = {
  repeats: {
    title: "3× and unlimited word repeats",
    body: "The Repeat button loops the current verse for free, as many times as you like. Playing a word once or twice stays free. Three or more word passes, and looping a word until you stop, are Diras Plus.",
  },
  focus: {
    title: "Focus is included",
    body: "Focus — verse, drill, masked, or relay on one stage — stays free. Diras Plus is 3× word repeats and extra relay qaris.",
  },
  "relay-qaris": {
    title: "More than one qari",
    body: "Relay with you and one qari stays free. Adding a second reciter is Diras Plus.",
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
