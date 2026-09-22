import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLUS_NAME } from "./brand.ts";
import { SALAAM } from "./greeting.ts";
import {
  listenLeadCopy,
  occasionHintCopy,
  playlistBarTitle,
  playlistsLocked,
  playlistsLockedPitch,
  plusOnLabel,
  plusSalaamLine,
} from "./plus-presence.ts";

describe("plus presence copy", () => {
  it("keeps the salaam, and names Plus once it is paid", () => {
    assert.equal(plusSalaamLine(false), SALAAM);
    assert.equal(plusSalaamLine(true), `${SALAAM} · Plus`);
  });

  it("tells a Plus listener the list will play, and a free listener that play is Plus", () => {
    assert.match(listenLeadCopy(true), /is on/i);
    assert.match(listenLeadCopy(true), /Play a list/i);
    assert.doesNotMatch(listenLeadCopy(true), /Playing a list is/);
    assert.doesNotMatch(listenLeadCopy(true), /reciter/i);
    assert.match(listenLeadCopy(false), /Diras Plus/);
    assert.match(listenLeadCopy(false), /Reading stays free on Menu/);
    assert.doesNotMatch(listenLeadCopy(false), /Look around/);
  });

  it("does not repeat the reciter on occasion rows", () => {
    assert.equal(occasionHintCopy(true, "Minshawi"), "Play a list");
    assert.equal(occasionHintCopy(false, "Minshawi"), `${PLUS_NAME} extra`);
    assert.doesNotMatch(occasionHintCopy(false, "Minshawi"), /Look around/);
    assert.doesNotMatch(occasionHintCopy(true, "Minshawi"), /Minshawi/);
  });

  it("shows one locked Plus pitch instead of eight sparkle cards", () => {
    assert.equal(playlistsLocked(false), true);
    assert.equal(playlistsLocked(true), false);
    const pitch = playlistsLockedPitch();
    assert.match(pitch.title, new RegExp(PLUS_NAME));
    assert.match(pitch.body, /occasion lists/i);
    assert.doesNotMatch(pitch.body, /Look around/);
    assert.equal(pitch.cta, "See plans");
  });

  it("marks a playing list as Plus", () => {
    assert.equal(playlistBarTitle("Friday", true), "Plus · Friday");
    assert.equal(playlistBarTitle("Friday", false), "Friday");
    assert.equal(plusOnLabel(), `${PLUS_NAME} is on`);
  });
});
