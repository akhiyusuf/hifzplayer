"use client";

import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Icon } from "@/components/icon";
import { PracticeStrip } from "@/components/practice-strip";
import {
  MUSHAF_HOT_PAD,
  MUSHAF_VIEW_PAD,
  isHotVerse,
  rangeAround,
  viewFromVisible,
} from "@/lib/mushaf-window";
import { mushafMaskReveal, mushafRepSpan, mushafWordsInteractive, wordNeedsFollow, wordIsAway, emptyWordPick, wordRepChromeVisible, relayRoundLabel, relayWhoseTurn, relayTurnName } from "@/lib/player-chrome";
import { useAppData } from "@/lib/app-data";
import { usePlus } from "@/lib/plus";
import {
  ColdVerse,
  MushafVerse,
  MushafVerseActive,
  verseWordRange,
} from "@/components/player-verse";

export function MushafJobBar(e) {
  let { engine: t, state: s } = e;
  useSyncExternalStore(t.subscribeWord, t.getWordSnap, t.getWordSnap);
  if ("relay" === s.mode && s.relay && s.relay.active) {
    return _jsx(MushafRelayBar, { engine: t, state: s });
  }
  if ("masked" !== s.mode) return null;
  let verse = s.verses[s.vIdx];
  if (!verse) return null;
  let i = t.maskStateFor(verse),
    l = verse.words.length,
    c = i.maxRev >= l;
  return _jsx(PracticeStrip, {
    title: "Revealed ".concat(i.maxRev, " of ", l),
    meta: verse.key,
    actions: _jsxs("button", {
      className: "focus-act primary",
      onClick: () => t.peek(),
      disabled: i.peeks <= 0 || c,
      children: [
        _jsx(Icon, { name: "eye", size: 16 }),
        c
          ? "Verse revealed"
          : i.peeking
            ? "Peeking"
            : "Peek \xb7 ".concat(i.peeks, " left"),
      ],
    }),
  });
}

function MushafRelayBar(e) {
  let { engine: t, state: s } = e,
    { reciterName: n } = useAppData(),
    l = s.relay;
  if (!l || !l.active) return null;
  let d = l.turns[l.idx];
  if (!d) return null;
  let h = "you" === relayWhoseTurn(d),
    who = relayTurnName(h ? "you" : "qari", n(d.reciterId)),
    u = l.turns.length - l.idx,
    extra = _jsxs("span", {
      className: "turn-chip now mushaf-relay-chip",
      "aria-current": "step",
      children: [
        _jsx("span", {
          className: "turn-avatar",
          children: _jsx(Icon, {
            name: h ? "user" : "mic",
            size: 14,
          }),
        }),
        _jsxs("span", {
          className: "turn-text",
          children: [
            _jsx("b", { children: who }),
            _jsx("span", {
              children: h
                ? "".concat(u, " left")
                : "".concat(u, " ", 1 === u ? "turn" : "turns", " left"),
            }),
          ],
        }),
      ],
    }),
    actions = h
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
      : null;
  return _jsx("div", {
    className: "mushaf-relay-bar",
    "data-relay-turn": h ? "you" : "qari",
    children: _jsx(PracticeStrip, {
      title: h ? "Your turn" : who,
      meta: relayRoundLabel(l.round, l.rounds),
      hint: h
        ? "Recite aloud — the reciter plays muted to pace you"
        : l.waitingTap
          ? "Tap play to begin"
          : undefined,
      extra,
      actions,
    }),
  });
}

