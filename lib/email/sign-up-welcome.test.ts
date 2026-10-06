import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  signUpWelcomeHtml,
  signUpWelcomeSubject,
  signUpWelcomeText,
} from "./sign-up-welcome.ts";

describe("sign-up welcome email", () => {
  it("greets a named reader without sounding like a receipt", () => {
    const text = signUpWelcomeText({ name: "Yusuf" });
    assert.equal(signUpWelcomeSubject(), "Welcome to Diras");
    assert.match(text, /Assalamu alaikum Yusuf/);
    assert.match(text, /your Diras account is ready/);
    assert.match(text, /Quran reading, audio, translation, and tajweed are always free/);
    assert.match(text, /Open Al-Fatiha/);
    assert.match(text, /Focus view/);
    assert.match(text, /Settings/);
    assert.match(text, /support@diras\.app/);
    assert.doesNotMatch(text, /trxref|cs_live|reference/i);
  });

  it("greets an unnamed reader without a blank", () => {
    const text = signUpWelcomeText({ name: null });
    assert.match(text, /Assalamu alaikum —/);
    assert.doesNotMatch(text, /Assalamu alaikum  —/);
  });

  it("html version contains the brand and the key tips", () => {
    const html = signUpWelcomeHtml({ name: "" });
    assert.match(html, /<strong>Diras<\/strong>/);
    assert.match(html, /Al-Fatiha/);
    assert.match(html, /Focus view/);
    assert.match(html, /mailto:support@diras\.app/);
    // The email is now a full HTML document (email template).
    assert.match(html, /<!DOCTYPE html/i);
  });
});
