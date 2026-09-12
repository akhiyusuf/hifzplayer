"use client";

import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icon";
import { OfflineBanner } from "@/components/offline-banner";
import { FocusStage } from "@/components/focus-stage";
import { PracticeSheet } from "@/components/practice-sheet";
import { ReciterSheet } from "@/components/reciter-sheet";
import { Sheet } from "@/components/sheet";
import { useAppData } from "@/lib/app-data";
import { attachAudio, fetchAudio, fetchPassage, fetchTransliteration } from "@/lib/api";
import { fmtTime, segsForVerse, segForWord, toArabicDigits, wordAt } from "@/lib/audio";
import { APP_NAME } from "@/lib/brand";
import { isPaidRelay, isPaidRepeat } from "@/lib/billing/gates";
import { KEYS, LOOP_COUNTS, MODES, RATES } from "@/lib/constants";
import { usePlus } from "@/lib/plus";
import { markToday, upsertSession } from "@/lib/sessions";
import { getStore, setStore } from "@/lib/storage";
import { tajToSpans } from "@/lib/tajweed";
import { useToast } from "@/lib/toast";

let m = /[ۖ-ۜ]/;
function v(e) {
  if (e._phrases) return e._phrases;
  let t = [],
    s = [],
    r = new Set(
      e.marks.filter((e) => m.test(e.ar)).map((e) => e.afterPos),
    );
  for (let a of e.words)
    (s.push(a),
      (r.has(a.pos) || m.test(a.ar) || s.length >= 6) &&
        (t.push(s), (s = [])));
  return (
    s.length &&
      (t.length && s.length <= 2
        ? (t[t.length - 1] = t[t.length - 1].concat(s))
        : t.push(s)),
    (e._phrases = t.length ? t : [e.words]),
    e._phrases
  );
}
function wantsTranslation() {
  let e = getStore(KEYS.showTranslation);
  return null == e || e;
}
function x(e, t, s, r, a, n) {
  let i = e.filter((e) => e.number >= t && e.number <= s),
    l = (a - 1) % r.length,
    o = [],
    d = r.find((e) => "qari" === e.kind),
    c = d ? d.reciterId : n;
  for (let e = 0; e < i.length; e++) {
    let t = r[(e + l) % r.length];
    "qari" === t.kind
      ? ((c = t.reciterId),
        o.push({
          kind: "qari",
          reciterId: t.reciterId,
          verseKey: i[e].key,
        }))
      : o.push({ kind: "you", reciterId: c, verseKey: i[e].key });
  }
  return o;
}
class g {
  notify() {
    ((this.snap = { ...this.st }), this.listeners.forEach((e) => e()));
  }
  emitTime() {
    let e = this.audio.duration;
    this.timeListeners.forEach((t) =>
      t(this.audio.currentTime || 0, isFinite(e) ? e : 0),
    );
  }
  toast(e) {
    this.toastListeners.forEach((t) => t(e));
  }
  isVerseDone(e) {
    return this.doneVerses.has(e);
  }
  bindAudioEvents() {
    (this.audio.addEventListener("loadedmetadata", () => {
      ((this.srcFresh = !1),
        this.fireArm(),
        this.emitTime(),
        this.pendingWordInit &&
          ((this.pendingWordInit = !1),
          "word" === this.st.mode && this.wordModePlayCurrent()));
    }),
      this.audio.addEventListener("error", () => {
        ((this.srcFresh = !1),
          (this.armed = null),
          (this.pendingWordInit = !1),
          this.clearGap(),
          this.st.playing && ((this.st.playing = !1), this.notify()),
          this.audio.src &&
            this.toast("Audio failed to load — check your connection."));
      }),
      this.audio.addEventListener("ended", () => this.onEnded()),
      this.audio.addEventListener("pause", () => {
        this.audio.ended ||
          this.wordGapTimer ||
          !this.st.playing ||
          ((this.st.playing = !1), this.notify());
      }),
      this.audio.addEventListener("play", () => {
        (this.st.playing || ((this.st.playing = !0), this.notify()),
          this.tick());
      }),
      this.audio.addEventListener("seeked", () => {
        this.emitTime();
        let { mode: e, wordStep: t } = this.st;
        if ("relay" === e || "masked" === e || ("word" === e && t.active))
          return;
        let s = this.currentVerse();
        if (!s) return;
        let r = wordAt(this.segsForVerse(s), this.audio.currentTime);
        r !== this.st.curWord &&
          ((this.st.curWord = r), this.onWordChange(s, r));
      }));
  }
  segsForVerse(e) {
    return segsForVerse(e, e === this.currentVerse(), this.audio.duration);
  }
  currentVerse() {
    return this.st.verses[this.st.vIdx] || null;
  }
  setSrc(e) {
    this.audio.src !== e &&
      ((this.srcFresh = !0),
      (this.audio.src = e),
      this.audio.load(),
      this.emitTime());
  }
  armSeek(e, t) {
    ((this.armed = { t: Math.max(0, e), play: !!t }),
      !this.srcFresh && this.audio.readyState >= 1 && this.fireArm());
  }
  fireArm() {
    if (!this.armed) return;
    let e = this.armed;
    this.armed = null;
    try {
      this.audio.currentTime = e.t;
    } catch (e) {}
    e.play && this.playAudio();
  }
  playAudio() {
    var e;
    this.audio.playbackRate =
      null !== (e = this.oneshotRate) && void 0 !== e ? e : this.st.rate;
    let t = ++this.playToken,
      s = this.audio.play();
    (s &&
      s.catch &&
      s.catch(() => {
        t === this.playToken &&
          this.audio.paused &&
          ((this.st.playing = !1), this.notify());
      }),
      (this.st.playing = !0),
      this.notify(),
      this.tick());
  }
  pauseAudio() {
    ((this.oneshotRate = null),
      this.armed && (this.armed.play = !1),
      this.audio.pause(),
      this.clearGap(),
      (this.st.playing = !1),
      this.notify());
  }
  clearGap() {
    (this.wordGapTimer && clearTimeout(this.wordGapTimer),
      (this.wordGapTimer = null));
  }
  stopAudio() {
    (this.audio.pause(),
      (this.audio.muted = !1),
      (this.armed = null),
      (this.pendingWordInit = !1),
      this.clearGap(),
      (this.st.playing = !1),
      this.notify());
  }
  tick() {
    null !== this.rafId && cancelAnimationFrame(this.rafId);
    let e = () => {
      let t = this.currentVerse();
      if (t && !this.audio.paused) {
        let e = this.audio.currentTime,
          s = this.segsForVerse(t),
          r = wordAt(s, e);
        r !== this.st.curWord &&
          ((this.st.curWord = r), this.onWordChange(t, r));
        let { oneshot: a, loop: n, mode: i, wordStep: l } = this.st;
        if (a && a.vIdx === this.st.vIdx) {
          let t = segForWord(s, a.endW);
          t &&
            e >= t.end - 0.02 &&
            ((this.st.oneshot = null), this.pauseAudio());
        }
        if (n && n.vIdx === this.st.vIdx) {
          let r = segForWord(s, n.endW);
          r && e >= r.end - 0.03 && this.handleLoopEdge(t);
        }
        if ("word" === i && l.active) {
          let t = segForWord(s, l.w);
          t && e >= t.end - 0.02 && this.wordStepEnded();
        }
        this.emitTime();
      }
      this.st.playing && (this.rafId = requestAnimationFrame(e));
    };
    this.rafId = requestAnimationFrame(e);
  }
  onWordChange(e, t) {
    ("masked" === this.st.mode && this.revealTo(e, t),
      "focus" === this.st.style &&
        "masked" !== this.st.mode &&
        "relay" !== this.st.mode &&
        t > 0 &&
        this.syncFocusPhrase(e, t),
      this.notify());
  }
  handleLoopEdge(e) {
    let t = performance.now();
    if (t - this.loopEdgeAt < 80) return;
    this.loopEdgeAt = t;
    let s = this.st.loop;
    if (!s) return;
    let r = s.pass + 1;
    if (0 !== s.passes && r >= s.passes) {
      ((this.st.loop = null),
        this.toast("Loop done — continuing"),
        this.notify());
      return;
    }
    this.st.loop = { ...s, pass: r };
    let a = segForWord(this.segsForVerse(e), s.startW);
    if (a)
      try {
        this.audio.currentTime = Math.max(0, a.start - 0.02);
      } catch (e) {}
    this.notify();
  }
  onEnded() {
    let e = this.currentVerse();
    if ("relay" === this.st.mode) {
      this.relayTurnEnded();
      return;
    }
    if ("word" === this.st.mode) {
      this.st.wordStep.active
        ? this.wordStepEnded()
        : (this.clearGap(), (this.st.playing = !1), this.notify());
      return;
    }
    if (
      (this.clearGap(),
      this.st.oneshot && this.st.oneshot.vIdx === this.st.vIdx)
    ) {
      ((this.st.oneshot = null), (this.st.playing = !1), this.notify());
      return;
    }
    if (
      this.st.loop &&
      this.st.loop.vIdx === this.st.vIdx &&
      e &&
      (this.handleLoopEdge(e), this.st.loop)
    ) {
      this.playAudio();
      return;
    }
    if (this.st.verseLoop) {
      this.armSeek(0, !0);
      return;
    }
    (this.markVerseDone(this.st.vIdx),
      this.st.vIdx < this.st.verses.length - 1
        ? this.loadVerseAudio(this.st.vIdx + 1, !0)
        : ((this.st.playing = !1),
          this.notify(),
          this.toast("End of passage")));
  }
  markVerseDone(e) {
    this.doneVerses.add(e);
  }
  async openPassage(e, t, s) {
    let r =
        arguments.length > 3 && void 0 !== arguments[3]
          ? arguments[3]
          : "Translation",
      a = ++this.passageToken;
    (this.stopAudio(),
      this.doneVerses.clear(),
      (this.audioByReciter = {}),
      (this.st = {
        ...this.st,
        passage: e,
        reciterId: t,
        verses: s,
        translationName: r,
        loading: !1,
        error: null,
        vIdx: 0,
        curWord: 0,
        loop: null,
        verseLoop: !1,
        relay: null,
        mode: "verse",
        focusPhrase: 0,
        masked: {},
        oneshot: null,
        pendingLoopStart: null,
        wordStep: { active: !1, w: 1, playedTimes: 0, range: null },
      }),
      this.notify());
    try {
      let e = await this.ensureAudio(t);
      if (a !== this.passageToken) return;
      ((this.st.verses = attachAudio(this.st.verses, e)),
        this.notify(),
        this.loadVerseAudio(0, !1));
    } catch (e) {
      if (a !== this.passageToken) return;
      this.toast("Couldn’t load audio for this passage.");
    }
  }
  audioKey(e) {
    let t = this.st.passage;
    return ""
      .concat(e, ":")
      .concat(t.chapter, ":")
      .concat(t.from, "-")
      .concat(t.to);
  }
  async ensureAudio(e) {
    let t = this.audioKey(e),
      s = this.audioByReciter[t];
    if (s) return s;
    let r = this.st.passage,
      a = await fetchAudio(e, r.chapter, r.from, r.to);
    return ((this.audioByReciter[t] = a), a);
  }
  restoreMainAudio() {
    if (!this.st.passage || null == this.st.reciterId) return;
    let e = this.audioByReciter[this.audioKey(this.st.reciterId)];
    e && (this.st.verses = attachAudio(this.st.verses, e));
  }
  loadVerseAudio(e, t, s) {
    var r;
    let a = this.st.verses[e];
    if (!a) return;
    (e !== this.st.vIdx &&
      ((this.st.wordStep = {
        ...this.st.wordStep,
        range: null,
        w: 1,
        playedTimes: 0,
      }),
      (this.st.focusPhrase = 0)),
      (this.st.vIdx = e),
      (this.st.curWord = 0),
      (this.st.oneshot = null),
      (this.armed = null),
      (this.pendingWordInit = !1),
      this.clearGap(),
      "masked" === this.st.mode && this.ensureMaskState(a));
    let n = null === (r = a.audio) || void 0 === r ? void 0 : r.url;
    if (!n) {
      (this.toast(
        "No audio for verse ".concat(a.key, " from this reciter."),
      ),
        this.notify(),
        t && e < this.st.verses.length - 1
          ? setTimeout(() => {
              this.st.vIdx === e &&
                this.st.playing &&
                this.loadVerseAudio(e + 1, !0);
            }, 600)
          : ((this.st.playing = !1), this.notify()));
      return;
    }
    (this.setSrc(n),
      (this.audio.playbackRate = this.st.rate),
      (this.audio.muted = !!(null == s ? void 0 : s.muted)),
      this.armSeek(
        "number" == typeof (null == s ? void 0 : s.seekTo) ? s.seekTo : 0,
        !1,
      ),
      this.notify(),
      t &&
        ("word" === this.st.mode
          ? this.wordModePlayCurrent()
          : this.playAudio()));
  }
  togglePlay() {
    if ("relay" === this.st.mode) {
      this.relayTogglePlay();
      return;
    }
    if (this.st.playing) {
      this.pauseAudio();
      return;
    }
    if ("word" === this.st.mode) {
      this.wordModePlayCurrent();
      return;
    }
    this.audio.src
      ? this.playAudio()
      : this.loadVerseAudio(this.st.vIdx, !0);
  }
  prev() {
    if ("word" === this.st.mode) {
      this.stepWordManual(-1);
      return;
    }
    this.st.vIdx > 0
      ? ((this.st.loop = null),
        this.loadVerseAudio(this.st.vIdx - 1, this.st.playing))
      : this.armSeek(0, this.st.playing);
  }
  next() {
    if ("word" === this.st.mode) {
      this.stepWordManual(1);
      return;
    }
    this.st.vIdx < this.st.verses.length - 1 &&
      ((this.st.loop = null),
      this.loadVerseAudio(this.st.vIdx + 1, this.st.playing));
  }
  setRate(e) {
    if (this.st.rate === e || !RATES.includes(e)) return;
    ((this.st.rate = e), (this.audio.playbackRate = e), this.notify());
  }
  toggleVerseLoop() {
    if (!this.st.verseLoop && !this.requirePlus("repeats")) return;
    ((this.st.verseLoop = !this.st.verseLoop),
      this.toast(
        this.st.verseLoop
          ? "Repeating this verse until you turn it off"
          : "Verse repeat off",
      ),
      this.notify());
  }
  commitSeek(e) {
    if (isFinite(this.audio.duration))
      try {
        this.audio.currentTime = e * this.audio.duration;
      } catch (e) {}
    this.emitTime();
  }
  jumpToVerse(e) {
    ((this.st.loop = null), this.loadVerseAudio(e, !0));
  }
  setMode(e) {
    (e !== this.st.mode || "relay" === e) &&
      (this.stopAudio(),
      (this.st.loop = null),
      (this.st.pendingLoopStart = null),
      (this.st.oneshot = null),
      (this.st.wordStep = {
        active: !1,
        w: 1,
        playedTimes: 0,
        range: null,
      }),
      (this.st.mode = e),
      "masked" === e && (this.st.masked = {}),
      "relay" !== e && (this.st.relay = null),
      "verse" !== e &&
        ((this.st.style = "focus"), setStore(KEYS.style, "focus")),
      this.notify(),
      "relay" !== e && this.loadVerseAudio(this.st.vIdx, !1));
  }
  setStyle(e) {
    ((this.st.style = e),
      setStore(KEYS.style, e),
      (this.st.focusPhrase = 0));
    if ("mushaf" === e && "verse" !== this.st.mode) {
      ((this.st.mode = "verse"),
        (this.st.relay = null),
        (this.st.wordStep = {
          active: !1,
          w: 1,
          playedTimes: 0,
          range: null,
        }),
        this.loadVerseAudio(this.st.vIdx, !1));
    }
    this.notify();
  }
  setTajweed(e) {
    ((this.st.taj = e), setStore(KEYS.taj, e), this.notify());
  }
  setLayer() {
    /* Recurring phrases and near-twins are coming soon. */
  }
  setWordRepeat(e) {
    if (isPaidRepeat(e) && !this.requirePlus("repeats")) return;
    ((this.st.wordRepeat = e),
      setStore(KEYS.wordRepeat, e),
      this.notify());
  }
  setLoopCount(e) {
    if (isPaidRepeat(e) && !this.requirePlus("repeats")) return;
    ((this.st.loopCount = e), setStore(KEYS.loopCount, e), this.notify());
  }
  requirePlus(e) {
    if (this.plus) return !0;
    "function" == typeof this.onPlusRequired && this.onPlusRequired(e);
    return !1;
  }
  setPlus(e) {
    this.plus = !!e;
    if (e) {
      let t = getStore(KEYS.loopCount),
        s = getStore(KEYS.wordRepeat);
      (null != t && (this.st.loopCount = t),
        null != s && (this.st.wordRepeat = s),
        "focus" === getStore(KEYS.style) && (this.st.style = "focus"));
    } else this.clampFree();
    this.notify();
  }
  clampFree() {
    (isPaidRepeat(this.st.loopCount) && (this.st.loopCount = 2),
      isPaidRepeat(this.st.wordRepeat) && (this.st.wordRepeat = 2),
      (this.st.verseLoop = !1),
      (this.st.layers = { phrases: !1, confusables: !1 }),
      this.st.relay &&
        isPaidRelay(this.st.relay.order) &&
        ((this.st.relay = null),
        "relay" === this.st.mode && (this.st.mode = "verse")));
  }
  wordModePlayCurrent() {
    let e = this.currentVerse();
    if (!e) return;
    if (!this.segsForVerse(e)) {
      var t;
      if (null === (t = e.audio) || void 0 === t ? void 0 : t.url) {
        (this.setSrc(e.audio.url), (this.pendingWordInit = !0));
        return;
      }
      this.toast("No audio for this verse.");
      return;
    }
    let s = this.st.wordStep,
      r = s.w < 1 || s.w > e.words.length ? 1 : s.w;
    ((this.st.wordStep = { ...s, active: !0, w: r }),
      this.playWordOnce(e, r));
  }
  playWordOnce(e, t) {
    let s = segForWord(this.segsForVerse(e), t);
    if (!s) {
      this.wordStepEnded();
      return;
    }
    ((this.st.curWord = t),
      this.notify(),
      e.audio && this.setSrc(e.audio.url),
      (this.audio.muted = !1),
      (this.audio.playbackRate = this.st.rate),
      this.armSeek(s.start - 0.02, !0));
  }
  wordStepEnded() {
    if (this.wordGapTimer) return;
    (this.audio.pause(),
      (this.st.playing = !0),
      (this.st.wordStep = {
        ...this.st.wordStep,
        playedTimes: this.st.wordStep.playedTimes + 1,
      }),
      this.notify());
    let e = this.currentVerse();
    if (!e) return;
    let t = 380 / this.st.rate;
    this.wordGapTimer = setTimeout(() => {
      if (
        ((this.wordGapTimer = null),
        "word" !== this.st.mode || !this.st.wordStep.active)
      )
        return;
      if (
        0 === this.st.wordRepeat ||
        this.st.wordStep.playedTimes < this.st.wordRepeat
      ) {
        this.playWordOnce(e, this.st.wordStep.w);
        return;
      }
      ((this.st.wordStep = {
        ...this.st.wordStep,
        active: !1,
        playedTimes: 0,
      }),
        (this.st.playing = !1),
        this.notify());
    }, t);
  }
  stepWordManual(e) {
    let t = this.currentVerse();
    if (!t) return;
    let s = this.st.playing;
    (this.clearGap(),
      this.st.wordStep.range &&
        (this.st.wordStep = { ...this.st.wordStep, range: null }));
    let r =
      (this.st.wordStep.active || this.st.wordStep.w > 1
        ? this.st.wordStep.w
        : this.st.curWord || 1) + e;
    (r < 1
      ? this.st.vIdx > 0
        ? (this.loadVerseAudio(this.st.vIdx - 1, !1),
          (this.st.wordStep = {
            ...this.st.wordStep,
            w: this.currentVerse().words.length,
          }))
        : (this.st.wordStep = { ...this.st.wordStep, w: 1 })
      : r > t.words.length
        ? this.st.vIdx < this.st.verses.length - 1
          ? (this.loadVerseAudio(this.st.vIdx + 1, !1),
            (this.st.wordStep = { ...this.st.wordStep, w: 1 }))
          : (this.st.wordStep = {
              ...this.st.wordStep,
              w: t.words.length,
            })
        : (this.st.wordStep = { ...this.st.wordStep, w: r }),
      (this.st.wordStep = { ...this.st.wordStep, playedTimes: 0 }));
    let a = this.currentVerse();
    s
      ? ((this.st.wordStep = { ...this.st.wordStep, active: !0 }),
        this.segsForVerse(a)
          ? this.playWordOnce(a, this.st.wordStep.w)
          : this.wordModePlayCurrent())
        : ((this.st.curWord = this.st.wordStep.w), this.notify());
  }
  setDrillWord(e, t) {
    e !== this.st.vIdx && this.loadVerseAudio(e, !1);
    let s = this.st.playing;
    (this.clearGap(),
      (this.st.wordStep = {
        ...this.st.wordStep,
        w: t,
        playedTimes: 0,
        range: null,
        active: s,
      }),
      (this.st.curWord = t),
      this.notify());
    let r = this.currentVerse();
    s && r && this.playWordOnce(r, t);
  }
  ensureMaskState(e) {
    this.st.masked[e.key] ||
      (this.st.masked = {
        ...this.st.masked,
        [e.key]: { maxRev: 0, peeks: 3 },
      });
  }
  revealTo(e, t) {
    let s = this.st.masked[e.key];
    s &&
      t > s.maxRev &&
      (this.st.masked = {
        ...this.st.masked,
        [e.key]: { ...s, maxRev: t },
      });
  }
  peek() {
    let e = this.currentVerse();
    if (!e) return;
    this.ensureMaskState(e);
    let t = this.st.masked[e.key];
    if (t.peeks <= 0) {
      this.toast("No peeks left for this verse");
      return;
    }
    if (t.maxRev >= e.words.length) {
      this.toast("Everything is revealed");
      return;
    }
    this.peekTimer && clearTimeout(this.peekTimer);
    let s = e.key,
      n = t.maxRev + 1;
    ((this.st.masked = {
      ...this.st.masked,
      [s]: { maxRev: t.maxRev, peeks: t.peeks - 1, peekRev: n },
    }),
      this.notify());
    this.peekTimer = setTimeout(() => {
      let r = this.st.masked[s];
      r &&
        ((this.st.masked = {
          ...this.st.masked,
          [s]: { ...r, peekRev: 0 },
        }),
          this.notify());
    }, 1600);
  }
  maskStateFor(e) {
    let t = this.st.masked[e.key] || { maxRev: 0, peeks: 3, peekRev: 0 },
      s = t.peekRev || 0;
    return {
      maxRev: t.maxRev,
      peeks: t.peeks,
      reveal: Math.max(t.maxRev, s),
      peeking: s > t.maxRev,
    };
  }
  syncFocusPhrase(e, t) {
    let s = v(e).findIndex(
      (e) => t >= e[0].pos && t <= e[e.length - 1].pos,
    );
    s >= 0 && s !== this.st.focusPhrase && (this.st.focusPhrase = s);
  }
  stepPhrase(e) {
    this.st.loop = null;
    let t = this.currentVerse();
    if (!t) return;
    let s = v(t),
      r = this.st.focusPhrase + e;
    if (r < 0) {
      if (this.st.vIdx > 0) {
        let e = this.st.playing;
        if (
          (this.loadVerseAudio(this.st.vIdx - 1, !1),
          (this.st.focusPhrase = Math.max(
            0,
            v(this.currentVerse()).length - 1,
          )),
          this.notify(),
          e)
        ) {
          let e = v(this.currentVerse())[this.st.focusPhrase];
          e && this.playFromWord(e[0].pos);
        }
      }
      return;
    }
    if (r >= s.length) {
      this.st.vIdx < this.st.verses.length - 1 &&
        ((this.st.focusPhrase = 0),
        this.loadVerseAudio(this.st.vIdx + 1, this.st.playing));
      return;
    }
    ((this.st.focusPhrase = r), this.notify());
    let a = v(this.currentVerse())[this.st.focusPhrase];
    this.st.playing && a && this.playFromWord(a[0].pos);
  }
  loopPhrase() {
    let e =
        arguments.length > 0 && void 0 !== arguments[0]
          ? arguments[0]
          : 5,
      t = this.currentVerse();
    if (!t) return;
    let s = v(t)[this.st.focusPhrase];
    s &&
      (this.setLoop(
        this.st.vIdx,
        s[0].pos,
        s[s.length - 1].pos,
        e,
        "phrase ".concat(this.st.focusPhrase + 1),
      ),
      this.playFromWord(s[0].pos));
  }
  playFromWord(e) {
    var t;
    let s = this.currentVerse();
    if (
      !(null == s
        ? void 0
        : null === (t = s.audio) || void 0 === t
          ? void 0
          : t.url)
    ) {
      this.toast("No audio for this verse.");
      return;
    }
    (this.setSrc(s.audio.url),
      (this.audio.muted = !1),
      (this.audio.playbackRate = this.st.rate));
    let r = segForWord(this.segsForVerse(s), e);
    this.armSeek(r ? r.start - 0.02 : 0, !0);
  }
  setLoop(e, t, s, r, a) {
    if (isPaidRepeat(r) && !this.requirePlus("repeats")) return;
    ((this.st.oneshot = null),
      (this.st.loop = {
        vIdx: e,
        startW: t,
        endW: s,
        passes: r,
        pass: 0,
        label: a || "words ".concat(t, "–").concat(s),
      }),
      this.notify());
  }
  clearLoop() {
    ((this.st.loop = null), this.notify());
  }
  clearDrill() {
    ((this.st.wordStep = { ...this.st.wordStep, range: null }),
      this.notify());
  }
  startWordDrill(e, t) {
    ((this.st.wordStep = {
      ...this.st.wordStep,
      range: { startW: e, endW: t, passes: this.st.loopCount, pass: 0 },
      w: e,
      playedTimes: 0,
    }),
      this.notify(),
      this.wordModePlayCurrent());
  }
  playWordSlow(e, t) {
    ((this.oneshotRate = 0.75), this.playWordOneshot(e, t));
  }
  playWordOneshot(e, t) {
    if (
      ((this.st.loop = null),
      e !== this.st.vIdx && this.loadVerseAudio(e, !1),
      "word" === this.st.mode)
    ) {
      ((this.st.wordStep = { ...this.st.wordStep, w: t, playedTimes: 0 }),
        this.wordModePlayCurrent());
      return;
    }
    ((this.st.oneshot = { vIdx: e, endW: t }), this.playFromWord(t));
  }
  loopSingleWord(e, t, s) {
    if (
      (e !== this.st.vIdx && this.loadVerseAudio(e, !1),
      "word" === this.st.mode)
    ) {
      this.startWordDrill(t, t);
      return;
    }
    (this.setLoop(e, t, t, this.st.loopCount, s), this.playFromWord(t));
  }
  loopWordRange(e, t, s) {
    if (
      ((this.st.pendingLoopStart = null),
      e !== this.st.vIdx && this.loadVerseAudio(e, !1),
      "word" === this.st.mode)
    ) {
      this.startWordDrill(t, s);
      return;
    }
    (this.setLoop(
      e,
      t,
      s,
      this.st.loopCount,
      "words ".concat(t, "–").concat(s),
    ),
      this.playFromWord(t));
  }
  setPendingLoopStart(e, t) {
    ((this.st.pendingLoopStart = { vIdx: e, w: t }),
      this.notify(),
      this.toast("Range start set — now tap the last word"));
  }
  clearPendingLoopStart() {
    ((this.st.pendingLoopStart = null), this.notify());
  }
  async switchReciter(e, t) {
    if (e === this.st.reciterId) return;
    let s = this.st.playing,
      r = this.st.curWord;
    (this.pauseAudio(),
      (this.st.reciterId = e),
      setStore(KEYS.reciter, e),
      this.notify(),
      this.toast("Switching to ".concat(t, "…")));
    try {
      var a;
      let n = await this.ensureAudio(e);
      if (this.st.reciterId !== e) return;
      this.st.verses = attachAudio(this.st.verses, n);
      let i = this.currentVerse();
      if (
        null == i
          ? void 0
          : null === (a = i.audio) || void 0 === a
            ? void 0
            : a.url
      ) {
        (this.setSrc(i.audio.url),
          (this.audio.playbackRate = this.st.rate));
        let e = r ? segForWord(this.segsForVerse(i), r) : null;
        (this.armSeek(e ? e.start : 0, s), r && (this.st.curWord = r));
      } else
        i &&
          this.toast(
            "No audio for verse ".concat(i.key, " from ").concat(t),
          );
      this.notify();
    } catch (e) {
      this.toast("Could not switch reciter — check connection");
    }
  }
  async beginRelay(e, t, s, r) {
    if (isPaidRelay(e) && !this.requirePlus("relay-qaris")) return !1;
    if (isPaidRepeat(r) && !this.requirePlus("repeats")) return !1;
    let a = Array.from(
      new Set(
        e
          .filter((e) => "qari" === e.kind)
          .map((e) => e.reciterId)
          .concat(null != this.st.reciterId ? [this.st.reciterId] : []),
      ),
    );
    try {
      await Promise.all(a.map((e) => this.ensureAudio(e)));
    } catch (e) {
      this.toast("Could not load a reciter — using the main reciter");
    }
    let n = x(this.st.verses, t, s, e, 1, this.st.reciterId || 0);
    if (!n.length) return (this.toast("No verses in that range"), !1);
    ((this.st.mode = "relay"),
      (this.st.relay = {
        order: e,
        vFrom: t,
        vTo: s,
        rounds: r,
        round: 1,
        idx: 0,
        active: !0,
        waitingTap: !0,
        turns: n,
      }));
    let i = this.vIdxByKey(n[0].verseKey);
    return (i >= 0 && (this.st.vIdx = i), this.notify(), !0);
  }
  vIdxByKey(e) {
    return this.st.verses.findIndex((t) => t.key === e);
  }
  relayAudioFor(e) {
    return (
      (this.audioByReciter[this.audioKey(e.reciterId)] ||
        (null != this.st.reciterId
          ? this.audioByReciter[this.audioKey(this.st.reciterId)]
          : void 0) ||
        {})[e.verseKey] || null
    );
  }
  relayTogglePlay() {
    let e = this.st.relay;
    if (e && e.active) {
      if (this.st.playing) {
        this.pauseAudio();
        return;
      }
      if (
        !e.waitingTap &&
        this.audio.src &&
        this.audio.currentTime > 0 &&
        !this.audio.ended
      ) {
        this.playAudio();
        return;
      }
      ((this.st.relay = { ...e, waitingTap: !1 }),
        this.notify(),
        this.startRelayTurn(!1));
    }
  }
  startRelayTurn(e) {
    var t;
    let s = this.st.relay;
    if (!s || !s.active) return;
    let r = s.turns[s.idx];
    if (!r) return;
    let a = this.relayAudioFor(r),
      n = this.vIdxByKey(r.verseKey);
    if (!(null == a ? void 0 : a.url) || n < 0) {
      (this.toast("No audio for ".concat(r.verseKey, " — skipping")),
        this.advanceRelay());
      return;
    }
    let i = this.st.verses[n],
      l =
        (a.rawSegments
          ? attachAudio([i], { [i.key]: a })[0].audio.segments
          : null) ||
        (null === (t = i.audio) || void 0 === t ? void 0 : t.segments) ||
        null;
    ((this.st.verses = this.st.verses.map((e, t) =>
      t === n
        ? {
            ...e,
            audio: { url: a.url, segments: l },
            _est: null,
            _estDur: void 0,
          }
        : e,
    )),
      (this.st.vIdx = n),
      (this.st.curWord = 0));
    let o = "you" === r.kind && !e;
    (this.setSrc(a.url),
      (this.audio.muted = o),
      (this.audio.playbackRate = this.st.rate),
      this.armSeek(0, !0),
      (this.st.relay = { ...s, replaying: e && "you" === r.kind }),
      this.notify());
  }
  relayTurnEnded() {
    let e = this.st.relay;
    if (e && e.active) {
      if (e.replaying) {
        ((this.st.relay = { ...e, replaying: !1 }),
          this.startRelayTurn(!1));
        return;
      }
      this.advanceRelay();
    }
  }
  advanceRelay() {
    let e = this.st.relay;
    if (!e) return;
    this.audio.muted = !1;
    let t = e.idx + 1,
      s = e.round,
      r = e.turns;
    if (t >= e.turns.length) {
      if (((t = 0), (s = e.round + 1), 0 !== e.rounds && s > e.rounds)) {
        ((this.st.relay = { ...e, active: !1 }),
          this.stopAudio(),
          this.restoreMainAudio(),
          this.toast("Relay complete — well done"),
          this.setMode("verse"));
        return;
      }
      ((r = x(
        this.st.verses,
        e.vFrom,
        e.vTo,
        e.order,
        s,
        this.st.reciterId || 0,
      )),
        this.toast("Round ".concat(s, " — the order rotates")));
    }
    this.st.relay = { ...e, idx: t, round: s, turns: r };
    let a = this.vIdxByKey(r[t].verseKey);
    (a >= 0 && (this.st.vIdx = a),
      this.notify(),
      this.st.relay.waitingTap || this.startRelayTurn(!1));
  }
  exitRelay() {
    (this.stopAudio(),
      (this.st.relay = null),
      this.restoreMainAudio(),
      this.setMode("verse"));
  }
  pauseRelayForEdit() {
    (this.stopAudio(),
      this.st.relay && (this.st.relay = { ...this.st.relay, active: !1 }),
      this.notify());
  }
  destroy() {
    (this.peekTimer && clearTimeout(this.peekTimer),
      null !== this.rafId && cancelAnimationFrame(this.rafId),
      this.clearGap());
    try {
      (this.audio.pause(), (this.audio.src = ""));
    } catch (e) {}
    (this.listeners.clear(),
      this.timeListeners.clear(),
      this.toastListeners.clear());
  }
  constructor() {
    var e, t, s, r, a;
    if (
      ((this.listeners = new Set()),
      (this.timeListeners = new Set()),
      (this.toastListeners = new Set()),
      (this.rafId = null),
      (this.wordGapTimer = null),
      (this.armed = null),
      (this.srcFresh = !1),
      (this.playToken = 0),
      (this.pendingWordInit = !1),
      (this.loopEdgeAt = 0),
      (this.passageToken = 0),
      (this.oneshotRate = null),
      (this.peekTimer = null),
      (this.audioByReciter = {}),
      (this.doneVerses = new Set()),
      (this.subscribe = (e) => (
        this.listeners.add(e),
        () => this.listeners.delete(e)
      )),
      (this.getSnapshot = () => this.snap),
      (this.subscribeTime = (e) => (
        this.timeListeners.add(e),
        () => this.timeListeners.delete(e)
      )),
      (this.subscribeToast = (e) => (
        this.toastListeners.add(e),
        () => this.toastListeners.delete(e)
      )),
      (this.audio = "undefined" != typeof Audio ? new Audio() : {}),
      (this.plus = !1),
      (this.onPlusRequired = null),
      (this.st = {
        verses: [],
        passage: null,
        reciterId: null,
        translationName: "Translation",
        loading: !1,
        error: null,
        mode: "verse",
        style: getStore(KEYS.style) || "mushaf",
        rate: 1,
        vIdx: 0,
        curWord: 0,
        playing: !1,
        loop: null,
        verseLoop: !1,
        wordStep: { active: !1, w: 1, playedTimes: 0, range: null },
        oneshot: null,
        wordRepeat:
          null !== (e = getStore(KEYS.wordRepeat)) && void 0 !== e && !isPaidRepeat(e)
            ? e
            : 2,
        loopCount:
          null !== (t = getStore(KEYS.loopCount)) && void 0 !== t && !isPaidRepeat(t)
            ? t
            : 2,
        taj: !!getStore(KEYS.taj),
        layers: { phrases: !1, confusables: !1 },
        focusPhrase: 0,
        masked: {},
        relay: null,
        pendingLoopStart: null,
      }),
      (this.snap = { ...this.st }),
      "undefined" != typeof Audio)
    ) {
      let e =
        null === (a = navigator.connection) || void 0 === a
          ? void 0
          : a.saveData;
      ((this.audio.preload = e ? "metadata" : "auto"),
        this.bindAudioEvents());
    }
  }
}
function j(e, t, s) {
  let r = useRef(t);
  ((r.current = t),
    useEffect(() => {
      if (!e) return;
      let t = "overlay-".concat(Date.now()),
        a = !0;
      window.history.pushState({ __overlay: t }, "");
      let n = () => {
        ((a = !1), r.current());
      };
      return (
        window.addEventListener("popstate", n),
        () => {
          var e;
          (window.removeEventListener("popstate", n),
            (null == s || !s.current) &&
              a &&
              (null === (e = window.history.state) || void 0 === e
                ? void 0
                : e.__overlay) === t &&
              window.history.back());
        }
      );
    }, [e]));
}
function b(e) {
  let { engine: t, disabled: s } = e,
    n = useRef(null),
    i = useRef(null),
    l = useRef(null),
    o = useRef(null),
    d = useRef(null),
    c = useRef(!1),
    h = useRef(0),
    u = useRef(0),
    p = (e) => {
      let t = "".concat(Math.min(100, Math.max(0, 100 * e)), "%");
      (i.current && (i.current.style.width = t),
        l.current && (l.current.style.left = t));
    };
  useEffect(
    () =>
      t.subscribeTime((e, t) => {
        ((u.current = t),
          d.current && (d.current.textContent = fmtTime(t)),
          c.current ||
            (o.current && (o.current.textContent = fmtTime(e)),
            p(t > 0 ? e / t : 0)));
      }),
    [t],
  );
  let m = (e) => {
      let t = n.current;
      if (!t) return 0;
      let s = t.getBoundingClientRect();
      return Math.min(1, Math.max(0, (e - s.left) / s.width));
    },
    v = (e) => {
      (p(e),
        o.current &&
          u.current > 0 &&
          (o.current.textContent = fmtTime(e * u.current)));
    },
    x = () => {
      c.current && ((c.current = !1), t.commitSeek(h.current));
    };
  return _jsxs("div", {
    className: "seek-row",
    children: [
      _jsx("span", { className: "tm", ref: o, children: "0:00" }),
      _jsx("div", {
        className: "seekbar",
        ref: n,
        role: "slider",
        tabIndex: s ? -1 : 0,
        "aria-label": "Playback position",
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        "aria-valuenow": 0,
        onPointerDown: (e) => {
          if (!s) {
            c.current = !0;
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch (e) {}
            ((h.current = m(e.clientX)), v(h.current));
          }
        },
        onPointerMove: (e) => {
          c.current && ((h.current = m(e.clientX)), v(h.current));
        },
        onPointerUp: x,
        onPointerCancel: () => {
          c.current = !1;
        },
        onLostPointerCapture: x,
        onKeyDown: (e) => {
          if (s || u.current <= 0) return;
          let r =
            "ArrowLeft" === e.key
              ? -0.05
              : "ArrowRight" === e.key
                ? 0.05
                : 0;
          if (!r) return;
          e.preventDefault();
          let a = Math.min(1, Math.max(0, h.current + r));
          ((h.current = a), v(a), t.commitSeek(a));
        },
        children: _jsxs("div", {
          className: "track",
          children: [
            _jsx("div", { className: "fill", ref: i }),
            _jsx("div", { className: "thumb", ref: l }),
          ],
        }),
      }),
      _jsx("span", {
        className: "tm end",
        ref: d,
        children: "0:00",
      }),
    ],
  });
}
function ListenSheet(e) {
  let { engine: t, state: s, onClose: n, onPickMode: r } = e,
    { plus: plusOn, askPlus: ask } = usePlus(),
    u = "word" === s.mode,
    mushaf = "mushaf" === s.style,
    c = "relay" === s.mode;
  return _jsx(Sheet, {
    title: "Settings",
    onClose: n,
    children: _jsxs("div", {
      className: "listen-sheet",
      children: [
        _jsxs("div", {
            className: "listen-speeds",
            role: "group",
            "aria-label": "Speed",
            children: [
              _jsx("span", {
                className: "label-eyebrow",
                children: "Speed",
              }),
              _jsx("div", {
                className: "listen-speeds-seg",
                children: RATES.map((rate) =>
                  _jsx(
                    "button",
                    {
                      type: "button",
                      className: "tap".concat(s.rate === rate ? " on" : ""),
                      "aria-pressed": s.rate === rate,
                      onClick: () => t.setRate(rate),
                      children:
                        0.75 === rate ? "\xbe\xd7" : "".concat(rate, "\xd7"),
                    },
                    rate,
                  ),
                ),
              }),
            ],
          }),
        !u &&
          _jsxs("button", {
            type: "button",
            className: "listen-sheet-row tap".concat(
              s.verseLoop ? " on" : "",
            ),
            onClick: () => {
              if (!plusOn && !s.verseLoop) {
                (n(), ask("repeats"));
                return;
              }
              t.toggleVerseLoop();
            },
            "aria-pressed": !!s.verseLoop,
            disabled: c,
            children: [
              _jsxs("span", {
                className: "st",
                children: [
                  _jsx("b", { children: "Repeat" }),
                  _jsx("span", {
                    children: "Loop this verse until you turn it off",
                  }),
                ],
              }),
              _jsx("span", {
                className: "val",
                children: s.verseLoop ? "On" : "Off",
              }),
            ],
          }),
        !mushaf &&
        _jsxs("div", {
          children: [
            _jsx("span", {
              className: "label-eyebrow",
              children: "How to listen",
            }),
            _jsx("div", {
              className: "sheet-list",
              children: MODES.map((m) =>
                _jsxs(
                  "button",
                  {
                    type: "button",
                    className: "mode-opt".concat(s.mode === m.id ? " on" : ""),
                    onClick: () => r(m.id),
                    "aria-pressed": s.mode === m.id,
                    children: [
                      _jsxs("span", {
                        className: "mo-ic",
                        children: [_jsx(Icon, { name: m.icon, size: 19 })],
                      }),
                      _jsxs("span", {
                        className: "mo-t",
                        children: [
                          _jsx("b", { children: m.name }),
                          _jsx("span", { children: m.desc }),
                        ],
                      }),
                      _jsxs("span", {
                        className: "radio-dot",
                        children: [_jsx(Icon, { name: "check", size: 13 })],
                      }),
                    ],
                  },
                  m.id,
                ),
              ),
            }),
          ],
        }),
      ],
    }),
  });
}
function k(e) {
  let { engine: t, state: s, onPickMode: n } = e,
    [l] = useState(() => {
      var e;
      return (
        null === (e = getStore(KEYS.showTranslation)) || void 0 === e || e
      );
    }),
    d = l && "mushaf" === s.style ? s.verses[s.vIdx] : void 0,
    c = "relay" === s.mode,
    u = "word" === s.mode,
    [transOpen, setTransOpen] = useState(!1),
    [toolsOpen, setToolsOpen] = useState(!1),
    p = s.wordStep.range,
    m = s.loop
      ? {
          label: ""
            .concat(s.loop.label, " \xb7 pass ")
            .concat(
              Math.min(s.loop.pass + 1, s.loop.passes || s.loop.pass + 1),
            )
            .concat(
              s.loop.passes
                ? " of ".concat(s.loop.passes)
                : " \xb7 until stopped",
            ),
          clear: () => t.clearLoop(),
        }
      : p
        ? {
            label: "Drill: words "
              .concat(p.startW, "–")
              .concat(p.endW, " \xb7 pass ")
              .concat(Math.min(p.pass + 1, p.passes || p.pass + 1))
              .concat(
                p.passes
                  ? " of ".concat(p.passes)
                  : " \xb7 until stopped",
              ),
            clear: () => t.clearDrill(),
          }
        : null;
  return _jsxs(_Fragment, {
    children: [
  _jsxs("footer", {
    className: "player-foot",
    children: [
      (null == d ? void 0 : d.translation) &&
        _jsxs("button", {
          type: "button",
          className: "trans-dock tap".concat(transOpen ? "" : " compact"),
          onClick: () => setTransOpen((e) => !e),
          "aria-expanded": transOpen,
          "aria-label": "Translation",
        children: [
            _jsxs("div", {
              className: "trans-meta",
              children: [
                _jsx("b", { children: d.key.replace(":", " : ") }),
                _jsx("span", {
                  children: s.translationName,
                }),
              ],
            }),
            _jsx("p", {
              className: transOpen ? "" : "trans-clamp",
              children: d.translation,
            }),
          ],
        }),
      m &&
        _jsxs("div", {
          className: "loop-chip",
          children: [
            _jsx(Icon, {
              name: "repeat",
              size: 15,
              style: { color: "var(--action-primary)", flex: "none" },
            }),
            _jsx("span", { children: m.label }),
            _jsx("button", {
              className: "tap",
              onClick: m.clear,
              "aria-label": "Stop repeating",
              children: _jsx(Icon, {
                name: "x",
                size: 15,
                style: { color: "var(--text-muted)" },
              }),
            }),
          ],
        }),
      _jsxs("div", {
        className: "player-tools",
        children: [
          !u && _jsx(b, { engine: t, disabled: c }),
          _jsxs("button", {
            type: "button",
            className: "listen-menu-btn tap".concat(toolsOpen ? " open" : ""),
            "aria-expanded": toolsOpen,
            "aria-haspopup": "dialog",
            onClick: () => setToolsOpen(!0),
            "aria-label": "Settings",
            children: [
              _jsx(Icon, {
                name: "sliders-horizontal",
                size: 16,
              }),
              "Settings",
            ],
          }),
        ],
      }),
      _jsxs("div", {
        className: "transport",
        children: [
          _jsx("button", {
            className: "tr-btn tap",
            onClick: () => t.prev(),
            "aria-label": u ? "Previous word" : "Previous verse",
            children: _jsx(Icon, {
              name: u ? "chevron-right" : "skip-back",
              size: u ? 24 : 22,
            }),
          }),
          _jsx("button", {
            className: "play-btn",
            onClick: () => t.togglePlay(),
            "aria-label": s.playing ? "Pause" : "Play",
            children: _jsx(Icon, {
              name: s.playing ? "pause" : "play",
              size: 26,
            }),
          }),
          _jsx("button", {
            className: "tr-btn tap",
            onClick: () => t.next(),
            "aria-label": u ? "Next word" : "Next verse",
            children: _jsx(Icon, {
              name: u ? "chevron-left" : "skip-forward",
              size: u ? 24 : 22,
            }),
          }),
        ],
      }),
    ],
  }),
      toolsOpen &&
        _jsx(ListenSheet, {
          engine: t,
          state: s,
          onClose: () => setToolsOpen(!1),
          onPickMode: (e) => {
            (setToolsOpen(!1), n(e));
          },
        }),
    ],
  });
}
function N(e) {
  let {
      title: t,
      subtitle: s,
      qariName: a,
      mode: i,
      style: l,
      onStyle: d,
      onQari: c,
      onEditRelay: h,
      matchLabel: u = null,
      backLabel: p = null,
    } = e,
    m = useRouter(),
    x = "relay" === i;
  return _jsxs("header", {
    className: "player-head",
    children: [
      _jsxs("button", {
        className: "icon-btn sm tap".concat(p ? " labelled" : ""),
        onClick: () => (p ? m.back() : m.push("/")),
        "aria-label": p ? "Back to ".concat(p) : "Back to passage list",
        children: [
          _jsx(Icon, { name: "chevron-left", size: 19 }),
          p && _jsx("span", { children: p }),
        ],
      }),
      _jsxs("div", {
        className: "ttl",
        children: [
          _jsx("h1", { children: t }),
          u &&
            _jsx("span", { className: "match-chip", children: u }),
          x
            ? _jsx("span", { className: "sub", children: s })
            : _jsxs("button", {
                className: "qari-pill tap",
                onClick: c,
                "aria-label": "Reciter: ".concat(a, ". Change reciter"),
                children: [
                  _jsx(Icon, {
                    name: "mic",
                    size: 11,
                    style: {
                      color: "var(--action-primary)",
                      flex: "none",
                    },
                  }),
                  _jsx("span", { children: a }),
                  _jsx(Icon, {
                    name: "chevron-down",
                    size: 12,
                    style: { color: "var(--text-muted)", flex: "none" },
                  }),
                ],
              }),
        ],
      }),
      x &&
        h &&
        _jsxs("button", {
          onClick: h,
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 10px",
            borderRadius: "var(--radius-button)",
            border: "1px solid var(--border-default)",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--text-secondary)",
            flex: "none",
          },
          children: [
            _jsx(Icon, { name: "settings-2", size: 14 }),
            "Edit",
          ],
        }),
    ],
  });
}
function PlayerViewBar(e) {
  let { style: t, onStyle: s } = e;
  return _jsxs("div", {
    className: "player-view",
    children: [
      _jsx("span", { className: "player-view-label", children: "View" }),
      _jsx("div", {
        className: "style-toggle",
        role: "group",
        "aria-label": "Reading view",
        children: ["mushaf", "focus"].map((e) =>
          _jsx(
            "button",
            {
              className: t === e ? "on" : "",
              onClick: () => s(e),
              "aria-pressed": t === e,
              children: "mushaf" === e ? "Mushaf" : "Focus",
            },
            e,
          ),
        ),
      }),
    ],
  });
}
function I(e) {
  return 0 === e ? "∞" : "\xd7".concat(e);
}
function S(e) {
  var t, s, n, i, l;
  let {
      word: d,
      target: c,
      loopCount: u,
      isWordRangeMode: p,
      onSetCount: m,
      onPlayWord: v,
      onLoopWord: x,
      onStartRange: f,
      onClose: y,
      annotation: g,
      onOpenPhrase: j,
      onOpenConfusable: w,
    } = e,
    b = useRef(null),
    [k, N] = useState(null),
    { plus: plusOn, askPlus: ask } = usePlus();
  (useLayoutEffect(() => {
    var e, t;
    let s =
        null !==
          (t =
            null === (e = b.current) || void 0 === e
              ? void 0
              : e.offsetHeight) && void 0 !== t
          ? t
          : 240,
      r = c.rect,
      a = Math.min(
        window.innerWidth - 262 - 10,
        Math.max(10, r.left + r.width / 2 - 131),
      ),
      n = r.bottom + 12,
      i = n + s > window.innerHeight - 12;
    N({ top: i ? Math.max(10, r.top - s - 12) : n, left: a, flipped: i });
  }, [c]),
    useEffect(() => {
      var e, t;
      let s = (e) => {
        "Escape" === e.key && y();
      };
      return (
        document.addEventListener("keydown", s),
        null === (t = b.current) ||
          void 0 === t ||
          null === (e = t.querySelector("button")) ||
          void 0 === e ||
          e.focus(),
        () => document.removeEventListener("keydown", s)
      );
    }, [y]));
  let S = p ? "Drill" : "Loop";
  return _jsx("div", {
    className: "pop-wrap",
    onClick: y,
    children: _jsxs("div", {
      className: "popover",
      ref: b,
      role: "dialog",
      "aria-label": "Study ".concat(d.ar),
      onClick: (e) => e.stopPropagation(),
      style: {
        top:
          null !== (s = null == k ? void 0 : k.top) && void 0 !== s
            ? s
            : -9999,
        left:
          null !== (n = null == k ? void 0 : k.left) && void 0 !== n
            ? n
            : 0,
        visibility: k ? "visible" : "hidden",
      },
      children: [
        _jsx("span", {
          className: "p-arrow ".concat(
            (null == k ? void 0 : k.flipped) ? "down" : "up",
          ),
          style: {
            left: Math.min(
              242,
              Math.max(
                20,
                c.rect.left +
                  c.rect.width / 2 -
                  (null !== (i = null == k ? void 0 : k.left) &&
                  void 0 !== i
                    ? i
                    : 0),
              ),
            ),
          },
        }),
        _jsxs("div", {
          className: "p-word",
          children: [
            _jsx("span", { className: "ar", children: d.ar }),
            d.tr &&
              _jsx("span", { className: "tr", children: d.tr }),
            _jsx("span", {
              className: "gl",
              children: d.gloss || "—",
            }),
          ],
        }),
        _jsxs("div", {
          className: "p-repeat",
          children: [
            _jsx("span", { id: "rep-lbl", children: "Repeat" }),
            _jsx("div", {
              className: "seg",
              role: "group",
              "aria-labelledby": "rep-lbl",
              children: LOOP_COUNTS.map((e) => {
                let locked = isPaidRepeat(e) && !plusOn;
                return _jsx(
                  "button",
                  {
                    className: ""
                      .concat(u === e ? "on" : "")
                      .concat(locked ? " locked" : ""),
                    onClick: () => (locked ? ask("repeats") : m(e)),
                    "aria-pressed": u === e,
                    style:
                      0 === e
                        ? { fontFamily: "var(--font-body)", fontSize: 14 }
                        : void 0,
                    children: locked
                      ? _jsxs("span", {
                          style: {
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                          },
                          children: [
                            I(e),
                            _jsx(Icon, { name: "sparkles", size: 11 }),
                          ],
                        })
                      : I(e),
                  },
                  e,
                );
              }),
            }),
          ],
        }),
        _jsxs("div", {
          className: "p-actions",
          children: [
            _jsxs("button", {
              className: "sec",
              onClick: v,
              children: [
                _jsx(Icon, {
                  name: "volume-2",
                  size: 15,
                  style: { color: "var(--action-primary)" },
                }),
                "Play this word",
              ],
            }),
            _jsxs("button", {
              className: "pri",
              onClick: x,
              children: [
                _jsx(Icon, { name: "repeat", size: 15 }),
                S,
                " this word ",
                I(u),
              ],
            }),
          ],
        }),
        _jsxs("button", {
          className: "p-tertiary",
          onClick: f,
          children: [
            _jsx(Icon, { name: "brackets", size: 14 }),
            "Start ",
            S.toLowerCase(),
            " range here",
          ],
        }),
        /* Recurring phrases and near-twins are coming soon. */
      ],
    }),
  });
}
function T(e) {
  let { layers: t, counts: s, onToggle: n } = e,
    [i, l] = useState(!1);
  return (j(i, () => l(!1)), s.phrases || s.confusables)
    ? _jsxs("div", {
        className: "layer-bar",
        role: "group",
        "aria-label": "Annotation layers",
        children: [
          _jsx(Icon, {
            name: "layers",
            size: 15,
            style: { color: "var(--text-muted)", flex: "none" },
          }),
          _jsx("span", {
            className: "lb-label",
            children: "Layers",
          }),
          s.phrases > 0 &&
            _jsxs("button", {
              className: "layer-chip recurring-chip".concat(
                t.phrases ? " on" : "",
              ),
              onClick: () => n("phrases", !t.phrases),
              "aria-pressed": t.phrases,
              children: [
                t.phrases &&
                  _jsx(Icon, { name: "check", size: 12 }),
                "Recurring \xb7 ",
                s.phrases,
              ],
            }),
          s.confusables > 0 &&
            _jsxs("button", {
              className: "layer-chip confusable-chip".concat(
                t.confusables ? " on" : "",
              ),
              onClick: () => n("confusables", !t.confusables),
              "aria-pressed": t.confusables,
              children: [
                t.confusables &&
                  _jsx(Icon, { name: "check", size: 12 }),
                "Near-twins \xb7 ",
                s.confusables,
              ],
            }),
          _jsx("button", {
            className: "tap",
            onClick: () => l(!0),
            "aria-label": "What do the markers mean?",
            style: {
              color: "var(--text-muted)",
              flex: "none",
              marginLeft: "auto",
              display: "inline-flex",
            },
            children: _jsx(Icon, { name: "info", size: 15 }),
          }),
          i &&
            _jsxs(Sheet, {
              title: "Reading markers",
              onClose: () => l(!1),
              children: [
                _jsxs("div", {
                  className: "marker-legend",
                  children: [
                    _jsxs("div", {
                      className: "ml-row",
                      children: [
                        _jsx("span", {
                          className: "ml-sample",
                          children: _jsx("span", {
                            className:
                              "w recurring recurring-start recurring-end",
                            children: "مُّسْتَقِيمٍ",
                          }),
                        }),
                        _jsxs("span", {
                          className: "ml-text",
                          children: [
                            _jsx("b", {
                              children: "Recurring phrase",
                            }),
                            _jsx("span", {
                              children:
                                "This wording appears in other places in the Quran. Tap it to see every occurrence — including where the wording differs slightly, the classic wrong-turn point when reciting from memory.",
                            }),
                          ],
                        }),
                      ],
                    }),
                    _jsxs("div", {
                      className: "ml-row",
                      children: [
                        _jsx("span", {
                          className: "ml-sample",
                          children: _jsx("span", {
                            className: "w confusable",
                            children: "لِتُنذِرَ",
                          }),
                        }),
                        _jsxs("span", {
                          className: "ml-text",
                          children: [
                            _jsx("b", {
                              children: "Near-twin word",
                            }),
                            _jsx("span", {
                              children:
                                "Looks almost identical to a different word elsewhere. Tap it to compare the two side by side.",
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                _jsx("p", {
                  style: {
                    fontSize: 12,
                    color: "var(--text-muted)",
                    lineHeight: 1.45,
                  },
                  children:
                    "Markers never change the text — they only sit under it. Switch either layer off with the chips above, or in Settings.",
                }),
              ],
            }),
        ],
      })
    : null;
}
let R = {
    NOUN: "noun",
    NOUN_PROP: "proper noun",
    NOUN_NUM: "number",
    NOUN_QUANT: "quantifier",
    ADJ: "adjective",
    ADJ_COMP: "comparative adjective",
    ADJ_NUM: "ordinal",
    PV: "perfect verb",
    IV: "imperfect verb",
    CV: "imperative verb",
    PV_PASS: "perfect verb, passive",
    IV_PASS: "imperfect verb, passive",
    PRON: "pronoun",
    DEM_PRON: "demonstrative",
    REL_PRON: "relative pronoun",
    ADV: "adverb",
    VERB: "verb",
    PART: "particle",
    PREP: "preposition",
    CONJ: "conjunction",
  },
  P = (e) => R[e] || e.toLowerCase().replace(/_/g, " ");
function W(e) {
  let {
      mark: t,
      verseKey: s,
      gloss: n,
      transliteration: i,
      onPlayWord: l,
      onGo: d,
      onClose: h,
    } = e,
    u = t.with[0],
    [p, m] = useState({});
  return (
    useEffect(() => {
      let e = !1;
      for (let s of t.with) {
        let t = "".concat(s.at, ":").concat(s.atPos);
        fetchTransliteration(s.at, s.atPos).then((s) => {
          !e && s && m((e) => ({ ...e, [t]: s }));
        });
      }
      return () => {
        e = !0;
      };
    }, [t]),
    _jsxs(Sheet, {
      title: "Confusable word",
      onClose: h,
      icon: _jsx("span", {
        className: "sheet-tile confusable-tile",
        children: _jsx(Icon, { name: "git-compare", size: 16 }),
      }),
      children: [
        _jsxs("div", {
          className: "twin-card this-word",
          children: [
            _jsxs("span", {
              className: "tc-body",
              children: [
                _jsxs("span", {
                  className: "kicker",
                  children: ["This word \xb7 ", s],
                }),
                _jsxs("span", {
                  className: "glyph",
                  children: [
                    _jsx("span", {
                      className: "ar",
                      children: t.w,
                    }),
                    i &&
                      _jsx("span", {
                        className: "tr",
                        children: i,
                      }),
                  ],
                }),
                _jsxs("span", {
                  className: "gloss",
                  children: [
                    n ? "“".concat(n, "”") : "—",
                    t.pos ? " — ".concat(P(t.pos)) : "",
                  ],
                }),
              ],
            }),
            _jsx("button", {
              className: "twin-play",
              onClick: l,
              "aria-label": "Play ".concat(t.w),
              children: _jsx(Icon, {
                name: "volume-2",
                size: 18,
              }),
            }),
          ],
        }),
        _jsxs("div", {
          className: "twin-divider",
          children: [
            _jsx("i", {}),
            _jsx("span", { children: "LOOKS LIKE" }),
            _jsx("i", {}),
          ],
        }),
        t.with.map((e, s) =>
          _jsxs(
            "button",
            {
              className: "twin-card",
              onClick: () =>
                d(e.at, e.atPos, e.atPos, s + 1, t.with.length),
              style: { textAlign: "left", width: "100%" },
              children: [
                _jsxs("span", {
                  className: "tc-body",
                  children: [
                    _jsxs("span", {
                      className: "kicker",
                      children: [
                        "Twin \xb7 ",
                        e.at,
                        e.n > 1
                          ? " \xb7 ".concat(e.n, " occurrences")
                          : "",
                      ],
                    }),
                    _jsxs("span", {
                      className: "glyph",
                      children: [
                        _jsx("span", {
                          className: "ar",
                          children: e.w,
                        }),
                        p["".concat(e.at, ":").concat(e.atPos)] &&
                          _jsx("span", {
                            className: "tr",
                            children:
                              p["".concat(e.at, ":").concat(e.atPos)],
                          }),
                      ],
                    }),
                    _jsxs("span", {
                      className: "gloss",
                      children: [
                        e.pos ? P(e.pos) : "different root",
                        " \xb7 open ",
                        e.at,
                        " to read its translation",
                      ],
                    }),
                  ],
                }),
                _jsx(Icon, {
                  name: "chevron-left",
                  size: 16,
                  style: { color: "var(--text-muted)", flex: "none" },
                }),
              ],
            },
            s,
          ),
        ),
        !u &&
          _jsx("p", {
            style: { fontSize: 13, color: "var(--text-muted)" },
            children: "No near-twin recorded for this word.",
          }),
        _jsxs("div", {
          className: "pending-note",
          children: [
            _jsx(Icon, { name: "file-clock", size: 22 }),
            _jsx("b", { children: "Study note pending review" }),
            _jsx("p", {
              children:
                "Verified translations are linked above. The scholarly note on how to keep these apart is reviewed before it appears.",
            }),
          ],
        }),
      ],
    })
  );
}
function A(e) {
  let { groups: t, hereKey: s, hereText: a, onGo: n, onClose: i } = e;
  return t[0]
    ? _jsxs(Sheet, {
        title: "Recurring phrase",
        onClose: i,
        maxHeight: "88dvh",
        icon: _jsx("span", {
          className: "sheet-tile recurring-tile",
          children: _jsx(Icon, { name: "git-compare", size: 16 }),
        }),
        children: [
          t.map((e) => {
            var i, l;
            let { id: d, mark: c, group: h } = e,
              u = h.occ.length,
              p =
                null !==
                  (l =
                    null === (i = h.occ.find((e) => e.k === s)) ||
                    void 0 === i
                      ? void 0
                      : i.x) && void 0 !== l
                  ? l
                  : "",
              m = p.split(/\s+/).filter(Boolean),
              v = (e) => {
                let t = e.split(/\s+/).filter(Boolean);
                return t.map((e, s) =>
                  _jsxs(
                    "span",
                    {
                      className: m[s] && m[s] !== e ? "diff" : void 0,
                      children: [e, s < t.length - 1 ? " " : ""],
                    },
                    s,
                  ),
                );
              };
            return _jsxs(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                },
                children: [
                  t.length > 1 &&
                    _jsxs("span", {
                      className: "label-eyebrow",
                      children: [
                        "Phrase ",
                        t.indexOf(t.find((e) => e.id === d)) + 1,
                        " of ",
                        t.length,
                      ],
                    }),
                  _jsxs("div", {
                    className: "phrase-hero",
                    children: [
                      _jsx("div", {
                        className: "ar",
                        children: a || "—",
                      }),
                      _jsxs("div", {
                        className: "sub",
                        children: [
                          "appears in ",
                          u,
                          " ",
                          1 === u ? "place" : "places",
                          " \xb7 ",
                          h.surahs,
                          " ",
                          1 === h.surahs ? "surah" : "surahs",
                          c.v ? " \xb7 this one is a near-variant" : "",
                        ],
                      }),
                    ],
                  }),
                  _jsx("div", {
                    className: "sheet-list",
                    style: { gap: 8 },
                    children: h.occ.map((e, t) => {
                      let a = e.k === s,
                        i = !!p && !!e.x && e.x !== p;
                      return _jsxs(
                        "button",
                        {
                          className: "occ-row".concat(a ? " here" : ""),
                          onClick: () =>
                            !a &&
                            n(e.k, e.f, e.t, t + 1, h.occ.length, d),
                          disabled: a,
                          children: [
                            _jsx("span", {
                              className: "ref",
                              children: e.k,
                            }),
                            _jsxs("span", {
                              className: "snippet",
                              children: ["…", v(e.x)],
                            }),
                            a
                              ? _jsx("span", {
                                  className: "here-tag",
                                  children: "Here",
                                })
                              : i
                                ? _jsx("span", {
                                    className: "variant-chip",
                                    children: "Variant",
                                  })
                                : _jsx(Icon, {
                                    name: "chevron-left",
                                    size: 16,
                                    style: {
                                      color: "var(--text-muted)",
                                      flex: "none",
                                    },
                                  }),
                          ],
                        },
                        "".concat(e.k, "-").concat(t),
                      );
                    }),
                  }),
                ],
              },
              d,
            );
          }),
          _jsxs("div", {
            className: "info-line",
            children: [
              _jsx(Icon, { name: "info", size: 13 }),
              "A common wrong-turn point when reciting from memory.",
            ],
          }),
        ],
      })
    : null;
}
let z = [
  { value: 1, label: "Once" },
  { value: 2, label: "\xd72", numeral: !0 },
  { value: 4, label: "\xd74", numeral: !0 },
  { value: 0, label: "Until I stop" },
];
function M(e) {
  var t, s, n, l, d, c, h, u;
  let {
      verses: p,
      defaultReciterId: m,
      initial: v,
      onStart: x,
      onClose: f,
    } = e,
    { recitations: y, reciterName: g } = useAppData(),
    j =
      null !==
        (n = null === (t = p[0]) || void 0 === t ? void 0 : t.number) &&
      void 0 !== n
        ? n
        : 1,
    w =
      null !==
        (l =
          null === (s = p[p.length - 1]) || void 0 === s
            ? void 0
            : s.number) && void 0 !== l
        ? l
        : 1,
    [b, k] = useState(
      null !== (d = null == v ? void 0 : v.order) && void 0 !== d
        ? d
        : [{ kind: "qari", reciterId: m }, { kind: "you" }],
    ),
    [N, I] = useState(
      null !== (c = null == v ? void 0 : v.vFrom) && void 0 !== c ? c : j,
    ),
    [S, T] = useState(
      null !== (h = null == v ? void 0 : v.vTo) && void 0 !== h ? h : w,
    ),
    [R, P] = useState(
      null !== (u = null == v ? void 0 : v.rounds) && void 0 !== u
        ? u
        : 2,
    ),
    [W, A] = useState(!1),
    { plus: plusOn, askPlus: ask } = usePlus(),
    L = (e, t) => {
      let s = e + t;
      if (s < 0 || s >= b.length) return;
      let r = b.slice(),
        a = r[e];
      ((r[e] = r[s]), (r[s] = a), k(r));
    };
  return _jsxs(Sheet, {
    title: "Relay setup",
    onClose: f,
    maxHeight: "86dvh",
    children: [
      _jsx("span", {
        className: "label-eyebrow",
        children: "Turn order",
      }),
      _jsx("div", {
        className: "sheet-list",
        children: b.map((e, t) => {
          let s = "you" === e.kind ? "You (paced)" : g(e.reciterId);
          return _jsxs(
            "div",
            {
              className: "order-row".concat(
                "you" === e.kind ? " you" : "",
              ),
              children: [
                _jsx(Icon, {
                  name: "grip-vertical",
                  size: 17,
                  style: { color: "var(--text-muted)", flex: "none" },
                }),
                _jsx("span", {
                  className: "order-avatar",
                  children: _jsx(Icon, {
                    name: "you" === e.kind ? "user" : "mic",
                    size: 16,
                  }),
                }),
                _jsxs("label", {
                  className: "order-name",
                  children: [
                    s,
                    _jsxs("select", {
                      "aria-label": "Participant ".concat(t + 1),
                      value:
                        "you" === e.kind
                          ? "you"
                          : "q".concat(e.reciterId),
                      onChange: (e) => {
                        let s = e.target.value,
                          r = b.slice();
                        ((r[t] =
                          "you" === s
                            ? { kind: "you" }
                            : {
                                kind: "qari",
                                reciterId: Number(s.slice(1)),
                              }),
                          isPaidRelay(r) && !plusOn
                            ? ask("relay-qaris")
                            : k(r));
                      },
                      children: [
                        _jsx("option", {
                          value: "you",
                          children: "You (paced)",
                        }),
                        _jsx("optgroup", {
                          label: "Qaris",
                          children: y.map((e) =>
                            _jsx(
                              "option",
                              {
                                value: "q".concat(e.id),
                                children: e.name,
                              },
                              e.id,
                            ),
                          ),
                        }),
                      ],
                    }),
                  ],
                }),
                _jsx("button", {
                  className: "tap",
                  onClick: () => L(t, -1),
                  disabled: 0 === t,
                  "aria-label": "Move ".concat(s, " up"),
                  style: {
                    color: "var(--text-muted)",
                    opacity: 0 === t ? 0.3 : 1,
                  },
                  children: _jsx(Icon, {
                    name: "chevron-up",
                    size: 16,
                  }),
                }),
                _jsx("button", {
                  className: "tap",
                  onClick: () => L(t, 1),
                  disabled: t === b.length - 1,
                  "aria-label": "Move ".concat(s, " down"),
                  style: {
                    color: "var(--text-muted)",
                    opacity: t === b.length - 1 ? 0.3 : 1,
                  },
                  children: _jsx(Icon, {
                    name: "chevron-down",
                    size: 16,
                  }),
                }),
                _jsx("button", {
                  className: "tap",
                  onClick: () => {
                    b.length <= 1 || k(b.filter((e, s) => s !== t));
                  },
                  disabled: b.length <= 1,
                  "aria-label": "Remove ".concat(s),
                  style: {
                    color: "var(--text-muted)",
                    opacity: b.length <= 1 ? 0.3 : 1,
                  },
                  children: _jsx(Icon, { name: "x", size: 16 }),
                }),
              ],
            },
            t,
          );
        }),
      }),
      _jsxs("button", {
        className: "btn-dashed".concat(!plusOn ? " locked" : ""),
        onClick: () => {
          let next = [...b, { kind: "qari", reciterId: m }];
          if (isPaidRelay(next) && !plusOn) {
            ask("relay-qaris");
            return;
          }
          k(next);
        },
        children: [
          _jsx(Icon, { name: plusOn ? "plus" : "sparkles", size: 16 }),
          plusOn ? "Add participant" : "Add another reciter",
        ],
      }),
      _jsx("div", {
        style: { display: "flex", gap: 12 },
        children: [
          { label: "From", value: N, set: I },
          { label: "To", value: S, set: T },
        ].map((e) => {
          var t;
          return _jsxs(
            "label",
            {
              className: "range-field",
              children: [
                _jsx("span", {
                  className: "label-eyebrow",
                  children: e.label,
                }),
                _jsxs("span", {
                  className: "select-box",
                  children: [
                    null === (t = p[0]) || void 0 === t
                      ? void 0
                      : t.key.split(":")[0],
                    ":",
                    e.value,
                    _jsx(Icon, {
                      name: "chevron-down",
                      size: 15,
                      style: { color: "var(--text-muted)" },
                    }),
                    _jsx("select", {
                      "aria-label": "".concat(e.label, " verse"),
                      value: e.value,
                      onChange: (t) => {
                        let s = Number(t.target.value);
                        (e.set(s),
                          "From" === e.label && S < s && T(s),
                          "To" === e.label && s < N && I(s));
                      },
                      children: p.map((e) =>
                        _jsx(
                          "option",
                          { value: e.number, children: e.key },
                          e.number,
                        ),
                      ),
                    }),
                  ],
                }),
              ],
            },
            e.label,
          );
        }),
      }),
      _jsxs("div", {
        children: [
          _jsx("span", {
            className: "label-eyebrow",
            children: "Rounds",
          }),
          _jsx("div", {
            className: "rounds-row",
            style: { marginTop: 6 },
            role: "group",
            "aria-label": "Rounds",
            children: z.map((e) => {
              let locked = isPaidRepeat(e.value) && !plusOn;
              return _jsx(
                "button",
                {
                  className: ""
                    .concat(R === e.value ? "on" : "")
                    .concat(locked ? " locked" : ""),
                  onClick: () => (locked ? ask("repeats") : P(e.value)),
                  "aria-pressed": R === e.value,
                  style: 0 === e.value ? { fontSize: 12 } : void 0,
                  children: locked
                    ? _jsxs("span", {
                        style: {
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        },
                        children: [
                          e.label,
                          _jsx(Icon, { name: "sparkles", size: 11 }),
                        ],
                      })
                    : e.label,
                },
                e.value,
              );
            }),
          }),
        ],
      }),
      _jsx("button", {
        className: "btn-primary",
        disabled: W,
        onClick: async () => {
          (A(!0), await x(b, N, S, R), A(!1));
        },
        children: W
          ? _jsxs(_Fragment, {
              children: [
                _jsx("span", {
                  className: "spinner",
                  style: { width: 18, height: 18, borderWidth: 2 },
                }),
                "Preparing reciters…",
              ],
            })
          : _jsxs(_Fragment, {
              children: [
                _jsx(Icon, { name: "play", size: 18 }),
                "Start relay",
              ],
            }),
      }),
    ],
  });
}
let D = memo(function (e) {
  let {
      word: t,
      vIdx: s,
      taj: a,
      isCur: n,
      inRange: i,
      isRangeStart: l,
      isRangeEnd: o,
      isPending: d,
      mask: c,
      interactive: h,
      isArrived: u,
      annotation: p,
      onTap: m,
      onHold: y,
    } = e,
    holdTimer = useRef(null),
    held = useRef(!1),
    holdStart = useRef({ x: 0, y: 0 }),
    clearHold = () => {
      holdTimer.current &&
        (clearTimeout(holdTimer.current), (holdTimer.current = null));
    },
    v = ["w"];
  useEffect(
    () => () => {
      holdTimer.current && clearTimeout(holdTimer.current);
    },
    [],
  );
  (n && v.push("cur"),
    i && v.push("inrange"),
    l && v.push("range-start"),
    o && v.push("range-end"),
    d && v.push("pending"),
    "hidden" === c && v.push("masked"),
    "revealed" === c && v.push("revealed"),
    u && v.push("arrived"),
    (null == p ? void 0 : p.phrase) &&
      "hidden" !== c &&
      (v.push("recurring"),
      p.phrase.v && v.push("recurring-variant"),
      p.phraseStart && v.push("recurring-start"),
      p.phraseEnd && v.push("recurring-end")),
    (null == p ? void 0 : p.confusable) &&
      "hidden" !== c &&
      v.push("confusable"));
  let x =
      "hidden" === c
        ? null
        : (function (e, t) {
            if (!t) return null;
            if (void 0 === e._tj) {
              var s;
              e._tj = e.taj
                ? tajToSpans(e.taj)
                : null !== (s = e.tajHTML) && void 0 !== s
                  ? s
                  : null;
            }
            return e._tj ? { html: e._tj } : null;
          })(t, a),
    f = {
      className: v.join(" "),
      "data-v": s,
      "data-w": t.pos,
      "data-cur": n ? "1" : void 0,
      "data-arrived": u ? "1" : void 0,
    };
  return h
    ? _jsx("span", {
        ...f,
        role: "button",
        tabIndex: 0,
        "aria-label": ""
          .concat(t.ar)
          .concat(t.gloss ? " — ".concat(t.gloss) : ""),
        onPointerDown: (e) => {
          if (!y || ("mouse" === e.pointerType && 0 !== e.button)) return;
          ((held.current = !1),
            (holdStart.current = { x: e.clientX, y: e.clientY }));
          let n = e.currentTarget;
          holdTimer.current = setTimeout(() => {
            ((holdTimer.current = null),
              (held.current = !0),
              y(s, t.pos, n));
          }, 480);
        },
        onPointerMove: (e) => {
          holdTimer.current &&
            (Math.abs(e.clientX - holdStart.current.x) > 10 ||
              Math.abs(e.clientY - holdStart.current.y) > 10) &&
            clearHold();
        },
        onPointerUp: clearHold,
        onPointerCancel: clearHold,
        onPointerLeave: clearHold,
        onContextMenu: (e) => {
          y &&
            (e.preventDefault(),
            e.stopPropagation(),
            (held.current = !0),
            clearHold(),
            y(s, t.pos, e.currentTarget));
        },
        onClick: (e) => {
          if ((e.stopPropagation(), held.current)) {
            held.current = !1;
            return;
          }
          null == m || m(s, t.pos, e.currentTarget);
        },
        onKeyDown: (e) => {
          ("Enter" === e.key || " " === e.key) &&
            (e.preventDefault(),
            e.stopPropagation(),
            null == m || m(s, t.pos, e.currentTarget));
        },
        ...(x ? { dangerouslySetInnerHTML: { __html: x.html } } : {}),
        children: x ? void 0 : t.ar,
      })
    : x
      ? _jsx("span", {
          ...f,
          dangerouslySetInnerHTML: { __html: x.html },
        })
      : _jsx("span", { ...f, children: t.ar });
});
function F(e) {
  let { state: s, onWordTap: a, onWordHold: n } = e,
    i = s.verses[s.vIdx];
  if (!i) return null;
  let u = i.words
    .map((e) => e.gloss)
    .filter(Boolean)
    .join(" \xb7 ");
  return _jsx(FocusStage, {
    title: i.key,
    meta:
      s.verses.length > 1
        ? "".concat(s.vIdx + 1, " of ", s.verses.length)
        : undefined,
    hint: "Practise this verse",
    progress:
      s.verses.length > 1
        ? {
            now: s.vIdx + 1,
            max: s.verses.length,
            label: "Verse",
          }
        : undefined,
    gloss: wantsTranslation() ? u || i.translation || null : null,
    children: i.words.map((e) => {
      var t;
      return _jsx(
        D,
        {
          word: e,
          vIdx: s.vIdx,
          taj: !1,
          isCur: e.pos === s.curWord,
          inRange: !1,
          isRangeStart: !1,
          isRangeEnd: !1,
          isPending:
            (null === (t = s.pendingLoopStart) || void 0 === t
              ? void 0
              : t.w) === e.pos,
          mask: null,
          interactive: !0,
          onTap: a,
          onHold: n,
        },
        e.pos,
      );
    }),
  });
}
let O = memo(function (e) {
  let {
      verse: t,
      vIdx: s,
      taj: n,
      curWord: i,
      done: l,
      rangeStart: o,
      rangeEnd: d,
      pendingPos: c,
      revealUpTo: h,
      masked: u,
      interactive: p,
      annotations: m,
      arrivedFrom: v = 0,
      arrivedTo: x = 0,
      onWordTap: y,
      onWordHold: b,
      onMarkTap: g,
    } = e,
    j = new Map();
  for (let e of t.marks) {
    if ("end" === e.kind || /^[\d٠-٩۰-۹]/.test(e.ar)) continue;
    let t = j.get(e.afterPos) || [];
    (t.push(e.ar), j.set(e.afterPos, t));
  }
  return _jsxs("span", {
    className: "v".concat(l ? " done" : ""),
    "data-vi": s,
    children: [
      t.words.map((e) => {
        var t;
        let l = o > 0 && e.pos >= o && e.pos <= d,
          f = u ? (e.pos <= h ? "revealed" : "hidden") : null,
          g = null == m ? void 0 : m.get(e.pos),
          w =
            u || null == g || !g.phrase || g.phraseEnd || j.get(e.pos)
              ? null
              : g.phrase;
        return _jsxs(
          _Fragment,
          {
            children: [
              _jsx(D, {
                word: e,
                vIdx: s,
                taj: n,
                isCur: e.pos === i,
                inRange: l,
                isRangeStart: l && e.pos === o,
                isRangeEnd: l && e.pos === d,
                isPending: c === e.pos,
                mask: f,
                interactive: p,
                isArrived: v > 0 && e.pos >= v && e.pos <= x,
                annotation: null == m ? void 0 : m.get(e.pos),
                onTap: y,
                onHold: b,
              }),
              null === (t = j.get(e.pos)) || void 0 === t
                ? void 0
                : t.map((e, t) =>
                    _jsx(
                      "span",
                      {
                        style: { color: "var(--text-muted)" },
                        children: e,
                      },
                      t,
                    ),
                  ),
              w
                ? _jsx("span", {
                    className: "recurring-join".concat(
                      w.v ? " variant" : "",
                    ),
                    children: " ",
                  })
                : " ",
            ],
          },
          e.pos,
        );
      }),
      _jsx("span", {
        className: "vmark",
        role: g ? "button" : void 0,
        tabIndex: g ? 0 : void 0,
        "aria-label": g ? "Play verse ".concat(t.key) : void 0,
        onClick: g ? () => g(s) : void 0,
        onKeyDown: g
          ? (e) => {
              ("Enter" === e.key || " " === e.key) &&
                (e.preventDefault(), g(s));
            }
          : void 0,
        children: toArabicDigits(t.number),
      }),
      " ",
    ],
  });
});
function _(e) {
  let { engine: t, state: s, annFor: a } = e,
    n = s.verses[s.vIdx];
  if (!n) return null;
  let i = t.maskStateFor(n),
    l = n.words.length,
    c = i.maxRev >= l;
  return _jsx(FocusStage, {
    title: "Revealed ".concat(i.maxRev, " of ", l),
    meta: n.key,
    hint: "Words stay covered until the audio reaches them",
    progress: {
      now: i.maxRev,
      max: l,
      label: "Words revealed",
    },
    actions: _jsxs("button", {
      className: "focus-act primary",
      onClick: () => t.peek(),
      disabled: i.peeks <= 0 || c,
      children: [
        _jsx(Icon, { name: "eye", size: 16 }),
        c ? "Verse revealed" : i.peeking ? "Peeking" : "Peek \xb7 ".concat(i.peeks, " left"),
      ],
    }),
    gloss: wantsTranslation() ? n.translation || null : null,
    children: _jsx(O, {
      verse: n,
      vIdx: s.vIdx,
      taj: s.taj,
      curWord: s.curWord,
      done: !1,
      rangeStart: 0,
      rangeEnd: 0,
      pendingPos: 0,
      revealUpTo: i.reveal,
      masked: !0,
      interactive: !1,
      annotations: a(n.number),
    }),
  });
}
function q(e, t, s) {
  var r;
  return s && s.vIdx === e
    ? { start: s.start, end: s.end, pending: s.end }
    : t.loop && t.loop.vIdx === e
      ? { start: t.loop.startW, end: t.loop.endW, pending: 0 }
      : "word" === t.mode && t.wordStep.range && e === t.vIdx
        ? {
            start: t.wordStep.range.startW,
            end: t.wordStep.range.endW,
            pending: 0,
          }
        : {
            start: 0,
            end: 0,
            pending:
              (null === (r = t.pendingLoopStart) || void 0 === r
                ? void 0
                : r.vIdx) === e
                ? t.pendingLoopStart.w
                : 0,
          };
}
function H(e) {
  let {
      engine: t,
      state: s,
      onWordTap: n,
      selection: i,
      annFor: l,
      arrived: o,
    } = e,
    d = useRef(null);
  (s.verses[s.vIdx],
    useEffect(() => {
      var e;
      let t =
          null === (e = d.current) || void 0 === e
            ? void 0
            : e.querySelector('[data-cur="1"]'),
        s = d.current;
      if (!t || !s) return;
      let r = t.getBoundingClientRect(),
        a = s.getBoundingClientRect();
      (r.top < a.top + 48 || r.bottom > a.bottom - 48) &&
        t.scrollIntoView({ block: "center", behavior: "smooth" });
    }, [s.curWord, s.vIdx]),
    useEffect(() => {
      var e;
      if (!o) return;
      let t =
        null === (e = d.current) || void 0 === e
          ? void 0
          : e.querySelector('[data-arrived="1"]');
      null == t ||
        t.scrollIntoView({ block: "center", behavior: "smooth" });
    }, [o, s.verses]));
  let c = s.passage,
    h = !!c && 1 === c.from && 1 !== c.chapter && 9 !== c.chapter;
  return _jsx("div", {
    ref: d,
    className: "player-body",
    style: { padding: "16px 20px 6px" },
    children: _jsxs("div", {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        minHeight: 0,
      },
      children: [
        h &&
          _jsx("div", {
            className: "basmala",
            children: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
          }),
        _jsx("div", {
          className: "mushaf",
          children: s.verses.map((e, a) => {
            let d = q(a, s, i);
            return _jsx(
              O,
              {
                verse: e,
                vIdx: a,
                taj: s.taj,
                curWord: a === s.vIdx ? s.curWord : 0,
                done: t.isVerseDone(a),
                rangeStart: d.start,
                rangeEnd: d.end,
                pendingPos: d.pending,
                revealUpTo: 0,
                masked: !1,
                interactive: !0,
                annotations: l(e.number),
                arrivedFrom:
                  (null == o ? void 0 : o.verse) === e.number
                    ? o.from
                    : 0,
                arrivedTo:
                  (null == o ? void 0 : o.verse) === e.number ? o.to : 0,
                onWordTap: n,
                onMarkTap: (e) => t.jumpToVerse(e),
              },
              e.key,
            );
          }),
        }),
      ],
    }),
  });
}
function K(e) {
  let { engine: t, state: s, annFor: a } = e,
    { reciterName: n } = useAppData(),
    l = s.relay;
  if (!l) return null;
  let d = l.turns[l.idx],
    c = s.verses[s.vIdx];
  if (!d || !c) return null;
  let h = "you" === d.kind,
    u = l.turns.length - l.idx,
    p =
      0 === l.rounds
        ? "Round ".concat(l.round)
        : "Round ".concat(l.round, " of ").concat(l.rounds);
  return _jsx(FocusStage, {
    title: p,
    meta: h
      ? "Your turn \xb7 ".concat(u, " left")
      : "".concat(u, " ", 1 === u ? "turn" : "turns", " left"),
    hint: h ? "Recite aloud — the reciter plays muted to pace you" : undefined,
    extra: _jsx("ol", {
      className: "relay-queue",
      "aria-label": "Turn order",
      children: l.turns.map((e, t) => {
        let s = t < l.idx,
          a = t === l.idx,
          i = "you" === e.kind ? "You" : n(e.reciterId).split(" ")[0];
        return _jsxs(
          "li",
          {
            className: "turn-chip"
              .concat(s ? " done" : "")
              .concat(a ? " now" : ""),
            "aria-current": a ? "step" : void 0,
            children: [
              _jsxs("span", {
                className: "turn-avatar",
                children: [
                  _jsx(Icon, {
                    name: "you" === e.kind ? "user" : "mic",
                    size: 14,
                  }),
                  s &&
                    _jsx("span", {
                      className: "turn-check",
                      children: _jsx(Icon, {
                        name: "check",
                        size: 9,
                      }),
                    }),
                ],
              }),
              !s &&
                _jsxs("span", {
                  className: "turn-text",
                  children: [
                    _jsx("b", { children: i }),
                    _jsx("span", {
                      children: e.verseKey.split(":")[1],
                    }),
                  ],
                }),
            ],
          },
          "".concat(e.verseKey, "-").concat(t),
        );
      }),
    }),
    actions: h
      ? _jsxs(_Fragment, {
          children: [
            _jsxs("button", {
              className: "focus-act primary",
              onClick: () => t.startRelayTurn(!0),
              children: [
                _jsx(Icon, { name: "volume-2", size: 16 }),
                "Replay reciter",
              ],
            }),
            _jsxs("button", {
              className: "focus-act",
              onClick: () => t.advanceRelay(),
              children: [
                _jsx(Icon, { name: "skip-forward", size: 16 }),
                "Skip my turn",
              ],
            }),
          ],
        })
      : null,
    gloss: wantsTranslation() ? c.translation || null : null,
    context: h
      ? undefined
      : ""
          .concat(n(d.reciterId), " recites verse ")
          .concat(d.verseKey.split(":")[1])
          .concat(l.waitingTap ? " — tap play to begin" : ""),
    children: _jsx(O, {
      verse: c,
      vIdx: s.vIdx,
      taj: s.taj,
      curWord: s.curWord,
      done: !1,
      rangeStart: 0,
      rangeEnd: 0,
      pendingPos: 0,
      revealUpTo: 0,
      masked: !1,
      interactive: !1,
      annotations: a(c.number),
    }),
  });
}
function G(e) {
  let { engine: t, state: i, onWordTap: l } = e,
    { plus: plusOn, askPlus: ask } = usePlus(),
    h = i.verses[i.vIdx];
  if (!h) return null;
  let m = i.wordStep.w || i.curWord || 1,
    w = h.words.find((e) => e.pos === m) || h.words[0],
    y = w
      ? [w.tr, w.gloss].filter(Boolean).join(" \xb7 ")
      : "";
  return _jsx(FocusStage, {
    title: w ? w.ar : "Drill",
    meta: h.key,
    hint: "Tap the word you want, then play",
    extra: _jsxs("div", {
      className: "rep-seg seg",
      role: "group",
      "aria-label": "Replay this word",
      children: [
        _jsx("span", {
          className: "label-eyebrow",
          children: "Replay",
        }),
        LOOP_COUNTS.map((count) => {
          let locked = isPaidRepeat(count) && !plusOn;
          return _jsx(
            "button",
            {
              type: "button",
              className: ""
                .concat(i.wordRepeat === count ? "on" : "")
                .concat(locked ? " locked" : ""),
              onClick: () =>
                locked ? ask("repeats") : t.setWordRepeat(count),
              "aria-pressed": i.wordRepeat === count,
              children: locked
                ? _jsxs("span", {
                    style: {
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                    },
                    children: [
                      I(count),
                      _jsx(Icon, { name: "sparkles", size: 11 }),
                    ],
                  })
                : I(count),
            },
            count,
          );
        }),
      ],
    }),
    gloss: wantsTranslation() ? y || null : null,
    children: h.words.map((e) =>
      _jsx(
        D,
        {
          word: e,
          vIdx: i.vIdx,
          taj: !1,
          isCur: e.pos === m,
          inRange: !1,
          isRangeStart: !1,
          isRangeEnd: !1,
          isPending: !1,
          mask: null,
          interactive: !0,
          onTap: l,
        },
        e.pos,
      ),
    ),
  });
}
function U(e) {
  var t, s, m, v, x, f, y, b, I, C, R, P;
  let {
      chapter: z,
      from: V,
      to: D,
      reciterParam: O,
      focus: q = null,
      cameFrom: B = null,
      heldAt: U = null,
      matchOf: Q = null,
    } = e,
    Y = useRouter(),
    J = useSearchParams(),
    X = J.get("focus"),
    Z = (() => {
      if (!X) return q;
      let [e, t, s] = X.split("-").map(Number);
      if (!e) return q;
      let r = t && t > 0 ? t : 1;
      return { verse: e, from: r, to: s && s >= r ? s : r };
    })(),
    $ = null !== (x = J.get("back")) && void 0 !== x ? x : B,
    ee = J.get("held") ? Number(J.get("held")) : U,
    et = null !== (f = J.get("match")) && void 0 !== f ? f : Q,
    es = J.get("g"),
    er = J.get("mode"),
    ea = J.get("at"),
    {
      chapters: en,
      status: ei,
      reciterId: el,
      setReciterId: eo,
      reciterName: ed,
      pushRecent: ec,
    } = useAppData(),
    { showToast: eh } = useToast(),
    { plus: plusOn, askPlus: ask } = usePlus(),
    [eu] = useState(() => new g()),
    [ep, em] = useState("loading"),
    [ev, ex] = useState(!1),
    [ef, ey] = useState(!1),
    [eg, ej] = useState(!1),
    [ew, eb] = useState(!1),
    [ek, eN] = useState(null),
    [eI, eS] = useState(null),
    [eC, eT] = useState(null),
    [eR, eP] = useState(Z),
    [eW, eA] = useState(null),
    [eL, eE] = useState(null),
    ez = useSyncExternalStore(
      eu.subscribe,
      eu.getSnapshot,
      eu.getSnapshot,
    ),
    eM = null != O ? O : el,
    eV = !!(ek || ef || eg || ew || eW || eL),
    eD = useCallback(() => {
      (eN(null), ey(!1), ej(!1), eb(!1), eA(null), eE(null));
    }, []),
    eF = useRef(!1);
  j(eV, eD, eF);
  let eO = en.find((e) => e.id === z),
    e_ =
      null !== (y = null == eO ? void 0 : eO.name_simple) && void 0 !== y
        ? y
        : "Surah ".concat(z),
    eq = ""
      .concat(e_, " ")
      .concat(V)
      .concat(D > V ? "–".concat(D) : "");
  (useEffect(() => () => eu.destroy(), [eu]),
    useEffect(() => eu.subscribeToast(eh), [eu, eh]),
    useEffect(() => {
      ((eu.onPlusRequired = ask), eu.setPlus(plusOn));
    }, [eu, plusOn, ask]),
    useEffect(() => {
      null != O && O !== el && eo(O);
    }, [O, el, eo]),
    useEffect(() => {
      if ("ready" !== ei || null == eM) return;
      let e = !1;
      (em("loading"), ex(!1));
      let t = setTimeout(() => !e && ex(!0), 5e3);
      return (
        fetchPassage(z, V, D)
          .then(async (t) => {
            let { verses: s, translationName: r } = t;
            if (!e) {
              if (!s.length) throw Error("empty passage");
              (await eu.openPassage(
                { chapter: z, from: V, to: D, name: e_ },
                eM,
                s,
                r,
              ),
                e ||
                  (em("ready"),
                  ec({
                    chapter: z,
                    from: V,
                    to: D,
                    name: e_,
                    reciter: ed(eM),
                  })));
            }
          })
          .catch(() => {
            e || em("error");
          })
          .finally(() => clearTimeout(t)),
        () => {
          ((e = !0), clearTimeout(t), eu.stopAudio());
        }
      );
    }, [z, V, D, eM, ei, eu]));
  let eH = useCallback(
      (e, t, s) => {
        let r = eu.getSnapshot(),
          a = r.pendingLoopStart;
        if (a) {
          if (a.vIdx === e && a.w !== t) {
            (eS({
              vIdx: e,
              start: Math.min(a.w, t),
              end: Math.max(a.w, t),
            }),
              eN(null));
            return;
          }
          if (a.vIdx !== e) {
            var n;
            eh(
              "A range stays inside one verse — pick a second word in ".concat(
                null === (n = r.verses[a.vIdx]) || void 0 === n
                  ? void 0
                  : n.key,
                ".",
              ),
            );
          }
          return;
        }
        if ("word" === r.mode) {
          (eS(null), eu.setDrillWord(e, t));
          return;
        }
        if ("mushaf" === r.style) {
          eu.playWordOneshot(e, t);
          return;
        }
        eu.playWordOneshot(e, t);
      },
      [eu, eh],
    ),
    eHold = useCallback((e, t, s) => {
      let r = eu.getSnapshot();
      if (
        r.pendingLoopStart ||
        "mushaf" === r.style ||
        "word" === r.mode
      )
        return;
      (eS(null),
        eN({ vIdx: e, pos: t, rect: s.getBoundingClientRect() }));
    }, [eu]),
    eK = useMemo(() => {
      var e, t;
      return ek &&
        null !==
          (t =
            null === (e = ez.verses[ek.vIdx]) || void 0 === e
              ? void 0
              : e.words.find((e) => e.pos === ek.pos)) &&
        void 0 !== t
        ? t
        : null;
    }, [ek, ez.verses]);
  (useEffect(() => {
    eP(Z);
  }, [null != X ? X : ""]),
    useEffect(() => {
      if ("ready" !== ep || !eR) return;
      let e = ez.verses.findIndex((e) => e.number === eR.verse);
      e >= 0 && e !== ez.vIdx && eu.loadVerseAudio(e, !1);
    }, [ep, eR, ez.verses.length]),
    useEffect(() => {
      if ("ready" !== ep) return;
      let e =
        er && ["word", "verse", "masked", "relay"].includes(er)
          ? er
          : "verse";
      e !== eu.getSnapshot().mode &&
        (eu.setMode(e), "relay" === e && eb(!0));
    }, [ep, er]),
    useEffect(() => {
      if ("ready" !== ep || !ea) return;
      let e = eu
        .getSnapshot()
        .verses.findIndex((e) => e.number === Number(ea));
      e > 0 && eu.loadVerseAudio(e, !1);
    }, [ep, ea]),
    useEffect(() => {
      var e;
      if ("ready" !== ep || !ez.passage) return;
      let t = ez.verses[ez.vIdx],
        s = null !== (e = ez.reciterId) && void 0 !== e ? e : eM;
      t &&
        null != s &&
        (upsertSession({
          chapter: z,
          from: V,
          to: D,
          name: e_,
          reciterId: s,
          reciterName: ed(s),
          verse: t.number,
          updatedAt: Date.now(),
        }),
        markToday());
    }, [ep, ez.vIdx, ez.reciterId]),
    useEffect(() => {
      let e = (e) => {
        let t = e.target;
        (t &&
          ("INPUT" === t.tagName ||
            "SELECT" === t.tagName ||
            "TEXTAREA" === t.tagName ||
            "BUTTON" === t.tagName ||
            t.isContentEditable)) ||
          document.querySelector(".sheet, .popover") ||
          (" " === e.key
            ? (e.preventDefault(), eu.togglePlay())
            : "ArrowRight" === e.key
              ? eu.next()
              : "ArrowLeft" === e.key && eu.prev());
      };
      return (
        window.addEventListener("keydown", e),
        () => window.removeEventListener("keydown", e)
      );
    }, [eu]),
    useEffect(() => {
      if (!("mediaSession" in navigator)) return;
      let e = ez.verses[ez.vIdx];
      if (ez.passage && e)
        try {
          ((navigator.mediaSession.metadata = new MediaMetadata({
            title: "".concat(ez.passage.name, " ").concat(e.key),
            artist: ed(ez.reciterId),
            album: APP_NAME,
            artwork: [
              {
                src: "/icon-512.png",
                sizes: "512x512",
                type: "image/png",
              },
            ],
          })),
            (navigator.mediaSession.playbackState = ez.playing
              ? "playing"
              : "paused"),
            navigator.mediaSession.setActionHandler("play", () =>
              eu.togglePlay(),
            ),
            navigator.mediaSession.setActionHandler("pause", () =>
              eu.togglePlay(),
            ),
            navigator.mediaSession.setActionHandler("previoustrack", () =>
              eu.prev(),
            ),
            navigator.mediaSession.setActionHandler("nexttrack", () =>
              eu.next(),
            ));
        } catch (e) {}
    }, [
      eu,
      ez.passage,
      ez.vIdx,
      ez.playing,
      ez.reciterId,
      ez.verses,
      ed,
    ]));
  let eB = useMemo(() => {
      let e = new Map();
      if (!eC) return e;
      for (let t of ez.verses)
        e.set(
          t.number,
          (function (e, t, s) {
            let r = new Map();
            if (!e) return r;
            let a = String(t);
            if (s.phrases)
              for (let t of e.phrases[a] || [])
                for (let e = t.f; e <= t.t; e++) {
                  let s = r.get(e) || {};
                  (s.phrase ||
                    ((s.phrase = t),
                    (s.phraseStart = e === t.f),
                    (s.phraseEnd = e === t.t)),
                    r.set(e, s));
                }
            if (s.confusables)
              for (let t of e.confusables[a] || []) {
                let e = r.get(t.p) || {};
                ((e.confusable = t), r.set(t.p, e));
              }
            return r;
          })(eC, t.number, ez.layers),
        );
      return e;
    }, [eC, ez.verses, ez.layers]),
    eG = useCallback((e) => eB.get(e), [eB]),
    eU = useMemo(() => {
      let e = 0,
        t = 0;
      if (eC)
        for (let s of ez.verses)
          ((e += (eC.phrases[String(s.number)] || []).length),
            (t += (eC.confusables[String(s.number)] || []).length));
      return { phrases: e, confusables: t };
    }, [eC, ez.verses]),
    eQ = (e, t) => {
      (eN(null), eA({ vIdx: e, pos: t }));
    },
    eY = (e, t, s, r, a, n) => {
      let [i, l] = e.split(":").map(Number);
      if (!i || !l) return;
      (eA(null), eE(null));
      let o = t && t > 0 ? t : 0,
        d = s && s >= (o || 1) ? s : o,
        c = ez.verses.findIndex((t) => t.key === e);
      if (c >= 0) {
        (eu.loadVerseAudio(c, !1), o && eP({ verse: l, from: o, to: d }));
        return;
      }
      let h = Math.max(1, l - 1),
        u = l + 1,
        p = new URLSearchParams({ from: String(h), to: String(u) });
      if (
        (ez.reciterId && p.set("reciter", String(ez.reciterId)),
        o && p.set("focus", "".concat(l, "-").concat(o, "-").concat(d)),
        $)
      )
        (p.set("back", $), ee && p.set("held", String(ee)));
      else {
        var m;
        let e = ez.passage;
        e &&
          p.set(
            "back",
            ""
              .concat(e.name, " ")
              .concat(e.from)
              .concat(e.to > e.from ? "–".concat(e.to) : ""),
          );
        let t =
          null === (m = ez.verses[ez.vIdx]) || void 0 === m
            ? void 0
            : m.number;
        t && p.set("held", String(t));
      }
      (r && a && p.set("match", "".concat(r, "-").concat(a)),
        n && p.set("g", n),
        (eF.current = !0),
        Y.replace("/read/".concat(i, "?").concat(p.toString())));
    },
    eJ = async (e, t, s, r) => {
      (await eu.beginRelay(e, t, s, r)) && eb(!1);
    };
  if ("error" === ei || "error" === ep)
    return _jsxs("main", {
      className: "shell",
      id: "main",
      children: [
        _jsx(N, {
          title: eq,
          qariName: ed(eM),
          mode: "verse",
          style: ez.style,
          onStyle: () => {},
          onQari: () => {},
        }),
        _jsx(OfflineBanner, {}),
        $ &&
          _jsxs("div", {
            className: "return-bar",
            children: [
              _jsx("span", {
                className: "rb-icon",
                children: _jsx(Icon, { name: "pause", size: 14 }),
              }),
              _jsxs("span", {
                className: "rb-text",
                children: [
                  _jsxs("b", {
                    children: [
                      $,
                      ee ? " \xb7 held at verse ".concat(ee) : "",
                    ],
                  }),
                  _jsx("span", {
                    children: "Comparing elsewhere — nothing lost",
                  }),
                ],
              }),
              _jsxs("button", {
                className: "rb-return",
                onClick: () => Y.back(),
                children: [
                  _jsx(Icon, {
                    name: "corner-up-left",
                    size: 14,
                  }),
                  "Return",
                ],
              }),
            ],
          }),
        _jsxs("div", {
          className: "status-block",
          children: [
            _jsx("div", {
              className: "status-medallion",
              children: _jsx(Icon, {
                name: "volume-x",
                size: 34,
              }),
            }),
            _jsxs("div", {
              style: { display: "flex", flexDirection: "column", gap: 8 },
              children: [
                _jsx("h2", {
                  children: "Can’t reach the recitation",
                }),
                _jsx("p", {
                  children:
                    "This passage couldn’t be loaded. Check your connection and try again — your place is saved.",
                }),
              ],
            }),
            _jsxs("div", {
              className: "status-actions",
              children: [
                _jsxs("button", {
                  className: "btn-primary",
                  onClick: () => Y.refresh(),
                  children: [
                    _jsx(Icon, { name: "rotate-cw", size: 17 }),
                    "Try again",
                  ],
                }),
                _jsxs("button", {
                  className: "btn-secondary",
                  onClick: () => Y.push("/"),
                  children: [
                    _jsx(Icon, {
                      name: "chevron-left",
                      size: 16,
                    }),
                    "Choose another passage",
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  if ("loading" === ep || "loading" === ei)
    return _jsxs("main", {
      className: "shell",
      id: "main",
      children: [
        _jsx(N, {
          title: eq,
          qariName: ed(eM),
          mode: "verse",
          style: ez.style,
          onStyle: () => {},
          onQari: () => {},
        }),
        _jsx(OfflineBanner, {}),
        _jsxs("div", {
          className: "status-block",
          children: [
            _jsx("div", { className: "spinner" }),
            _jsx("p", {
              children: ev
                ? "Still loading — the connection looks slow."
                : "Loading passage…",
            }),
          ],
        }),
      ],
    });
  let eX = {
      engine: eu,
      state: ez,
      onWordTap: eH,
      onWordHold: eHold,
      selection: eI,
      annFor: eG,
      arrived: eR,
    },
    eZ =
      "relay" === ez.mode &&
      (null === (t = ez.relay) || void 0 === t ? void 0 : t.active)
        ? _jsx(K, { ...eX })
        : "masked" === ez.mode
          ? _jsx(_, { ...eX })
          : "word" === ez.mode
            ? _jsx(G, { ...eX })
            : "focus" === ez.style
              ? _jsx(F, { ...eX })
              : _jsx(H, { ...eX }),
    e$ = ez.relay
      ? "Relay \xb7 ".concat(ez.relay.order.length, " participants")
      : void 0;
  return _jsxs("main", {
    className: "shell player",
    id: "main",
    children: [
      _jsxs("div", {
        className: "player-chrome",
        children: [
          _jsx(N, {
            title: eq,
            subtitle: e$,
            qariName: ed(
              null !== (b = ez.reciterId) && void 0 !== b ? b : eM,
            ),
            mode: ez.mode,
            style: ez.style,
            onStyle: (e) => eu.setStyle(e),
            onQari: () => ej(!0),
            matchLabel:
              eR && es && (null == eC ? void 0 : eC.groups[es])
                ? (() => {
                    let e = eC.groups[es].occ,
                      t = e.findIndex(
                        (e) =>
                          e.k === "".concat(z, ":").concat(eR.verse) &&
                          e.f === eR.from,
                      );
                    return t >= 0
                      ? "Match ".concat(t + 1, " of ").concat(e.length)
                      : null;
                  })()
                : et
                  ? "Match "
                      .concat(et.split("-")[0], " of ")
                      .concat(et.split("-")[1])
                  : null,
            backLabel: $ ? $.split(" ")[0] : null,
            onEditRelay: () => {
              (eu.pauseRelayForEdit(), eb(!0));
            },
          }),
          _jsx(PlayerViewBar, {
            style: ez.style,
            onStyle: (e) => eu.setStyle(e),
          }),
        ],
      }),
      _jsx(OfflineBanner, {}),
      eR &&
        $ &&
        _jsxs("div", {
          className: "return-bar",
          children: [
            _jsx("span", {
              className: "rb-icon",
              children: _jsx(Icon, { name: "pause", size: 14 }),
            }),
            _jsxs("span", {
              className: "rb-text",
              children: [
                _jsxs("b", {
                  children: [
                    $,
                    ee ? " \xb7 held at verse ".concat(ee) : "",
                  ],
                }),
                _jsx("span", {
                  children: "Comparing elsewhere — nothing lost",
                }),
              ],
            }),
            _jsxs("button", {
              className: "rb-return",
              onClick: () => Y.back(),
              children: [
                _jsx(Icon, { name: "corner-up-left", size: 14 }),
                "Return",
              ],
            }),
          ],
        }),
      eR &&
        es &&
        (null == eC ? void 0 : eC.groups[es]) &&
        "ready" === ep &&
        (() => {
          let e = eC.groups[es].occ,
            t = e.findIndex(
              (e) =>
                e.k === "".concat(z, ":").concat(eR.verse) &&
                e.f === eR.from,
            );
          if (t < 0) return null;
          let s = e[t - 1],
            a = e[t + 1];
          return _jsxs("div", {
            className: "arrive-stepper",
            children: [
              _jsx("button", {
                className: "icon-btn sm tap",
                disabled: !s,
                onClick: () => s && eY(s.k, s.f, s.t, t, e.length, es),
                "aria-label": "Previous occurrence",
                children: _jsx(Icon, {
                  name: "chevron-right",
                  size: 19,
                }),
              }),
              _jsxs("span", {
                className: "as-text",
                children: [
                  _jsx("b", { children: "Step through matches" }),
                  _jsx("span", {
                    children: a
                      ? "Next: ".concat(a.k)
                      : "Last occurrence",
                  }),
                ],
              }),
              _jsx("button", {
                className: "icon-btn sm tap",
                disabled: !a,
                onClick: () =>
                  a && eY(a.k, a.f, a.t, t + 2, e.length, es),
                "aria-label": "Next occurrence",
                children: _jsx(Icon, {
                  name: "chevron-left",
                  size: 19,
                }),
              }),
            ],
          });
        })(),
      eR &&
        !es &&
        $ &&
        "ready" === ep &&
        (() => {
          var e;
          let t = ez.verses.findIndex((e) => e.number === eR.verse),
            s =
              null === (e = ez.verses[t]) || void 0 === e
                ? void 0
                : e.words.find((e) => e.pos === eR.from);
          return s
            ? _jsxs("div", {
                className: "arrive-twin",
                children: [
                  _jsxs("span", {
                    className: "at-word",
                    children: [
                      _jsx("span", {
                        className: "ar",
                        children: s.ar,
                      }),
                      s.tr &&
                        _jsx("span", {
                          className: "tr",
                          children: s.tr,
                        }),
                    ],
                  }),
                  _jsxs("button", {
                    className: "at-play",
                    onClick: () => eu.playWordSlow(t, eR.from),
                    children: [
                      _jsx(Icon, { name: "volume-2", size: 15 }),
                      "Play slowly",
                    ],
                  }),
                ],
              })
            : null;
        })(),
      ez.pendingLoopStart &&
        !eI &&
        _jsxs("div", {
          className: "range-banner",
          children: [
            _jsx(Icon, {
              name: "brackets",
              size: 17,
              style: { color: "var(--action-primary)", flex: "none" },
            }),
            "Start word set — tap the last word of the range",
          ],
        }),
      eZ,
      eI &&
        _jsxs("div", {
          className: "range-action-bar",
          children: [
            _jsxs("span", {
              className: "ra-t",
              children: [
                _jsxs("b", {
                  children: [
                    "word" === ez.mode ? "Drill" : "Loop",
                    " words ",
                    eI.start,
                    "–",
                    eI.end,
                  ],
                }),
                _jsxs("span", {
                  children: [
                    "Verse ",
                    null === (s = ez.verses[eI.vIdx]) || void 0 === s
                      ? void 0
                      : s.key,
                    " \xb7",
                    " ",
                    0 === ez.loopCount
                      ? "until stopped"
                      : "\xd7".concat(ez.loopCount, " passes"),
                  ],
                }),
              ],
            }),
            _jsx("button", {
              className: "btn-cancel",
              onClick: () => {
                (eS(null), eu.clearPendingLoopStart());
              },
              children: "Cancel",
            }),
            _jsxs("button", {
              className: "btn-commit",
              onClick: () => {
                (eu.loopWordRange(eI.vIdx, eI.start, eI.end), eS(null));
              },
              children: [
                _jsx(Icon, { name: "repeat", size: 15 }),
                "word" === ez.mode ? "Drill" : "Loop",
              ],
            }),
          ],
        }),
      _jsx(k, {
        engine: eu,
        state: ez,
        onPickMode: (e) => {
          (eu.setMode(e), "relay" === e && eb(!0));
        },
      }),
      ek &&
        eK &&
        _jsx(S, {
          word: eK,
          target: ek,
          loopCount: ez.loopCount,
          isWordRangeMode: "word" === ez.mode,
          onSetCount: (e) => eu.setLoopCount(e),
          onPlayWord: () => {
            (eu.playWordOneshot(ek.vIdx, ek.pos), eN(null));
          },
          onLoopWord: () => {
            (eu.loopSingleWord(
              ek.vIdx,
              ek.pos,
              "“".concat(eK.gloss || eK.tr || "word", "”"),
            ),
              eN(null));
          },
          onStartRange: () => {
            (eu.setPendingLoopStart(ek.vIdx, ek.pos), eN(null));
          },
          onClose: () => eN(null),
          annotation:
            null ===
              (m = eG(
                null !==
                  (I =
                    null === (v = ez.verses[ek.vIdx]) || void 0 === v
                      ? void 0
                      : v.number) && void 0 !== I
                  ? I
                  : -1,
              )) || void 0 === m
              ? void 0
              : m.get(ek.pos),
          onOpenPhrase: () => eQ(ek.vIdx, ek.pos),
          onOpenConfusable: () => {
            var e, t, s, r;
            let a =
              null ===
                (t = eG(
                  null !==
                    (r =
                      null === (s = ez.verses[ek.vIdx]) || void 0 === s
                        ? void 0
                        : s.number) && void 0 !== r
                    ? r
                    : -1,
                )) || void 0 === t
                ? void 0
                : null === (e = t.get(ek.pos)) || void 0 === e
                  ? void 0
                  : e.confusable;
            (eN(null), a && eE({ mark: a, vIdx: ek.vIdx }));
          },
        }),
      eW &&
        (() => {
          let e = ez.verses[eW.vIdx];
          if (!e) return null;
          let t = (function (e, t, s) {
            if (!e) return [];
            let r = [];
            for (let a of e.phrases[String(t)] || []) {
              if (s < a.f || s > a.t) continue;
              let t = e.groups[a.g];
              t && r.push({ id: a.g, mark: a, group: t });
            }
            return r;
          })(eC, e.number, eW.pos);
          if (!t.length) return null;
          let s = t[0].mark,
            a = e.words
              .filter((e) => e.pos >= s.f && e.pos <= s.t)
              .map((e) => e.ar)
              .join(" ");
          return _jsx(A, {
            groups: t,
            hereKey: e.key,
            hereText: a,
            onGo: eY,
            onClose: () => eA(null),
          });
        })(),
      eL &&
        (() => {
          let e = ez.verses[eL.vIdx];
          if (!e) return null;
          let t = e.words.find((e) => e.pos === eL.mark.p);
          return _jsx(W, {
            mark: eL.mark,
            verseKey: e.key,
            gloss: null == t ? void 0 : t.gloss,
            transliteration: null == t ? void 0 : t.tr,
            onPlayWord: () => eu.playWordOneshot(eL.vIdx, eL.mark.p),
            onGo: eY,
            onClose: () => eE(null),
          });
        })(),
      ef &&
        _jsx(PracticeSheet, {
          surahName: e_,
          versesCount:
            null !== (C = null == eO ? void 0 : eO.verses_count) &&
            void 0 !== C
              ? C
              : D,
          initialFrom: V,
          initialTo: D,
          initialMode: ez.mode,
          variant: "mode",
          onStart: (e, t, s) => {
            (ey(!1), eu.setMode(s), "relay" === s && eb(!0));
          },
          onClose: () => ey(!1),
        }),
      eg &&
        _jsx(ReciterSheet, {
          currentId: ez.reciterId,
          onPick: (e, t) => eu.switchReciter(e, t),
          onClose: () => ej(!1),
        }),
      ew &&
        _jsx(M, {
          verses: ez.verses,
          defaultReciterId:
            null !==
              (P =
                null !== (R = ez.reciterId) && void 0 !== R ? R : eM) &&
            void 0 !== P
              ? P
              : 0,
          initial: ez.relay
            ? {
                order: ez.relay.order,
                vFrom: ez.relay.vFrom,
                vTo: ez.relay.vTo,
                rounds: ez.relay.rounds,
              }
            : void 0,
          onStart: eJ,
          onClose: () => {
            var e;
            (eb(!1),
              (null === (e = ez.relay) || void 0 === e
                ? void 0
                : e.active) || eu.setMode("verse"));
          },
        }),
    ],
  });
}
export { U as PlayerScreen };
