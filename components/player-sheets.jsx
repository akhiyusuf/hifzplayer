"use client";

import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {
  useEffect,
  useState,
} from "react";
import { Icon } from "@/components/icon";
import { Sheet } from "@/components/sheet";
import { useAppData } from "@/lib/app-data";
import { isPaidRepeat } from "@/lib/billing/gates";
import { fetchTransliteration } from "@/lib/api";
import { usePlus } from "@/lib/plus";

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

export function ConfusableSheet(e) {
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

export function PhraseSheet(e) {
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

export function RelaySheet(e) {
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

