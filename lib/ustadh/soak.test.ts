import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fixtureVerses } from "./fixtures/load.ts";
import { checkTakeInvariants, mulberry32, simulateTake, type SimulateOptions } from "./soak.ts";
import { expectedFromVerse } from "./units.ts";

/**
 * Synthetic soak: every fixture ayah × many seeded takes with realistic ASR
 * noise, through the same peek → driver → final code the coach bar runs.
 * Set USTADH_SOAK_TAKES to run longer locally (default keeps `npm test` fast).
 */
const TAKES = Number(process.env.USTADH_SOAK_TAKES || 40);
const passages = fixtureVerses().map((verse) => ({ key: verse.key, ...expectedFromVerse(verse) }));

function soak(name: string, makeOptions: (seed: number, n: number, rng: () => number) => SimulateOptions | null) {
  it(name, () => {
    const failures: string[] = [];
    let ran = 0;
    for (const passage of passages) {
      const n = passage.words.length;
      for (let take = 0; take < TAKES; take++) {
        const seed = (take + 1) * 7919 + n * 104729 + passage.key.length;
        const options = makeOptions(seed, n, mulberry32(seed ^ 0x9e3779b9));
        if (!options) continue;
        const sim = simulateTake(passage.words, options);
        failures.push(...checkTakeInvariants(sim));
        ran += 1;
      }
    }
    assert.ok(ran > 0, "soak ran no takes");
    assert.deepEqual(failures.slice(0, 15), [], `${failures.length} invariant failures over ${ran} takes`);
  });
}

describe("ustadh highlight soak (synthetic ASR)", () => {
  soak("clean takes: walk word by word, never ahead, end complete with no underline", (seed) => ({ seed }));

  soak("noisy peeks (cut words, dropped words, Latin, يا أيها splits) stay monotonic and conservative", (seed) => ({
    seed,
    cutRate: 0.5,
    peekDropRate: 0.08,
    latinRate: 0.2,
    splitRate: 0.5,
  }));

  soak("prompt hallucination on peeks never runs the highlight ahead of the learner", (seed) => ({
    seed,
    hallucinateRate: 0.6,
    cutRate: 0.3,
  }));

  soak("a skipped word is underlined, never silently passed", (seed, n, rng) =>
    n < 3 ? null : { seed, skip: 1 + Math.floor(rng() * (n - 2)) },
  );

  soak("a wrong word is underlined at its own position", (seed, n, rng) =>
    n < 2 ? null : { seed, wrong: Math.floor(rng() * n), cutRate: 0.3 },
  );

  soak("stopping short underlines the first unrecited word", (seed, n, rng) =>
    n < 3 ? null : { seed, stopAfter: 1 + Math.floor(rng() * (n - 2)) },
  );
});
