import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BEST_OF_ID,
  BEST_OF_STOPS,
  OCCASION_PLAYLISTS,
  clampStopIndex,
  playlistHref,
  reciterDisplayName,
  resolvePlaylist,
  stopLabel,
} from "./playlists.ts";

describe("occasion lists", () => {
  it("uses unique ids and real verse ranges", () => {
    const ids = OCCASION_PLAYLISTS.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const list of OCCASION_PLAYLISTS) {
      assert.ok(list.stops.length >= 1, list.id);
      for (const stop of list.stops) {
        assert.ok(stop.chapter >= 1 && stop.chapter <= 114, list.id);
        assert.ok(stop.from >= 1, list.id);
        assert.ok(stop.to >= stop.from, list.id);
      }
    }
  });

  it("keeps Friday as full Kahf and sleep as Mulk then Sajdah", () => {
    const friday = OCCASION_PLAYLISTS.find((p) => p.id === "friday");
    assert.deepEqual(friday?.stops, [{ chapter: 18, from: 1, to: 110 }]);
    const sleep = OCCASION_PLAYLISTS.find((p) => p.id === "sleep");
    assert.deepEqual(sleep?.stops, [
      { chapter: 67, from: 1, to: 30 },
      { chapter: 32, from: 1, to: 30 },
    ]);
  });

  it("does not overclaim in copy", () => {
    const blob = OCCASION_PLAYLISTS.map((p) => `${p.title} ${p.blurb}`).join(" ");
    assert.doesNotMatch(blob, /cure|miracle|guaranteed/i);
    assert.match(blob, /often|widely|favourite|listening/i);
  });

  it("has more than a teaser row, so home can scroll them all", () => {
    assert.ok(OCCASION_PLAYLISTS.length >= 6);
    assert.ok(OCCASION_PLAYLISTS.some((p) => p.id === "morning"));
    assert.ok(OCCASION_PLAYLISTS.some((p) => p.id === "yasin"));
  });
});

describe("best of a reciter", () => {
  it("is a mixed-surah highlight reel, not one chapter", () => {
    const chapters = new Set(BEST_OF_STOPS.map((s) => s.chapter));
    assert.ok(chapters.size > 3);
    assert.equal(BEST_OF_STOPS[0]?.chapter, 1);
    assert.equal(BEST_OF_STOPS.at(-1)?.chapter, 114);
  });

  it("resolves best to the same ayahs with the reciter in the title", () => {
    const list = resolvePlaylist(BEST_OF_ID, "Minshawi", "Murattal");
    assert.equal(list?.id, BEST_OF_ID);
    assert.match(list?.title || "", /Minshawi/);
    assert.deepEqual(list?.stops, BEST_OF_STOPS);
  });
});

describe("playlist urls", () => {
  it("opens the first stop with list, stop, and back=listen", () => {
    const href = playlistHref({ listId: "friday", reciterId: 9, play: true });
    assert.ok(href?.startsWith("/read/18?"));
    const q = new URLSearchParams(href!.split("?")[1]);
    assert.equal(q.get("from"), "1");
    assert.equal(q.get("to"), "110");
    assert.equal(q.get("list"), "friday");
    assert.equal(q.get("stop"), "0");
    assert.equal(q.get("reciter"), "9");
    assert.equal(q.get("play"), "1");
    assert.equal(q.get("back"), "listen");
  });

  it("clamps a stop past the end", () => {
    const list = resolvePlaylist("ease");
    assert.ok(list);
    assert.equal(clampStopIndex(list, 99), list.stops.length - 1);
    assert.equal(clampStopIndex(list, -1), 0);
  });

  it("labels a single ayah and a range", () => {
    const chapters = [{ id: 2, name_simple: "Al-Baqarah" }];
    assert.equal(stopLabel({ chapter: 2, from: 255, to: 255 }, chapters), "Al-Baqarah 255");
    assert.equal(stopLabel({ chapter: 2, from: 285, to: 286 }, chapters), "Al-Baqarah 285–286");
  });

  it("includes style only when present", () => {
    assert.equal(reciterDisplayName("Minshawi", "Murattal"), "Minshawi · Murattal");
    assert.equal(reciterDisplayName("Sudais", ""), "Sudais");
  });
});