export function MushafFollowButton(e) {
  let { engine: t, style: s } = e,
    n = useSyncExternalStore(t.subscribeWord, t.getWordSnap, t.getWordSnap),
    [i, l] = useState(!1),
    o = useRef(!0),
    d = useRef(!1),
    c = useCallback(() => {
      let e = document.querySelector(".shell.player .player-body"),
        t = e && e.querySelector('[data-cur="1"]');
      return { body: e, word: t };
    }, []),
    h = useCallback(() => {
      let { body: e, word: t } = c();
      if (!e || !t) return { follow: !1, away: !1 };
      let s = t.getBoundingClientRect(),
        n = e.getBoundingClientRect();
      return {
        follow: wordNeedsFollow(s.top, s.bottom, n.top, n.bottom, 48),
        away: wordIsAway(s.top, s.bottom, n.top, n.bottom, 8),
      };
    }, [c]),
    u = useCallback(
      (e) => {
        let { word: t } = c();
        if (!t) return;
        ((d.current = !0),
          (o.current = !0),
          t.scrollIntoView({
            block: "center",
            behavior: e ? "smooth" : "auto",
          }),
          window.setTimeout(() => {
            ((d.current = !1), l(!1));
          }, 420));
      },
      [c],
    );
  (useEffect(() => {
    if ("mushaf" !== s) {
      ((o.current = !0), l(!1));
      return;
    }
    let e = c().body;
    if (!e) return;
    let t = () => {
      let n = h();
      if (d.current) {
        n.away || l(!1);
        return;
      }
      if (o.current && !n.away) return;
      if (n.away) {
        ((o.current = !1), l(!0));
        return;
      }
      l(!1);
    };
    return (
      e.addEventListener("scroll", t, { passive: !0 }),
      () => e.removeEventListener("scroll", t)
    );
  }, [s, c, h]),
    useEffect(() => {
      if ("mushaf" !== s) return;
      if (o.current) {
        h().follow && u(!0);
        return;
      }
      l(h().away);
    }, [n.curWord, n.vIdx, s, h, u]));
  return "mushaf" !== s || !i
    ? null
    : _jsxs("button", {
        type: "button",
        className: "follow-back tap",
        onClick: () => u(!0),
        "aria-label": "Back to the current word",
        children: [
          _jsx(Icon, { name: "corner-up-left", size: 14 }),
          "Back to word",
        ],
      });
}
export function MushafPage(e) {
  let {
      engine: t,
      state: s,
      onWordTap: n,
      selection: i,
      annFor: l,
      arrived: o,
    } = e,
    { plus: plusOn, askPlus: ask } = usePlus(),
    d = useRef(null),
    c = s.verses.length,
    h = useCallback((e) => t.jumpToVerse(e), [t]),
    u = rangeAround(c, s.vIdx, MUSHAF_HOT_PAD),
    [p, m] = useState(u);
  (useEffect(() => {
    m(rangeAround(s.verses.length, s.vIdx, MUSHAF_HOT_PAD));
  }, [s.verses]),
    useEffect(() => {
      let e = d.current;
      if (!e) return;
      let t = !1,
        n = () => {
          t = !1;
          let i = e.getBoundingClientRect(),
            l = 500,
            o = c,
            r = -1;
          for (let t of e.querySelectorAll("[data-vi]")) {
            let e = t.getBoundingClientRect();
            if (e.bottom >= i.top - l && e.top <= i.bottom + l) {
              let e = Number(t.getAttribute("data-vi"));
              (e < o && (o = e), e > r && (r = e));
            }
          }
          r >= o &&
            m((e) => {
              let t = viewFromVisible(c, o, r, MUSHAF_VIEW_PAD);
              return e.start === t.start && e.end === t.end ? e : t;
            });
        },
        i = () => {
          t || ((t = !0), requestAnimationFrame(n));
        };
      return (
        e.addEventListener("scroll", i, { passive: !0 }),
        n(),
        () => e.removeEventListener("scroll", i)
      );
    }, [c, s.verses]),
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
  let y = s.passage,
    b = !!y && 1 === y.from && 1 !== y.chapter && 9 !== y.chapter,
    pick = s.wordPick || emptyWordPick(),
    wordRep =
      wordRepChromeVisible(s.mode) && null != pick.open
        ? {
            open: pick.open,
            start: pick.start,
            end: pick.end,
            count: pick.count,
            plusOn,
            nudge: !!pick.nudge,
            onPin: (pos) => t.pinWordRep(pos),
            onCount: (n) => {
              let p = t.getSnapshot().wordPick || emptyWordPick(),
                span = mushafRepSpan(p, p.open || p.start || 1);
              t.playWordReps(span.start, span.end, n);
            },
            onAskPlus: () => ask("practice"),
            onClose: () => t.closeWordRep(),
            onDismiss: () => t.dismissWordRep(),
          }
        : null;
  return _jsx("div", {
    ref: d,
    className: "player-body",
    style: { padding: "16px 20px 6px" },
    children: _jsxs("div", {
            className: "mushaf-wrap".concat("relay" === s.mode ? " relay-on" : ""),
      children: [
        b &&
          _jsx("div", {
            className: "basmala",
            children: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
          }),
        _jsx("div", {
          className: "mushaf",
          children: s.verses.map((e, a) => {
            let r = t.isVerseDone(a),
              mask = mushafMaskReveal({
                mode: s.mode,
                verseIdx: a,
                currentIdx: s.vIdx,
                wordCount: e.words.length,
                currentReveal:
                  "masked" === s.mode ? t.maskStateFor(e).reveal : 0,
                verseDone: r,
              });
            if (!isHotVerse(a, u, p) && !mask.masked)
              return _jsx(
                ColdVerse,
                { verse: e, vIdx: a, done: r, onMarkTap: h },
                e.key,
              );
            let d = verseWordRange(a, s, i),
              c = {
                verse: e,
                vIdx: a,
                taj: s.taj,
                done: r,
                rangeStart: d.start,
                rangeEnd: d.end,
                pendingPos: d.pending,
                annotations: l(e.number),
                arrivedFrom:
                  (null == o ? void 0 : o.verse) === e.number
                    ? o.from
                    : 0,
                arrivedTo:
                  (null == o ? void 0 : o.verse) === e.number ? o.to : 0,
                onWordTap: n,
                onMarkTap: h,
                revealUpTo: mask.revealUpTo,
                masked: mask.masked,
                interactive: mushafWordsInteractive(s.mode),
                wordRep: a === s.vIdx ? wordRep : null,
              };
            return a === s.vIdx
              ? _jsx(MushafVerseActive, { engine: t, ...c }, e.key)
              : _jsx(MushafVerse, { ...c, curWord: 0 }, e.key);
          }),
        }),
      ],
    }),
  });
}

