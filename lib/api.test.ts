import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AUDIO_BASE } from "./constants.ts";
import { resolveAudioUrl, resolveWordAudioUrl } from "./audio-url.ts";

describe("resolveAudioUrl", () => {
  it("keeps verses.quran.com paths on that host", () => {
    assert.equal(
      resolveAudioUrl("Alafasy/mp3/001001.mp3"),
      `${AUDIO_BASE}Alafasy/mp3/001001.mp3`,
    );
  });

  it("turns protocol-relative Muallim URLs into https on quranicaudio", () => {
    assert.equal(
      resolveAudioUrl("//mirrors.quranicaudio.com/everyayah/Husary_Muallim_128kbps/001001.mp3"),
      "https://mirrors.quranicaudio.com/everyayah/Husary_Muallim_128kbps/001001.mp3",
    );
  });

  it("does not prefix verses.quran.com onto an absolute URL", () => {
    assert.equal(
      resolveAudioUrl("https://mirrors.quranicaudio.com/everyayah/Husary_64kbps/001001.mp3"),
      "https://mirrors.quranicaudio.com/everyayah/Husary_64kbps/001001.mp3",
    );
  });
});

describe("resolveWordAudioUrl", () => {
  it("builds a verses.quran.com word-by-word clip URL", () => {
    assert.equal(
      resolveWordAudioUrl("wbw/001_001_001.mp3"),
      `${AUDIO_BASE}wbw/001_001_001.mp3`,
    );
  });

  it("accepts a bare filename", () => {
    assert.equal(
      resolveWordAudioUrl("001_001_002.mp3"),
      `${AUDIO_BASE}wbw/001_001_002.mp3`,
    );
  });
});
