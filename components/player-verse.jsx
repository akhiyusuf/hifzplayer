"use client";

import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { WordRepBar } from "@/components/word-rep-bar";
import { mushafMaskReveal, mushafPinHighlight } from "@/lib/player-chrome";
import { tajToSpans } from "@/lib/tajweed";
import { toArabicDigits } from "@/lib/audio";
import { isWaqfBreak, phrasesOf, visibleMarksAfter } from "@/lib/waqf";

export let PlayerWord = memo(function (e) {
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
    lastPtr = useRef("mouse"),
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
      (function (e, t) {
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
          lastPtr.current = e.pointerType || "mouse";
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
          null == m || m(s, t.pos, e.currentTarget, lastPtr.current);
        },
        onKeyDown: (e) => {
          ("Enter" === e.key || " " === e.key) &&
            (e.preventDefault(),
            e.stopPropagation(),
            null == m || m(s, t.pos, e.currentTarget, "mouse"));
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
export function FocusLines(e) {
  let {
      verse: t,
      vIdx: s,
      curWord: n,
      pendingW: i,
      onTap: l,
      onHold: o,
      interactive: d = !0,
      wordRep: wordRep = null,
    } = e;
  return phrasesOf(t).map((a, r) =>
    _jsx(
      "span",
      {
        className: "focus-line",
        children: a.map((e) => {
          let start = wordRep && wordRep.start,
            end = wordRep && wordRep.end,
            inPin =
              null != start &&
              (null == end
                ? e.pos === start
                : e.pos >= Math.min(start, end) &&
                  e.pos <= Math.max(start, end));
          return _jsxs(
            _Fragment,
            {
              children: [
                _jsxs("span", {
                  className: "focus-word-wrap",
                  children: [
                    _jsx(PlayerWord, {
                      word: e,
                      vIdx: s,
                      taj: !1,
                      isCur: e.pos === n,
                      inRange: !!inPin,
                      isRangeStart: start === e.pos,
                      isRangeEnd: end === e.pos,
                      isPending: i === e.pos,
                      mask: null,
                      interactive: d,
                      onTap: l,
                      onHold: o,
                    }),
                    wordRep && wordRep.open === e.pos
                      ? _jsx(WordRepBar, {
                          pos: e.pos,
                          start: wordRep.start,
                          end: wordRep.end,
                          count: wordRep.count,
                          plusOn: wordRep.plusOn,
                          onPin: wordRep.onPin,
                          onCount: wordRep.onCount,
                          onAskPlus: wordRep.onAskPlus,
                          onClose: wordRep.onClose,
                          onDismiss: wordRep.onDismiss,
                          nudge: !!wordRep.nudge,
                        })
                      : null,
                  ],
                }),
                visibleMarksAfter(t, e.pos).map((t, s) =>
                  _jsx(
                    "span",
                    { className: "focus-waqf", children: t.ar },
                    s,
                  ),
                ),
                " ",
              ],
            },
            e.pos,
          );
        }),
      },
      r,
    ),
  );
}

export let MushafVerse = memo(function (e) {
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
      breakWaqf: k = !1,
      wordRep: wordRep = null,
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
              _jsxs("span", {
                className:
                  wordRep && wordRep.open === e.pos
                    ? "focus-word-wrap"
                    : "mushaf-word-wrap",
                children: [
                  _jsx(PlayerWord, {
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
                  wordRep && wordRep.open === e.pos
                    ? _jsx(WordRepBar, {
                        pos: e.pos,
                        start: wordRep.start,
                        end: wordRep.end,
                        count: wordRep.count,
                        plusOn: wordRep.plusOn,
                        onPin: wordRep.onPin,
                        onCount: wordRep.onCount,
                        onAskPlus: wordRep.onAskPlus,
                        onClose: wordRep.onClose,
                        onDismiss: wordRep.onDismiss,
                        nudge: !!wordRep.nudge,
                      })
                    : null,
                ],
              }),
              null === (t = j.get(e.pos)) || void 0 === t
                ? void 0
                : t.map((e, t) =>
                    _jsx(
                      "span",
                      {
                        className: "focus-waqf",
                        style: { color: "var(--text-muted)" },
                        children: e,
                      },
                      t,
                    ),
                  ),
              k &&
              (isWaqfBreak(e.ar) ||
                (j.get(e.pos) || []).some((e) => isWaqfBreak(e)))
                ? _jsx("br", { className: "waqf-br" })
                : w
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
export function verseWordRange(e, t, s) {
  var r;
  let pin = mushafPinHighlight(e, t.vIdx, t.wordPick);
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
        : pin
          ? pin
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
function escHtml(e) {
  return String(e ?? "").replace(
    /[&<>"']/g,
    (e) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[e],
  );
}
export let ColdVerse = memo(function (e) {
  let { verse: t, vIdx: s, done: n, onMarkTap: i } = e,
    l = useMemo(
      () =>
        t.words.map((e) => escHtml(e.ar)).join(" ") +
        ' <span class="vmark">' +
        toArabicDigits(t.number) +
        "</span> ",
      [t],
    );
  return _jsx("span", {
    className: "v cold".concat(n ? " done" : ""),
    "data-vi": s,
    role: "button",
    tabIndex: 0,
    "aria-label": "Play verse ".concat(t.key),
    onClick: () => i(s),
    onKeyDown: (e) => {
      ("Enter" === e.key || " " === e.key) && (e.preventDefault(), i(s));
    },
    dangerouslySetInnerHTML: { __html: l },
  });
});
export function MushafVerseActive(e) {
  let t = useSyncExternalStore(
      e.engine.subscribeWord,
      e.engine.getWordSnap,
      e.engine.getWordSnap,
    ),
    s = t.vIdx === e.vIdx ? t.curWord : 0,
    n = e.revealUpTo || 0;
  if (e.masked) {
    n = mushafMaskReveal({
      mode: "masked",
      verseIdx: e.vIdx,
      currentIdx: t.vIdx,
      wordCount: e.verse.words.length,
      currentReveal: Math.max(n, e.engine.maskStateFor(e.verse).reveal),
      verseDone: e.done,
      curWord: s,
    }).revealUpTo;
  }
  return _jsx(MushafVerse, {
    verse: e.verse,
    vIdx: e.vIdx,
    taj: e.taj,
    curWord: s,
    done: e.done,
    rangeStart: e.rangeStart,
    rangeEnd: e.rangeEnd,
    pendingPos: e.pendingPos,
    revealUpTo: n,
    masked: !!e.masked,
    interactive: !1 !== e.interactive,
    annotations: e.annotations,
    arrivedFrom: e.arrivedFrom,
    arrivedTo: e.arrivedTo,
    onWordTap: e.onWordTap,
    onMarkTap: e.onMarkTap,
    wordRep: e.wordRep,
    breakWaqf: !!e.breakWaqf,
  });
}

