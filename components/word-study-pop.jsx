"use client";

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Icon } from "@/components/icon";
import { WORD_REP_COUNTS, loopCountFace } from "@/lib/player-chrome";
import { usePlus } from "@/lib/plus";

export function WordStudyPop(e) {
  var t, s, n, i, l;
  let {
      word: d,
      target: c,
      onPlayWord: v,
      onPlayFromHere: onPlayFromHere,
      onClose: y,
      annotation: g,
      onOpenPhrase: j,
      onOpenConfusable: w,
      mushaf: mushafLite,
      onPin: onPinWord,
      onRepsCount: onRepsCount,
      pinActive: pinActive,
      showPlay: showPlay = true,
      showReps: showReps = false,
    } = e,
    b = useRef(null),
    [k, N] = useState(null),
    { plus: plusOn, askPlus: ask } = usePlus(),
    popW = mushafLite ? 268 : 262;
  (useLayoutEffect(() => {
    let node = b.current,
      w = (null == node ? void 0 : node.offsetWidth) || popW,
      h = (null == node ? void 0 : node.offsetHeight) || 240,
      r = c.rect,
      gap = mushafLite ? 8 : 12,
      a = Math.min(
        window.innerWidth - w - 10,
        Math.max(10, r.left + r.width / 2 - w / 2),
      ),
      n = r.bottom + gap,
      i = n + h > window.innerHeight - 12;
    N({
      top: i ? Math.max(10, r.top - h - gap) : n,
      left: a,
      flipped: i,
      w,
    });
  }, [c, popW, mushafLite]),
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
  return _jsx("div", {
    className: "pop-wrap",
    onClick: y,
    children: _jsxs("div", {
      className: "popover".concat(mushafLite ? " mushaf-word-pop" : ""),
      ref: b,
      role: "dialog",
      "aria-label": "Study ".concat(d.ar),
      "data-pop-play": showPlay ? "1" : "0",
      "data-pop-reps": showReps ? "1" : "0",
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
              (null !== (t = null == k ? void 0 : k.w) && void 0 !== t
                ? t
                : popW) - 20,
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
        showPlay
          ? _jsxs("div", {
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
          ],
        })
          : null,
        showReps
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
                  let inf = 0 === n;
                  return _jsx(
                    "button",
                    {
                      type: "button",
                      className: ""
                        .concat(locked ? "locked" : "")
                        .concat(inf ? " inf" : ""),
                      onClick: () =>
                        locked
                          ? (ask("practice"), y())
                          : onRepsCount && onRepsCount(n),
                      "aria-label": inf
                        ? "Repeat until you stop"
                        : "Replay ".concat(n, " times"),
                      children: locked
                        ? _jsxs("span", {
                            className: inf ? "p-drill-inf" : "",
                            style: {
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                            },
                            children: [
                              inf ? "∞" : "".concat(loopCountFace(n), "×"),
                              _jsx(Icon, { name: "sparkles", size: 11 }),
                            ],
                          })
                        : inf
                          ? "∞"
                          : "".concat(loopCountFace(n), "×"),
                    },
                    n,
                  );
                }),
              ],
            })
          : null,
        /* Recurring phrases and near-twins are coming soon. */
      ],
    }),
  });
}

