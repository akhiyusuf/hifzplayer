import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLUS_NAME } from "./brand.ts";
import { SALAAM } from "./greeting.ts";
import {
  listenLeadCopy,
  occasionHintCopy,
  playlistBarTitle,
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
    assert.match(listenLeadCopy(false), /Playing a list is/);
  });

  it("does not repeat the reciter on occasion rows", () => {
    assert.equal(occasionHintCopy(true, "Minshawi"), "Play a list");
    assert.match(occasionHintCopy(false, "Minshawi"), /Look around/);
    assert.doesNotMatch(occasionHintCopy(true, "Minshawi"), /Minshawi/);
  });

  it("marks a playing list as Plus", () => {
    assert.equal(playlistBarTitle("Friday", true), "Plus · Friday");
    assert.equal(playlistBarTitle("Friday", false), "Friday");
    assert.equal(plusOnLabel(), `${PLUS_NAME} is on`);
  });
});
