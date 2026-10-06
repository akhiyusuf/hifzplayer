import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LADDER_DAYS,
  REVIEW_WINDOW_MS,
  addDays,
  applyAyahOutcome,
  ayahKey,
  ayahSpans,
  createPlan,
  dueReviewAyahs,
  dueRevisionAyahs,
  formatAyahRange,
  ladderDaysForStep,
  markGotIt,
  markLearned,
  markShaky,
  memorizedCount,
  nextNewAyahs,
  normalizeAyahState,
  normalizePlan,
  practiceRangeHref,
  primarySpan,
  todayQueues,
} from "./practice-plan.ts";

const NOW = Date.UTC(2026, 9, 5, 12, 0, 0); // 5 Oct 2026 noon UTC

describe("practice plan normalize", () => {
  it("accepts a valid surah plan", () => {
    const plan = createPlan({ surah: 67, from: 1, to: 30, ayahsPerDay: 3, now: NOW });
    assert.deepEqual(plan, {
      surah: 67,
      from: 1,
      to: 30,
      ayahsPerDay: 3,
      createdAt: NOW,
    });
  });

  it("rejects bad ayahs-per-day and empty ranges", () => {
    assert.equal(normalizePlan({ surah: 1, from: 1, to: 7, ayahsPerDay: 4, createdAt: NOW }), null);
    assert.equal(normalizePlan({ surah: 1, from: 5, to: 2, ayahsPerDay: 3, createdAt: NOW }), null);
    assert.equal(normalizePlan({ surah: 0, from: 1, to: 7, ayahsPerDay: 3, createdAt: NOW }), null);
  });

  it("clamps to versesCount when provided", () => {
    const plan = normalizePlan(
      { surah: 1, from: 1, to: 99, ayahsPerDay: 5, createdAt: NOW },
      7,
    );
    assert.equal(plan?.to, 7);
  });
});

describe("SRS ladder", () => {
  it("uses +1,+2,+4,+7,+14,+30", () => {
    assert.deepEqual([...LADDER_DAYS], [1, 2, 4, 7, 14, 30]);
    assert.equal(ladderDaysForStep(0), 1);
    assert.equal(ladderDaysForStep(5), 30);
    assert.equal(ladderDaysForStep(99), 30);
  });

  it("mark learned schedules +1 day", () => {
    const s = markLearned(undefined, NOW);
    assert.equal(s.step, 0);
    assert.equal(s.learnedAt, NOW);
    assert.equal(s.dueAt, addDays(NOW, 1));
  });

  it("Got it climbs the ladder; Shaky resets", () => {
    let s = markLearned(undefined, NOW);
    s = markGotIt(s, NOW);
    assert.equal(s.step, 1);
    assert.equal(s.dueAt, addDays(NOW, 2));
    s = markGotIt(s, NOW);
    assert.equal(s.step, 2);
    assert.equal(s.dueAt, addDays(NOW, 4));
    for (let i = 0; i < 10; i++) s = markGotIt(s, NOW);
    assert.equal(s.step, LADDER_DAYS.length - 1);
    assert.equal(s.dueAt, addDays(NOW, 30));
    s = markShaky(s, NOW);
    assert.equal(s.step, 0);
    assert.equal(s.dueAt, addDays(NOW, 1));
  });
});

describe("today queues", () => {
  const plan = createPlan({ surah: 112, from: 1, to: 4, ayahsPerDay: 2, now: NOW })!;

  it("pulls the next N unlearned ayahs as New", () => {
    assert.deepEqual(nextNewAyahs(plan, {}), [1, 2]);
    const after = applyAyahOutcome({}, 112, [1, 2], "learned", NOW);
    assert.deepEqual(nextNewAyahs(plan, after), [3, 4]);
    assert.equal(memorizedCount(plan, after), 2);
  });

  it("splits due work into Review (≤7d) vs Revision (>7d)", () => {
    const recent = markLearned(undefined, NOW - 2 * REVIEW_WINDOW_MS / 7);
    recent.dueAt = NOW - 1000;
    const older = markLearned(undefined, NOW - REVIEW_WINDOW_MS - DAY_PAD());
    older.dueAt = NOW - 1000;
    const notDue = markLearned(undefined, NOW - 3 * REVIEW_WINDOW_MS / 7);
    notDue.dueAt = NOW + DAY_PAD();

    const state = {
      [ayahKey(112, 1)]: recent,
      [ayahKey(112, 2)]: older,
      [ayahKey(112, 3)]: notDue,
    };
    assert.deepEqual(dueReviewAyahs(plan, state, NOW), [1]);
    assert.deepEqual(dueRevisionAyahs(plan, state, NOW), [2]);
    const q = todayQueues(plan, state, NOW);
    assert.deepEqual(q.newAyahs, [4]); // 1,2,3 learned; ayahsPerDay=2 but only 4 left
    assert.deepEqual(q.reviewAyahs, [1]);
    assert.deepEqual(q.revisionAyahs, [2]);
  });
});

function DAY_PAD() {
  return 24 * 60 * 60 * 1000;
}

describe("spans and hrefs", () => {
  it("groups contiguous ayahs", () => {
    assert.deepEqual(ayahSpans([1, 2, 3, 5, 6, 9]), [
      { from: 1, to: 3 },
      { from: 5, to: 6 },
      { from: 9, to: 9 },
    ]);
    assert.deepEqual(primarySpan([4, 5, 6]), { from: 4, to: 6 });
    assert.equal(formatAyahRange(4, 6), "4–6");
    assert.equal(formatAyahRange(4, 4), "4");
  });

  it("builds a reader URL with back=practice", () => {
    assert.equal(practiceRangeHref(67, 1, 3), "/read/67?from=1&to=3&back=practice");
  });

  it("normalizes ayah state maps", () => {
    assert.deepEqual(
      normalizeAyahState({
        "2:255": { learnedAt: 1, step: 0, dueAt: 2 },
        bad: { learnedAt: 1, step: 0, dueAt: 2 },
        "1:1": { learnedAt: "x", step: 0, dueAt: 2 },
      }),
      { "2:255": { learnedAt: 1, step: 0, dueAt: 2 } },
    );
  });
});
