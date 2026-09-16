"use client";

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Icon } from "@/components/icon";
import { isPaidRepeat } from "@/lib/billing/gates";
import { LOOP_COUNTS } from "@/lib/constants";
import { WORD_REP_COUNTS, loopCountFace } from "@/lib/player-chrome";
import { usePlus } from "@/lib/plus";

function loopFace(e) {
  return 0 === e ? "∞" : "\xd7".concat(e);
}
export function WordStudyPop(e) {
  var t, s, n, i, l;
  let {
      word: d,
      target: c,
      loopCount: u,
      isWordRangeMode: p,
      onSetCount: m,
      onPlayWord: v,
      onPlayFromHere: onPlayFromHere,
      onLoopWord: x,
      onStartRange: f,
      onClose: y,
      annotation: g,
      onOpenPhrase: j,
      onOpenConfusable: w,
      mushaf: mushafLite,
      onPin: onPinWord,
      onRepsCount: onRepsCount,
      pinActive: pinActive,
    } = e,
    b = useRef(null),
    [k, N] = useState(null),
    { plus: plusOn, askPlus: ask } = usePlus(),
    popW = mushafLite ? 300 : 262;
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
        window.innerWidth - popW - 10,
        Math.max(10, r.left + r.width / 2 - popW / 2),
      ),
      n = r.bottom + 12,
      i = n + s > window.innerHeight - 12;
    N({ top: i ? Math.max(10, r.top - s - 12) : n, left: a, flipped: i });
  }, [c, popW]),
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
  let S = p ? "Word Reps" : "Loop";
  return _jsx("div", {
    className: "pop-wrap",
    onClick: y,
    children: _jsxs("div", {
      className: "popover".concat(mushafLite ? " mushaf-word-pop" : ""),
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
              popW - 20,
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
            mushafLite
              ? null
              : _jsx("span", { className: "ar", children: d.ar }),
            d.tr &&
              _jsx("span", { className: "tr", children: d.tr }),
            _jsx("span", {
              className: "gl",
              children: d.gloss || "—",
            }),
          ],
        }),
        mushafLite
          ? null
          : _jsxs("div", {
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
                            loopFace(e),
                            _jsx(Icon, { name: "sparkles", size: 11 }),
                          ],
                        })
                      : loopFace(e),
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
            _jsxs("div", {
              className: "p-actions-row",
              children: [
                _jsxs("button", {
                  className: "pri",
                  onClick: v,
                  children: [
                    _jsx(Icon, {
                      name: "volume-2",
                      size: 15,
                    }),
                    "Play word",
                  ],
                }),
                _jsxs("button", {
                  className: "sec",
                  onClick: onPlayFromHere,
                  children: [
                    _jsx(Icon, { name: "play", size: 15 }),
                    "Play from here",
                  ],
                }),
              ],
            }),
            mushafLite
              ? null
              : _jsxs("button", {
              className: "sec",
              onClick: x,
              children: [
                _jsx(Icon, { name: "repeat", size: 15 }),
                S,
                " this word ",
                loopFace(u),
              ],
            }),
          ],
        }),
        mushafLite
          ? _jsxs("div", {
              className: "p-drill",
              role: "group",
              "aria-label": "Word Reps",
              children: [
                _jsxs("button", {
                  type: "button",
                  className: "sec".concat(pinActive ? " on" : ""),
                  "aria-pressed": !!pinActive,
                  onClick: () =>
                    plusOn
                      ? onPinWord && onPinWord()
                      : (ask("practice"), y()),
                  children: [
                    _jsx(Icon, { name: "pin", size: 14 }),
                    "Pin",
                  ],
                }),
                WORD_REP_COUNTS.map((n) => {
                  let locked = !plusOn;
                  return _jsx(
                    "button",
                    {
                      type: "button",
                      className: locked ? "locked" : "",
                      onClick: () =>
                        locked
                          ? (ask("practice"), y())
                          : onRepsCount && onRepsCount(n),
                      "aria-label":
                        0 === n
                          ? "Repeat until you stop"
                          : "Replay ".concat(n, " times"),
                      children: locked
                        ? _jsxs("span", {
                            style: {
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                            },
                            children: [
                              0 === n ? "∞" : "".concat(loopCountFace(n), "×"),
                              _jsx(Icon, { name: "sparkles", size: 11 }),
                            ],
                          })
                        : 0 === n
                          ? "∞"
                          : "".concat(loopCountFace(n), "×"),
                    },
                    n,
                  );
                }),
              ],
            })
          : _jsxs("button", {
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

