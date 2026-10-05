import {
  emptyReciteHighlight,
  highlightAtStep,
  mergePeekHighlight,
  nextShownStep,
  USTADH_PEEK,
  type UstadhReciteHighlight,
} from "./highlight.ts";
import type { ExpectedWord } from "./types.ts";

export type HighlightScheduler = {
  setInterval: (fn: () => void, ms: number) => unknown;
  clearInterval: (id: unknown) => void;
};

const defaultScheduler: HighlightScheduler = {
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: (id) => clearInterval(id as ReturnType<typeof setInterval>),
};

/**
 * Owns the visible recite highlight for one take.
 * Peeks set a target; the driver walks the painted highlight toward it one word
 * per `stepMs` so a peek that confirms several words reads as quick steps,
 * never a jump. Peeks only move forward; a final result may move back.
 */
export class UstadhHighlightDriver {
  private readonly words: () => ExpectedWord[];
  private readonly paint: (highlight: UstadhReciteHighlight) => void;
  private readonly scheduler: HighlightScheduler;
  private readonly stepMs: number;
  private timer: unknown = null;
  private goal: UstadhReciteHighlight | null = null;
  private step = 0;

  constructor(options: {
    words: () => ExpectedWord[];
    paint: (highlight: UstadhReciteHighlight) => void;
    scheduler?: HighlightScheduler;
    stepMs?: number;
  }) {
    this.words = options.words;
    this.paint = options.paint;
    this.scheduler = options.scheduler ?? defaultScheduler;
    this.stepMs = options.stepMs ?? USTADH_PEEK.stepMs;
  }

  get target(): UstadhReciteHighlight | null {
    return this.goal;
  }

  /** Words currently painted as recited. */
  get shown(): number {
    return this.step;
  }

  get stepping(): boolean {
    return this.timer != null;
  }

  /** Start of a take: frontier on the first word, nothing recited. */
  reset(): void {
    this.stop();
    this.goal = null;
    this.step = 0;
    this.paint(emptyReciteHighlight(this.words()));
  }

  /** Rolling peek result (merged so the highlight never moves back mid-take). */
  peek(next: UstadhReciteHighlight): void {
    this.drive(mergePeekHighlight(this.goal, next));
  }

  /** Final result for the take. `immediate` paints it at once (before a replay). */
  final(highlight: UstadhReciteHighlight, options: { immediate?: boolean } = {}): void {
    this.drive(highlight, options);
  }

  drive(target: UstadhReciteHighlight, options: { immediate?: boolean } = {}): void {
    this.goal = target;
    if (options.immediate || target.reach <= this.step) {
      this.stop();
      this.step = target.reach;
      this.paint(target);
      return;
    }
    this.paint(highlightAtStep(target, this.words(), this.step));
    if (this.timer != null) return;
    this.timer = this.scheduler.setInterval(() => this.tick(), this.stepMs);
  }

  /** One visible step (exposed for tests; the interval calls it). */
  tick(): void {
    const goal = this.goal;
    if (!goal) {
      this.stop();
      return;
    }
    this.step = nextShownStep(this.step, goal.reach);
    this.paint(highlightAtStep(goal, this.words(), this.step));
    if (this.step >= goal.reach) this.stop();
  }

  stop(): void {
    if (this.timer != null) {
      this.scheduler.clearInterval(this.timer);
      this.timer = null;
    }
  }
}
