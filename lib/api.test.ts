import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AUDIO_BASE } from "./constants.ts";
import { resolveAudioUrl } from "./audio-url.ts";

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
