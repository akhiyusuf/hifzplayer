"use client";

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { fmtTime } from "@/lib/audio";
import { nextRate, rateFace } from "@/lib/player-chrome";
import { usePlus } from "@/lib/plus";

export function useOverlayHistory(e, t, s) {
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

export function PlayerSeekBar(e) {
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

export function PlayerFoot(e) {
  let {
      engine: t,
      state: s,
      repeatOpen,
      setRepeatOpen,
      transOpen,
      setTransOpen,
      onOccupy = () => {},
    } = e,
    { plus: plusOn } = usePlus(),
    focusLocked = !1,
    d = s.showTranslation && "mushaf" === s.style ? s.verses[s.vIdx] : void 0,
    c = "relay" === s.mode,
    u = "word" === s.mode,
    p = s.wordStep.range,
    verseNums = s.verses.map((v) => v.number),
    loopFromDefault = (s.verses[s.vIdx] && s.verses[s.vIdx].number) || verseNums[0] || 1,
    loopToDefault = verseNums[verseNums.length - 1] || loopFromDefault,
    [loopFrom, setLoopFrom] = useState(loopFromDefault),
    [loopTo, setLoopTo] = useState(loopToDefault),
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
          // Word Reps range uses loop as its only driver — cancel must finish the drill.
          clear: () => ("word" === s.mode ? t.clearDrill() : t.clearLoop()),
        }
      : p
        ? {
            label: "Word Reps: words "
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
  return _jsxs("footer", {
    className: "player-foot",
    children: [
      (null == d ? void 0 : d.translation) &&
        _jsxs("button", {
          type: "button",
          className: "trans-dock tap".concat(transOpen ? "" : " compact"),
          onClick: () => {
            if (transOpen) {
              setTransOpen(!1);
              return;
            }
            (onOccupy("dock"), setTransOpen(!0));
          },
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
        className: "player-deck",
        children: [
          _jsx(PlayerSeekBar, { engine: t, disabled: c }),
          _jsxs("div", {
            className: "transport",
            children: [
          _jsx("button", {
            type: "button",
            className: "tr-btn speed-count tap",
            onClick: () => t.setRate(nextRate(s.rate)),
            "aria-label": "Playback speed ".concat(rateFace(s.rate), ". Tap to change"),
            children: rateFace(s.rate),
          }),
          _jsx("button", {
            className: "tr-btn tap",
            onClick: () => t.prev(),
            "aria-label": u ? "Previous word" : "Previous verse",
            children: _jsx(Icon, {
              name: "skip-back",
              size: 22,
            }),
          }),
          _jsx("button", {
            className: "play-btn".concat(focusLocked && !s.playing ? " locked" : ""),
            onClick: () => t.togglePlay(),
            "aria-label": s.playing ? "Pause" : "Play",
            children: _jsx(Icon, {
              name: s.playing ? "pause" : "play",
              size: 22,
            }),
          }),
          _jsx("button", {
            className: "tr-btn tap",
            onClick: () => t.next(),
            "aria-label": u ? "Next word" : "Next verse",
            children: _jsx(Icon, {
              name: "skip-forward",
              size: 22,
            }),
          }),
          _jsxs("span", {
            className: "repeat-wrap",
            children: [
              repeatOpen && !s.verseLoop
                ? _jsxs("div", {
                    className: "repeat-pop",
                    role: "dialog",
                    "aria-label": "Repeat",
                    onClick: (e) => e.stopPropagation(),
                    children: [
                      _jsx("button", {
                        type: "button",
                        className: "tap",
                        onClick: () => {
                          (setRepeatOpen(!1), t.toggleVerseLoop());
                        },
                        children: "This verse",
                      }),
                      _jsxs("div", {
                        className: "sidebar-range",
                        children: [
                          _jsxs("label", {
                            className: "range-field",
                            children: [
                              _jsx("span", { className: "label-eyebrow", children: "From" }),
                              _jsxs("span", {
                                className: "select-box",
                                children: [
                                  loopFrom,
                                  _jsx(Icon, { name: "chevron-down", size: 14 }),
                                  _jsx("select", {
                                    "aria-label": "From verse",
                                    value: loopFrom,
                                    onChange: (e) => {
                                      let n = Number(e.target.value);
                                      (setLoopFrom(n), n > loopTo && setLoopTo(n));
                                    },
                                    children: verseNums.map((n) =>
                                      _jsx("option", { value: n, children: n }, n),
                                    ),
                                  }),
                                ],
                              }),
                            ],
                          }),
                          _jsxs("label", {
                            className: "range-field",
                            children: [
                              _jsx("span", { className: "label-eyebrow", children: "To" }),
                              _jsxs("span", {
                                className: "select-box",
                                children: [
                                  loopTo,
                                  _jsx(Icon, { name: "chevron-down", size: 14 }),
                                  _jsx("select", {
                                    "aria-label": "To verse",
                                    value: loopTo,
                                    onChange: (e) => {
                                      let n = Number(e.target.value);
                                      (setLoopTo(n), n < loopFrom && setLoopFrom(n));
                                    },
                                    children: verseNums.map((n) =>
                                      _jsx("option", { value: n, children: n }, n),
                                    ),
                                  }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      }),
                      _jsx("button", {
                        type: "button",
                        className: "btn-primary",
                        onClick: () => {
                          (setRepeatOpen(!1), t.setVerseLoopRange(loopFrom, loopTo));
                        },
                        children: "Repeat this range",
                      }),
                    ],
                  })
                : null,
              _jsx("button", {
                type: "button",
                className: "tr-btn tap"
                  .concat(s.verseLoop ? " on" : "")
                  .concat(focusLocked && !s.verseLoop ? " locked" : "")
                  .concat(repeatOpen ? " on" : ""),
                "aria-pressed": !!s.verseLoop,
                "aria-expanded": !!repeatOpen,
                "aria-label": s.verseLoop
                  ? s.verseLoopRange
                    ? "Stop repeating verses "
                        .concat(s.verseLoopRange.from, "–")
                        .concat(s.verseLoopRange.to)
                    : "Stop repeating this verse"
                  : "Repeat this verse or a range",
                disabled: c,
                onClick: () => {
                  if (focusLocked && !s.verseLoop) {
                    t.toggleVerseLoop();
                    return;
                  }
                  if (s.verseLoop) {
                    (setRepeatOpen(!1), t.toggleVerseLoop());
                    return;
                  }
                  if (repeatOpen) {
                    setRepeatOpen(!1);
                    return;
                  }
                  (onOccupy("repeat"),
                    setLoopFrom(loopFromDefault),
                    setLoopTo(loopToDefault),
                    setRepeatOpen(!0));
                },
                children: _jsx(Icon, { name: "repeat", size: 20 }),
              }),
            ],
          }),
        ],
      }),
        ],
      }),
    ],
  });
}

export function PlayerHead(e) {
  let {
      title: t,
      backLabel: p = null,
      onBack: onBack = null,
      onSettings: onSettings = null,
      settingsOpen: settingsOpen = !1,
    } = e,
    m = useRouter();
  return _jsxs("header", {
    className: "player-head",
    children: [
      _jsx("button", {
        className: "icon-btn sm tap",
        onClick: () =>
          onBack ? onBack() : p ? m.back() : m.push("/home"),
        "aria-label": p ? "Back to ".concat(p) : "Back to passage list",
        children: _jsx(Icon, { name: "chevron-left", size: 19 }),
      }),
      _jsx("div", {
        className: "ttl",
        children: _jsx("h1", { children: t }),
      }),
      onSettings
        ? _jsx("button", {
            type: "button",
            className: "icon-btn sm tap".concat(settingsOpen ? " on" : ""),
            "aria-label": "Settings",
            "aria-expanded": !!settingsOpen,
            "aria-haspopup": "dialog",
            onClick: onSettings,
            children: _jsx(Icon, { name: "settings", size: 18 }),
          })
        : _jsx("span", { className: "icon-btn sm", "aria-hidden": "true" }),
    ],
  });
}

