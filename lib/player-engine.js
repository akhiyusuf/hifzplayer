"use client";

import { attachAudio, fetchAudio } from "@/lib/api";
import { resolveWordAudioUrl } from "@/lib/audio-url";
import { segsForVerse, segForWord, wordAt } from "@/lib/audio";
import { isPaidFocusJob, isPaidRelay, isPaidRepeat } from "@/lib/billing/gates";
import { KEYS } from "@/lib/constants";
import {
  emptyWordPick,
  buildRelayTurns,
  nextVerseInLoop,
  nextWordInRange,
  sortedWordRange,
  wordRangePassComplete,
  wordRepsDoneState,
  wordRepsPlayKind,
  wrapRelayIndex,
  exclusiveJobPatch,
} from "@/lib/player-chrome";
import { PLUS_GATE_EVENT } from "@/lib/plus";
import { pickMuallimReciter } from "@/lib/playlists";
import { getStore, setStore } from "@/lib/storage";
import { phrasesOf } from "@/lib/waqf";

export class PlayerEngine {
  notify() {
    ((this.snap = { ...this.st }),
      (this.wordSnap = { vIdx: this.st.vIdx, curWord: this.st.curWord }),
      this.listeners.forEach((e) => e()),
      this.wordListeners.forEach((e) => e()));
  }
  notifyWord() {
    ((this.wordSnap = { vIdx: this.st.vIdx, curWord: this.st.curWord }),
      this.wordListeners.forEach((e) => e()));
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
      this.stopWordClip(),
      this.clearGap(),
      (this.st.playing = !1),
      this.notify());
  }
  clearGap() {
    (this.wordGapTimer && clearTimeout(this.wordGapTimer),
      (this.wordGapTimer = null));
  }
  stopAudio() {
    (this.playToken++,
      this.audio.pause(),
      (this.audio.muted = !1),
      (this.armed = null),
      (this.pendingWordInit = !1),
      this.stopWordClip(),
      this.clearGap(),
      (this.st.playing = !1),
      this.notify());
  }
  yieldJobs(keep) {
    Object.assign(this.st, exclusiveJobPatch(keep));
  }
  stopJobs() {
    (this.stopAudio(), this.yieldJobs());
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
            this.finishOneshot();
        }
        if (n && n.vIdx === this.st.vIdx) {
          let r = segForWord(s, n.endW);
          r && e >= r.end - 0.03 && this.handleLoopEdge(t);
        }
        // Word-stepping must never run alongside a loop — that double-fires
        // passes and makes cancel need two taps (loop chip, then word chip).
        if ("word" === i && l.active && !n) {
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
        this.syncFocusPhrase(e, t));
    "mushaf" === this.st.style ? this.notifyWord() : this.notify();
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
        "word" === this.st.mode
          ? (this.pauseAudio(),
            this.finishWordReps(),
            this.toast("Word Reps done"))
          : this.toast("Loop done — continuing"),
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
      // Range Word Reps are loop-driven; never fall through to word-step.
      if (this.st.loop && e && (this.handleLoopEdge(e), this.st.loop)) {
        this.playAudio();
        return;
      }
      if (this.st.loop) return;
      if (this.st.wordStep.active) {
        this.wordStepEnded();
        return;
      }
      if (this.st.oneshot && this.st.oneshot.vIdx === this.st.vIdx) {
        this.finishOneshot();
        return;
      }
      // Play from here (and other non-drill playback) must keep going.
      (this.markVerseDone(this.st.vIdx),
        this.st.vIdx < this.st.verses.length - 1
          ? this.loadVerseAudio(this.st.vIdx + 1, !0)
          : this.finishPassage());
      return;
    }
    if (
      (this.clearGap(),
      this.st.oneshot && this.st.oneshot.vIdx === this.st.vIdx)
    ) {
      this.finishOneshot();
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
      let range = this.st.verseLoopRange,
        cur = e && e.number;
      if (range && null != cur) {
        let next = nextVerseInLoop(cur, range.from, range.to),
          idx = this.st.verses.findIndex((v) => v.number === next);
        if (idx >= 0) {
          this.loadVerseAudio(idx, !0);
          return;
        }
      }
      this.armSeek(0, !0);
      return;
    }
    (this.markVerseDone(this.st.vIdx),
      this.st.vIdx < this.st.verses.length - 1
        ? this.loadVerseAudio(this.st.vIdx + 1, !0)
        : this.finishPassage());
  }
  finishPassage() {
    if ("function" == typeof this.onPassageEnd && this.onPassageEnd()) return;
    ((this.st.playing = !1),
      this.notify(),
      this.toast("function" == typeof this.onPassageEnd ? "End of list" : "End of passage"));
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
        verseLoopRange: null,
        relay: null,
        mode: "verse",
        style: "mushaf",
        focusPhrase: 0,
        masked: {},
        oneshot: null,
        pendingLoopStart: null,
        wordStep: { active: !1, w: 1, playedTimes: 0, range: null },
        wordPick: emptyWordPick(),
      }),
      setStore(KEYS.style, "mushaf"),
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
  setReciters(e) {
    this.reciters = Array.isArray(e) ? e : [];
  }
  stopWordClip() {
    if (!this.wordClip) return;
    try {
      (this.wordClip.onended = null,
        this.wordClip.pause(),
        (this.wordClip.src = ""));
    } catch (e) {}
  }
  async ensureMuallimForWordReps() {
    let e = pickMuallimReciter(this.reciters || []);
    if (!e) return !1;
    if (e.id === this.st.reciterId) {
      this._restoreAfterWordReps = !1;
      return !0;
    }
    try {
      var n;
      let t = await this.ensureAudio(e.id);
      this.st.verses = attachAudio(this.st.verses, t);
      let s = this.st.verses[this.st.vIdx],
        r =
          null == s
            ? void 0
            : null === (n = s.audio) || void 0 === n
              ? void 0
              : n.url;
      return (
        r && this.setSrc(r),
        (this._restoreAfterWordReps = !0),
        !0
      );
    } catch (t) {
      return ((this._restoreAfterWordReps = !1), !1);
    }
  }
  restoreMainAudio() {
    var t;
    if (!this.st.passage || null == this.st.reciterId) return;
    let e = this.audioByReciter[this.audioKey(this.st.reciterId)];
    if (!e) return;
    this.st.verses = attachAudio(this.st.verses, e);
    let s = this.st.verses[this.st.vIdx],
      r =
        null == s
          ? void 0
          : null === (t = s.audio) || void 0 === t
            ? void 0
            : t.url;
    r && this.setSrc(r);
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
          : t
            ? this.finishPassage()
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
        ("word" === this.st.mode &&
        (this.st.wordStep.active ||
          (this.st.wordPick && null != this.st.wordPick.count))
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
      let p = this.st.wordPick,
        w = this.st.wordStep.w || 1;
      if (p && null != p.start && null != p.end && null != p.count) {
        this.playWordReps(p.start, p.end, p.count);
        return;
      }
      if (p && null != p.count) {
        let word = p.open || p.start || w;
        this.startWordDrill(word, word, p.count);
        return;
      }
      if (p && null != p.start && null != p.end) {
        this.toast("Pick 5×, 10×, or ∞ on the first word, then play");
        return;
      }
      this.wordModePlayCurrent();
      return;
    }
    this.audio.src
      ? this.playAudio()
      : this.loadVerseAudio(this.st.vIdx, !0);
  }
  prev() {
    if ("relay" === this.st.mode) {
      this.stepRelay(-1);
      return;
    }
    if ("word" === this.st.mode) {
      this.stepWordManual(-1);
      return;
    }
    if (this.st.vIdx > 0) {
      ((this.st.loop = null),
        this.loadVerseAudio(this.st.vIdx - 1, this.st.playing));
      return;
    }
    if ("function" == typeof this.onNeedPrevStop && this.onNeedPrevStop()) return;
    this.armSeek(0, this.st.playing);
  }
  next() {
    if ("relay" === this.st.mode) {
      this.stepRelay(1);
      return;
    }
    if ("word" === this.st.mode) {
      this.stepWordManual(1);
      return;
    }
    if (this.st.vIdx < this.st.verses.length - 1) {
      ((this.st.loop = null),
        this.loadVerseAudio(this.st.vIdx + 1, this.st.playing));
      return;
    }
    "function" == typeof this.onNeedNextStop && this.onNeedNextStop();
  }
  setRate(e) {
    if (this.st.rate === e || !RATES.includes(e)) return;
    ((this.st.rate = e), (this.audio.playbackRate = e), this.notify());
  }
  toggleVerseLoop() {
    if (this.st.verseLoop) {
      ((this.st.verseLoop = !1),
        (this.st.verseLoopRange = null),
        this.toast("Verse repeat off"),
        this.notify());
      return;
    }
    (this.yieldJobs("verseLoop"),
      (this.st.verseLoop = !0),
      (this.st.verseLoopRange = null),
      this.toast("Repeating this verse until you turn it off"),
      this.notify());
  }
  setVerseLoopRange(from, to) {
    let a = Math.min(from, to),
      b = Math.max(from, to);
    if (!coversRange(this.st.verses, a, b)) {
      this.toast("That range is not on this page");
      return;
    }
    (this.yieldJobs("verseLoop"),
      (this.st.verseLoop = !0),
      (this.st.verseLoopRange = a === b ? null : { from: a, to: b }));
    let idx = this.st.verses.findIndex((v) => v.number === a);
    this.toast(
      a === b
        ? "Repeating this verse until you turn it off"
        : "Repeating verses ".concat(a, "–").concat(b),
    );
    this.notify();
    if (idx >= 0 && idx !== this.st.vIdx) this.loadVerseAudio(idx, !0);
    else if (!this.st.playing) this.playAudio();
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
    if (isPaidFocusJob(e) && !this.requirePlus("practice")) return;
    (e !== this.st.mode || "relay" === e) &&
      (this.stopJobs(),
      (this.st.mode = e),
      "masked" === e && (this.st.masked = {}),
      "relay" !== e && (this.st.relay = null),
      this.notify(),
      "relay" !== e && this.loadVerseAudio(this.st.vIdx, !1));
  }
  setStyle(e) {
    if (this.st.style === e) return;
    ((this.st.style = e), setStore(KEYS.style, e));
    if (!this.plus && isPaidFocusJob(this.st.mode)) {
      (this.stopJobs(),
        (this.st.mode = "verse"),
        (this.st.relay = null));
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
  setShowTranslation(e) {
    ((this.st.showTranslation = !!e), setStore(KEYS.showTranslation, !!e), this.notify());
  }
  setVerseTranslations(e, t) {
    ((this.st.verses = this.st.verses.map((s) => ({
      ...s,
      translation: e.get(s.number) || "",
    }))),
      (this.st.translationName = t || this.st.translationName),
      this.notify());
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
        null != s && (this.st.wordRepeat = s));
    } else this.clampFree();
    this.notify();
  }
  clampFree() {
    (isPaidRepeat(this.st.loopCount) && (this.st.loopCount = 2),
      isPaidRepeat(this.st.wordRepeat) && (this.st.wordRepeat = 2),
      (this.st.layers = { phrases: !1, confusables: !1 }),
      this.st.relay &&
        isPaidRelay(this.st.relay.order) &&
        (this.st.relay = null),
      isPaidFocusJob(this.st.mode) &&
        ((this.st.mode = "verse"),
          (this.st.relay = null),
          (this.st.wordStep = {
            active: !1,
            w: 1,
            playedTimes: 0,
            range: null,
          })));
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
      let step = this.st.wordStep,
        range = step.range;
      if (range) {
        let next = nextWordInRange(step.w, range.endW);
        if (null != next) {
          ((this.st.wordStep = { ...step, w: next }),
            this.playWordOnce(e, next));
          return;
        }
        let pass = (range.pass || 0) + 1;
        if (!wordRangePassComplete(pass, range.passes)) {
          ((this.st.wordStep = {
            ...step,
            w: range.startW,
            playedTimes: 0,
            range: { ...range, pass },
          }),
            this.playWordOnce(e, range.startW));
          return;
        }
        ((this.st.wordStep = {
          ...step,
          active: !1,
          playedTimes: 0,
        }),
          this.finishWordReps());
        return;
      }
      let played = step.playedTimes + 1;
      ((this.st.wordStep = { ...step, playedTimes: played }),
        0 === this.st.wordRepeat || played < this.st.wordRepeat
          ? this.playWordOnce(e, step.w)
          : this.finishWordReps());
    }, t);
  }
  stepWordManual(e) {
    let t = this.currentVerse();
    if (!t) return;
    this.bumpWordRepsToken();
    (this.stopWordClip(), (this.st.loop = null));
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
    let s = phrasesOf(e).findIndex(
      (e) => t >= e[0].pos && t <= e[e.length - 1].pos,
    );
    s >= 0 && s !== this.st.focusPhrase && (this.st.focusPhrase = s);
  }
  stepPhrase(e) {
    this.st.loop = null;
    let t = this.currentVerse();
    if (!t) return;
    let s = phrasesOf(t),
      r = this.st.focusPhrase + e;
    if (r < 0) {
      if (this.st.vIdx > 0) {
        let e = this.st.playing;
        if (
          (this.loadVerseAudio(this.st.vIdx - 1, !1),
          (this.st.focusPhrase = Math.max(
            0,
            phrasesOf(this.currentVerse()).length - 1,
          )),
          this.notify(),
          e)
        ) {
          let e = phrasesOf(this.currentVerse())[this.st.focusPhrase];
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
    let a = phrasesOf(this.currentVerse())[this.st.focusPhrase];
    this.st.playing && a && this.playFromWord(a[0].pos);
  }
  loopPhrase() {
    let e =
        arguments.length > 0 && void 0 !== arguments[0]
          ? arguments[0]
          : 5,
      t = this.currentVerse();
    if (!t) return;
    let s = phrasesOf(t)[this.st.focusPhrase];
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
    (this.yieldJobs("word"),
      (this.st.oneshot = null),
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
    // In Word Reps, the loop chip is the range driver — clearing it must
    // tear down the whole drill, not leave a second wordStep chip behind.
    if ("word" === this.st.mode) {
      this.finishWordReps();
      return;
    }
    ((this.st.loop = null), this.notify());
  }
  clearDrill() {
    this.finishWordReps();
  }
  /**
   * Single-word Word Reps only. Prefer clean Quran.com wbw clips; fall back
   * to a Muallim segment slice when no clip exists. Never starts a range loop.
   */
  async startWordDrill(e, t, s) {
    let start = Math.min(e, t),
      end = Math.max(e, t),
      passes = null == s ? this.st.wordRepeat : s;
    if (isPaidRepeat(passes) && !this.requirePlus("repeats")) return;
    // Defensive: a multi-word call must never enter the word-step path.
    if (start !== end) {
      this.playWordRangeSpan(start, end, passes);
      return;
    }
    let token = this.bumpWordRepsToken();
    (this.yieldJobs(),
      this.clearGap(),
      this.stopWordClip(),
      (this.st.loop = null),
      (this.st.oneshot = null),
      (this.st.wordRepeat = passes),
      (this.st.wordPick = {
        ...emptyWordPick(),
        start,
        end,
        count: passes,
        open: null,
        vIdx: this.st.vIdx,
      }),
      (this.st.wordStep = {
        active: !0,
        w: start,
        playedTimes: 0,
        range: { startW: start, endW: end, passes, pass: 0 },
      }),
      (this.st.curWord = start),
      this.notify());
    if (this.beginWordClipReps(start)) return;
    try {
      this.audio.play().catch(() => {});
    } catch (e) {}
    await this.ensureMuallimForWordReps();
    if (!this.wordRepsTokenLive(token)) return;
    this.wordModePlayCurrent();
  }
  playWordReps(e, t, s) {
    if ("span" === wordRepsPlayKind(e, t)) {
      this.playWordRangeSpan(e, t, s);
      return;
    }
    this.startWordDrill(e, t, s);
  }
  bumpWordRepsToken() {
    return (this._wordRepsToken = (this._wordRepsToken || 0) + 1);
  }
  wordRepsTokenLive(token) {
    return (
      token === this._wordRepsToken &&
      "word" === this.st.mode &&
      null != (this.st.wordPick && this.st.wordPick.count)
    );
  }
  finishWordReps() {
    this.bumpWordRepsToken();
    let w = this.st.wordStep.w || 1;
    Object.assign(this.st, wordRepsDoneState());
    this.st.wordStep = { ...this.st.wordStep, w };
    this.st.curWord = w;
    this.clearGap();
    this.pauseAudio();
    this.stopWordClip();
    if (this._restoreAfterWordReps) {
      ((this._restoreAfterWordReps = !1), this.restoreMainAudio());
    }
    this.notify();
  }
  /**
   * Range Word Reps: one continuous Muallim stream from start→end, looped by
   * `this.st.loop` only. wordStep must stay inactive so tick does not also
   * word-step (that was doubling passes and requiring two cancels).
   */
  async playWordRangeSpan(e, t, s) {
    let range = sortedWordRange(e, t),
      passes = null == s ? this.st.wordRepeat : s;
    if (isPaidRepeat(passes) && !this.requirePlus("repeats")) return;
    let token = this.bumpWordRepsToken();
    (this.yieldJobs(),
      this.clearGap(),
      this.stopWordClip(),
      (this.st.oneshot = null),
      (this.st.wordRepeat = passes),
      (this.st.wordPick = {
        ...emptyWordPick(),
        start: range.start,
        end: range.end,
        count: passes,
        open: null,
        vIdx: this.st.vIdx,
      }),
      (this.st.wordStep = {
        active: !1,
        w: range.start,
        playedTimes: 0,
        range: null,
      }),
      (this.st.curWord = range.start),
      this.notify());
    try {
      this.audio.play().catch(() => {});
    } catch (e) {}
    await this.ensureMuallimForWordReps();
    if (!this.wordRepsTokenLive(token)) return;
    let p = this.st.wordPick;
    if (
      !p ||
      p.start !== range.start ||
      p.end !== range.end ||
      p.count !== passes
    )
      return;
    (this.setLoop(
      this.st.vIdx,
      range.start,
      range.end,
      passes,
      "Word Reps: words ".concat(range.start, "–").concat(range.end),
    ),
      this.playFromWord(range.start));
  }
  /** Play one wbw clip pass for single-word Word Reps. Returns false if no clip. */
  beginWordClipReps(pos) {
    var n, i;
    let s = this.st.verses[this.st.vIdx],
      r =
        null == s
          ? void 0
          : null === (n = s.words) || void 0 === n
            ? void 0
            : n.find((w) => w.pos === pos),
      a = resolveWordAudioUrl(null == r ? void 0 : r.audio);
    if (!a) return !1;
    this.clearGap();
    try {
      this.audio.pause();
    } catch (e) {}
    this.stopWordClip();
    let clip = this.wordClip || (this.wordClip = new Audio());
    ((clip.src = a),
      (clip.playbackRate = this.st.rate),
      (clip.onended = () => this.wordClipRepEnded()),
      (this.st.playing = !0),
      (this.st.curWord = pos),
      this.notify(),
      clip.play().catch(() => {
        this.toast("Couldn’t play this word’s audio.");
        this.finishWordReps();
      }));
    return !0;
  }
  wordClipRepEnded() {
    if (this.wordGapTimer) return;
    if (!this.wordRepsTokenLive(this._wordRepsToken)) return;
    if ("word" !== this.st.mode || !this.st.wordStep.active) return;
    // Clip reps are single-word only; a range must never land here.
    let step = this.st.wordStep,
      range = step.range;
    if (!range || range.startW !== range.endW || this.st.loop) {
      this.finishWordReps();
      return;
    }
    let pass = (range.pass || 0) + 1;
    if (!wordRangePassComplete(pass, range.passes)) {
      ((this.st.wordStep = { ...step, range: { ...range, pass } }),
        (this.st.playing = !0),
        this.notify());
      this.wordGapTimer = setTimeout(
        () => {
          ((this.wordGapTimer = null),
            "word" === this.st.mode &&
              this.st.wordStep.active &&
              this.beginWordClipReps(range.startW));
        },
        380 / this.st.rate,
      );
      return;
    }
    (this.finishWordReps(), this.toast("Word Reps done"));
  }
  /** Close the floating bar without clearing a pin/count. */
  closeWordRep() {
    let p = this.st.wordPick || emptyWordPick();
    ((this.st.wordPick = { ...p, open: null }), this.notify());
  }
  /** Cancel underline + count and stop drill audio. */
  dismissWordRep() {
    this.bumpWordRepsToken();
    ((this.st.wordStep = {
      ...this.st.wordStep,
      active: !1,
      range: null,
      playedTimes: 0,
    }),
      (this.st.loop = null),
      (this.st.wordPick = emptyWordPick()),
      this.pauseAudio(),
      this._restoreAfterWordReps &&
        ((this._restoreAfterWordReps = !1), this.restoreMainAudio()),
      this.notify());
  }
  tapWordRep(e, t) {
    this.yieldJobs("word");
    this.pauseAudio();
    e !== this.st.vIdx && this.loadVerseAudio(e, !1);
    let p = this.st.wordPick || emptyWordPick();
    // After the first pin, tapping another word completes the range.
    if (null != p.start && null == p.end && t !== p.start) {
      let span = sortedWordRange(p.start, t);
      ((this.st.wordPick = {
        ...p,
        start: span.start,
        end: span.end,
        open: span.start,
      }),
        (this.st.wordStep = {
          ...this.st.wordStep,
          w: span.start,
          playedTimes: 0,
          range: null,
          active: !1,
        }),
        (this.st.curWord = t),
        this.notify());
      return;
    }
    let open = p.open === t ? null : t;
    // Closing the bar without a replay count cancels the underline selection.
    ((this.st.wordPick =
      null == open && null == p.count && null == p.start
        ? emptyWordPick()
        : null == open && null == p.count
          ? emptyWordPick()
          : { ...p, open }),
      (this.st.wordStep = {
        ...this.st.wordStep,
        w: t,
        playedTimes: 0,
        range: null,
        active: !1,
      }),
      (this.st.curWord = t),
      this.notify());
  }
  pinWordRep(t) {
    this.bumpWordRepsToken();
    this.pauseAudio();
    let p = this.st.wordPick || emptyWordPick();
    if (null != p.vIdx && p.vIdx !== this.st.vIdx) p = emptyWordPick();
    ((this.st.wordStep = {
      ...this.st.wordStep,
      active: !1,
      range: null,
      playedTimes: 0,
    }),
      (this.st.loop = null));
    if (null == p.start) {
      // Keep the first pin; close the pop so the next word can be tapped.
      this.st.wordPick = {
        ...p,
        start: t,
        end: null,
        open: null,
        vIdx: this.st.vIdx,
      };
    } else if (t === p.start && null == p.end) {
      this.st.wordPick = { ...p, start: null, open: t, vIdx: this.st.vIdx };
    } else if (null == p.end) {
      let span = sortedWordRange(p.start, t);
      this.st.wordPick = {
        ...p,
        start: span.start,
        end: span.end,
        open: span.start,
        vIdx: this.st.vIdx,
      };
    } else {
      this.st.wordPick = {
        ...p,
        start: t,
        end: null,
        open: null,
        vIdx: this.st.vIdx,
      };
    }
    this.notify();
  }
  setWordRepCount(n) {
    if (isPaidRepeat(n) && !this.requirePlus("repeats")) return;
    // Arm the count only — do not auto-start. Play begins from the transport.
    this.bumpWordRepsToken();
    let p = this.st.wordPick || emptyWordPick();
    ((this.st.wordPick = { ...p, count: n }),
      (this.st.wordRepeat = n),
      this.pauseAudio(),
      (this.st.wordStep = {
        ...this.st.wordStep,
        active: !1,
        range: null,
        playedTimes: 0,
      }),
      (this.st.loop = null),
      this.notify());
  }
  playWordSlow(e, t) {
    ((this.oneshotRate = 0.75), this.playWordOneshot(e, t));
  }
  playWordOneshot(e, t) {
    this.bumpWordRepsToken();
    ((this.st.loop = null),
      (this.st.wordStep = {
        ...this.st.wordStep,
        active: !1,
        w: t,
        playedTimes: 0,
        range: null,
      }),
      e !== this.st.vIdx && this.loadVerseAudio(e, !1),
      (this.st.oneshot = { vIdx: e, endW: t }),
      this.playFromWord(t));
  }
  finishOneshot() {
    ((this.st.oneshot = null), this.pauseAudio());
    if (this._restoreAfterMuallimOneshot) {
      ((this._restoreAfterMuallimOneshot = !1), this.restoreMainAudio());
    }
  }
  playWordClip(e, t) {
    var n, i;
    let s = this.st.verses[e],
      r =
        null == s
          ? void 0
          : null === (n = s.words) || void 0 === n
            ? void 0
            : n.find((w) => w.pos === t),
      a = resolveWordAudioUrl(null == r ? void 0 : r.audio);
    if (!a) {
      // Fall back to a Muallim oneshot if this word has no wbw clip yet.
      this.playWordMuallimFallback(e, t);
      return;
    }
    this.bumpWordRepsToken();
    (this.pauseAudio(),
      (this.st.oneshot = null),
      (this.st.loop = null),
      (this.st.wordStep = {
        ...this.st.wordStep,
        active: !1,
        w: t,
        playedTimes: 0,
        range: null,
      }));
    let clip = this.wordClip || (this.wordClip = new Audio());
    ((clip.src = a),
      (clip.playbackRate = this.st.rate),
      (clip.onended = () => {
        ((this.st.playing = !1), this.notify());
      }),
      (this.st.playing = !0),
      (this.st.curWord = t),
      e !== this.st.vIdx && (this.st.vIdx = e),
      this.notify(),
      clip.play().catch(() => {
        ((this.st.playing = !1), this.notify());
        this.toast("Couldn’t play this word’s audio.");
      }));
  }
  async playWordMuallimFallback(e, t) {
    let r = pickMuallimReciter(this.reciters || []);
    if (!r || r.id === this.st.reciterId) {
      ((this._restoreAfterMuallimOneshot = !1), this.playWordOneshot(e, t));
      return;
    }
    (this.pauseAudio(), (this.st.loop = null), (this.st.oneshot = null));
    try {
      let a = await this.ensureAudio(r.id);
      ((this.st.verses = attachAudio(this.st.verses, a)),
        (this._restoreAfterMuallimOneshot = !0),
        e !== this.st.vIdx && this.loadVerseAudio(e, !1),
        (this.st.oneshot = { vIdx: e, endW: t }),
        this.playFromWord(t));
    } catch (a) {
      ((this._restoreAfterMuallimOneshot = !1),
        this.restoreMainAudio(),
        this.toast("Couldn’t load teaching audio for this word."),
        this.playWordOneshot(e, t));
    }
  }
  playFromHere(e, t) {
    this.bumpWordRepsToken();
    ((this._restoreAfterMuallimOneshot = !1),
      (this.st.oneshot = null),
      (this.st.loop = null),
      (this.st.wordStep = {
        ...this.st.wordStep,
        active: !1,
        range: null,
        playedTimes: 0,
        w: t,
      }),
      this.stopWordClip(),
      this.clearGap(),
      this.restoreMainAudio(),
      e !== this.st.vIdx && this.loadVerseAudio(e, !1),
      this.playFromWord(t));
  }
  loopSingleWord(e, t, s) {
    this.yieldJobs("word");
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
    this.yieldJobs("word");
    if (
      ((this.st.pendingLoopStart = null),
      e !== this.st.vIdx && this.loadVerseAudio(e, !1),
      "word" === this.st.mode)
    ) {
      this.playWordReps(t, s);
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
    (this.yieldJobs("word"),
      (this.st.pendingLoopStart = { vIdx: e, w: t }),
      this.notify(),
      this.toast("Range start set — now tap the last word"));
  }
  clearPendingLoopStart() {
    ((this.st.pendingLoopStart = null), this.notify());
  }
  async switchReciter(e, t, quiet) {
    if (e === this.st.reciterId) return;
    let s = this.st.playing,
      r = this.st.curWord;
    (this.pauseAudio(),
      (this.st.reciterId = e),
      setStore("focus" === this.st.style ? KEYS.focusReciter : KEYS.reciter, e),
      this.notify(),
      quiet || this.toast("Switching to ".concat(t, "\u2026")));
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
    let n = buildRelayTurns(this.st.verses, t, s, e, 1, this.st.reciterId || 0);
    if (!n.length) return (this.toast("No verses in that range"), !1);
    (this.stopJobs(),
      (this.st.mode = "relay"),
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
    return (this.audioByReciter[this.audioKey(e.reciterId)] || {})[e.verseKey] || null;
  }
  relayTogglePlay() {
    let e = this.st.relay;
    if (e && e.active) {
      if (this.st.playing) {
        this.pauseAudio();
        return;
      }
      ((this.st.relay = { ...e, waitingTap: !1, replaying: !1 }),
        this.notify(),
        this.startRelayTurn(!1));
    }
  }
  stepRelay(delta) {
    let e = this.st.relay;
    if (!e || !e.active) return;
    let r = e.turns || [];
    if (!r.length) return;
    this.stopAudio();
    let t = wrapRelayIndex(e.idx, r.length, delta);
    this.st.relay = {
      ...e,
      idx: t,
      waitingTap: !1,
      replaying: !1,
    };
    let a = this.vIdxByKey(r[t].verseKey);
    (a >= 0 && (this.st.vIdx = a),
      (this.st.curWord = 0),
      this.notify(),
      this.startRelayTurn(!1));
  }
  startRelayTurn(e) {
    var t;
    this.clearGap();
    this.playToken++;
    try {
      (this.audio.pause(), (this.audio.muted = !1));
    } catch (e) {}
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
      ((r = buildRelayTurns(
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
      this.toastListeners.clear(),
      this.wordListeners.clear());
  }
  constructor() {
    var e, t, s, r, a;
    if (
      ((this.listeners = new Set()),
      (this.timeListeners = new Set()),
      (this.toastListeners = new Set()),
      (this.wordListeners = new Set()),
      (this.wordSnap = { vIdx: 0, curWord: 0 }),
      (this.subscribeWord = (e) => (
        this.wordListeners.add(e),
        () => this.wordListeners.delete(e)
      )),
      (this.getWordSnap = () => this.wordSnap),
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
      (this.reciters = []),
      (this.wordClip = null),
      (this._restoreAfterWordReps = !1),
      (this._wordRepsToken = 0),
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
      (this.onPassageEnd = null),
      (this.onNeedNextStop = null),
      (this.onNeedPrevStop = null),
      (this.st = {
        verses: [],
        passage: null,
        reciterId: null,
        translationName: "Translation",
        loading: !1,
        error: null,
        mode: "verse",
        style: "mushaf",
        rate: 1,
        vIdx: 0,
        curWord: 0,
        playing: !1,
        loop: null,
        verseLoop: !1,
        verseLoopRange: null,
        wordStep: { active: !1, w: 1, playedTimes: 0, range: null },
        wordPick: emptyWordPick(),
        oneshot: null,
        wordRepeat:
          null !== (e = getStore(KEYS.wordRepeat)) && void 0 !== e && !isPaidRepeat(e)
            ? e
            : 2,
        loopCount:
          null !== (t = getStore(KEYS.loopCount)) && void 0 !== t && !isPaidRepeat(t)
            ? t
            : 1,
        taj: !!getStore(KEYS.taj),
        layers: { phrases: !1, confusables: !1 },
        focusPhrase: 0,
        masked: {},
        relay: null,
        pendingLoopStart: null,
        showTranslation:
          null === getStore(KEYS.showTranslation) || getStore(KEYS.showTranslation),
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

