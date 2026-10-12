import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UstadhHighlightDriver, type HighlightScheduler } from "./highlight-driver.ts";
import { reciteHighlightFromHeard, type UstadhReciteHighlight } from "./highlight.ts";
import { fixturePassage } from "./fixtures/load.ts";

function manual() {
  const fns = new Map<number, () => void>();
  let id = 0;
  const scheduler: HighlightScheduler = {
    setInterval: (fn) => {
      fns.set(++id, fn);
      return id;
    },
    clearInterval: (key) => {
      fns.delete(key as number);
    },
  };
  return { scheduler, fire: () => [...fns.values()].forEach((fn) => fn()), active: () => fns.size > 0 };
}

const fatiha7 = fixturePassage("1:7");
const asr = ["صراط", "الذين", "انعمت", "عليهم", "غير", "المغضوب", "عليهم", "ولا", "الضالين"];
const words = (n: number) => asr.slice(0, n).map((word, i) => ({ word, start: i * 0.6, end: i * 0.6 + 0.5 }));

describe("UstadhHighlightDriver", () => {
  it("walks the painted highlight one word per step toward a peek", () => {
    const clock = manual();
    const painted: UstadhReciteHighlight[] = [];
    const driver = new UstadhHighlightDriver({
      words: () => fatiha7.words,
      paint: (h) => painted.push(h),
      scheduler: clock.scheduler,
    });
    driver.reset();
    assert.equal(painted.at(-1)!.curPos, 1);
    driver.peek(reciteHighlightFromHeard({ words: fatiha7.words, heard: words(4) }));
    const reaches = [painted.at(-1)!.reach];
    while (clock.active()) {
      clock.fire();
      reaches.push(painted.at(-1)!.reach);
    }
    assert.deepEqual(reaches, [0, 1, 2, 3, 4]);
    assert.equal(painted.at(-1)!.curPos, 5);
  });

  it("never moves back on a worse peek but a final result can", () => {
    const clock = manual();
    const painted: UstadhReciteHighlight[] = [];
    const driver = new UstadhHighlightDriver({ words: () => fatiha7.words, paint: (h) => painted.push(h), scheduler: clock.scheduler });
    driver.reset();
    driver.peek(reciteHighlightFromHeard({ words: fatiha7.words, heard: words(5) }));
    while (clock.active()) clock.fire();
    driver.peek(reciteHighlightFromHeard({ words: fatiha7.words, heard: words(2) }));
    assert.equal(driver.shown, 5);
    driver.final(reciteHighlightFromHeard({ words: fatiha7.words, heard: words(3), final: true }), { immediate: true });
    assert.equal(driver.shown, 3);
    assert.deepEqual(painted.at(-1)!.missPositions, [4]);
  });

  it("immediate final stops an in-flight walk", () => {
    const clock = manual();
    const driver = new UstadhHighlightDriver({ words: () => fatiha7.words, paint: () => {}, scheduler: clock.scheduler });
    driver.reset();
    driver.peek(reciteHighlightFromHeard({ words: fatiha7.words, heard: words(6) }));
    clock.fire();
    assert.equal(driver.stepping, true);
    driver.final(reciteHighlightFromHeard({ words: fatiha7.words, heard: words(9), final: true }), { immediate: true });
    assert.equal(driver.stepping, false);
    assert.equal(driver.shown, 9);
  });

  it("reset clears target and stops stepping", () => {
    const clock = manual();
    const driver = new UstadhHighlightDriver({ words: () => fatiha7.words, paint: () => {}, scheduler: clock.scheduler });
    driver.peek(reciteHighlightFromHeard({ words: fatiha7.words, heard: words(3) }));
    driver.reset();
    assert.equal(driver.target, null);
    assert.equal(driver.shown, 0);
    assert.equal(clock.active(), false);
  });
});
