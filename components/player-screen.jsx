"use client";

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icon";
import { OfflineBanner } from "@/components/offline-banner";
import { PracticeSheet } from "@/components/practice-sheet";
import { PlayerSettingsSheet } from "@/components/player-settings-sheet";
import { ReciterSheet } from "@/components/reciter-sheet";
import { PlaylistBar } from "@/components/playlist-bar";
import { useAppData } from "@/lib/app-data";
import { clampStopIndex, playlistHref, reciterIdForStyle, resolvePlaylist, stopLabel } from "@/lib/playlists";
import { fetchPassage, fetchTranslation } from "@/lib/api";
import { APP_NAME } from "@/lib/brand";
import { KEYS } from "@/lib/constants";
import {
  coversRange,
  drillHint,
  DRILL_HINT_MS,
  readRelayDraft,
  spanForVerse,
  indexOfVerseInPassage,
  verseRatioLabel,
  wordTapIntent,
  writeRelayDraft,
  playerPageKind,
  scrollPlayerToVerse,
} from "@/lib/player-chrome";
import { PlayerEngine } from "@/lib/player-engine";
import { PLUS_GATE_EVENT, usePlus } from "@/lib/plus";
import { markToday, upsertSession } from "@/lib/sessions";
import { setStore } from "@/lib/storage";
import { useToast } from "@/lib/toast";
import { PlayerHead, PlayerFoot, useOverlayHistory } from "@/components/player-transport";
import { WordStudyPop } from "@/components/word-study-pop";
import { ConfusableSheet, PhraseSheet, RelaySheet } from "@/components/player-sheets";
import { MushafFollowButton, MushafJobBar, MushafPage } from "@/components/player-mushaf";
import {
  FocusVersePage,
  FocusMaskedPage,
  FocusRelayPage,
  FocusWordPage,
} from "@/components/player-focus";

export function PlayerScreen(e) {
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
    eStyleQ = J.get("style"),
    ea = J.get("at"),
    eListId = J.get("list"),
    eStopRaw = Number(J.get("stop")),
    eWantPlay = "1" === J.get("play"),
    {
      chapters: en,
      recitations: eRecs,
      status: ei,
      reciterId: el,
      setReciterId: eo,
      reciterName: ed,
      pushRecent: ec,
    } = useAppData(),
    { showToast: eh } = useToast(),
    { plus: plusOn, askPlus: ask, ready: plusReady } = usePlus(),
    [eu] = useState(() => new PlayerEngine()),
    [ep, em] = useState("loading"),
    [ev, ex] = useState(!1),
    [ef, ey] = useState(!1),
    [eg, ej] = useState(!1),
    [ew, eb] = useState(!1),
    [eTools, eSetTools] = useState(!1),
    [eRepeat, eSetRepeat] = useState(!1),
    [eDock, eSetDock] = useState(!1),
    [eHint, eSetHint] = useState(""),
    eHintFor = useRef(null),
    eHintTimer = useRef(null),
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
    eVoice = eRecs.find((e) => e.id === eM),
    eList = useMemo(
      () =>
        resolvePlaylist(
          eListId,
          ed(eM),
          null == eVoice ? void 0 : eVoice.style,
        ),
      [eListId, eM, ed, eVoice],
    ),
    eStopN = eList ? clampStopIndex(eList, eStopRaw) : 0,
    eQuietUi = useCallback((keep) => {
      keep !== "meaning" && eN(null);
      keep !== "practice" && ey(!1);
      keep !== "reciter" && ej(!1);
      keep !== "relay" && eb(!1);
      keep !== "phrase" && eA(null);
      keep !== "twin" && eE(null);
      keep !== "settings" && eSetTools(!1);
      keep !== "range" && eS(null);
      keep !== "repeat" && eSetRepeat(!1);
      keep !== "dock" && eSetDock(!1);
    }, []),
    eV = !!(ek || ef || eg || ew || eW || eL || eTools || eI || eRepeat),
    eD = useCallback(() => eQuietUi(null), [eQuietUi]),
    eF = useRef(!1);
  useOverlayHistory(eV, eD, eF);
  let eO = en.find((e) => e.id === z),
    e_ =
      null !== (y = null == eO ? void 0 : eO.name_simple) && void 0 !== y
        ? y
        : "Surah ".concat(z),
    eHead = verseRatioLabel(
      e_,
      (ez.verses[ez.vIdx] && ez.verses[ez.vIdx].number) || V,
      (eO && eO.verses_count) || D,
    );
  (useEffect(() => () => eu.destroy(), [eu]),
    useEffect(() => eu.subscribeToast(eh), [eu, eh]),
    useEffect(() => {
      ((eu.onPlusRequired = ask), eu.setPlus(plusOn));
    }, [eu, plusOn, ask]),
    useEffect(() => {
      let on = () => eQuietUi(null);
      return (
        window.addEventListener(PLUS_GATE_EVENT, on),
        () => window.removeEventListener(PLUS_GATE_EVENT, on)
      );
    }, [eQuietUi]),
    useEffect(() => {
      eN(null);
      eS(null);
      eSetRepeat(!1);
      eA(null);
      eE(null);
    }, [ez.mode, ez.style]),
    useEffect(() => {
      eu.setReciters(eRecs);
    }, [eu, eRecs]),
    useEffect(() => {
      if ("ready" !== ei || !eRecs.length) return;
      if ("focus" !== ez.style && !ez.reciterId) return;
      let want = reciterIdForStyle(
        ez.style,
        eRecs,
        getStore(KEYS.reciter) ?? el,
        getStore(KEYS.focusReciter),
      );
      if (!want || want === ez.reciterId) return;
      eu.switchReciter(want, ed(want), !0);
    }, [ez.style, ei, eRecs, el, eu, ed, ez.reciterId]),
    useEffect(() => {
      if (!eList || !eListId) {
        ((eu.onPassageEnd = null),
          (eu.onNeedNextStop = null),
          (eu.onNeedPrevStop = null));
        return;
      }
      let go = (next, play) => {
        if (next < 0 || next >= eList.stops.length) return !1;
        if (!plusOn) return (ask("playlists"), !0);
        let href = playlistHref({
          listId: eListId,
          reciterId: eM,
          stop: next,
          play: play,
        });
        return href ? (Y.replace(href), !0) : !1;
      };
      ((eu.onPassageEnd = () => go(eStopN + 1, !0)),
        (eu.onNeedNextStop = () => go(eStopN + 1, eu.getSnapshot().playing)),
        (eu.onNeedPrevStop = () => go(eStopN - 1, eu.getSnapshot().playing)));
      return () => {
        ((eu.onPassageEnd = null),
          (eu.onNeedNextStop = null),
          (eu.onNeedPrevStop = null));
      };
    }, [eu, eList, eListId, eStopN, plusOn, ask, eM, Y]),
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
                  }),
                  eWantPlay && eu.playAudio()));
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
    }, [z, V, D, eM, ei, eu, eWantPlay, plusOn]));
  let eH = useCallback(
      (e, t, s, pointerType) => {
        let r = eu.getSnapshot(),
          a = r.pendingLoopStart;
        if (a) {
          if (a.vIdx === e && a.w !== t) {
            (eQuietUi("range"),
              eS({
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
        let intent = wordTapIntent(r.style, r.mode, pointerType);
        if ("wordRep" === intent) {
          (eQuietUi(null), eu.tapWordRep(e, t));
          return;
        }
        if ("meaning" === intent) {
          (eS(null),
            eQuietUi("meaning"),
            eN({ vIdx: e, pos: t, rect: s.getBoundingClientRect() }));
          return;
        }
        eu.playWordOneshot(e, t);
      },
      [eu, eh, eQuietUi],
    ),
    eHold = useCallback((e, t, s) => {
      let r = eu.getSnapshot();
      if (r.pendingLoopStart || "word" === r.mode) return;
      (eS(null),
        eQuietUi("meaning"),
        eN({ vIdx: e, pos: t, rect: s.getBoundingClientRect() }));
    }, [eu, eQuietUi]),
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
      if (eStyleQ !== "focus" && eStyleQ !== "mushaf") return;
      if (eStyleQ !== eu.getSnapshot().style) eu.setStyle(eStyleQ);
    }, [ep, eStyleQ, eu]),
    useEffect(() => {
      if ("ready" !== ep || !plusReady) return;
      let e =
        er && ["word", "verse", "masked", "relay"].includes(er)
          ? er
          : "verse";
      if (e !== eu.getSnapshot().mode) eu.setMode(e);
      if ("relay" !== eu.getSnapshot().mode) return;
      let draft = readRelayDraft();
      if (draft && draft.start) {
        writeRelayDraft({ ...draft, start: !1 });
        eu.beginRelay(draft.order, draft.vFrom, draft.vTo, draft.rounds);
      }
    }, [ep, er, plusReady, plusOn]),
    useEffect(() => {
      if ("ready" !== ep || !ea) return;
      let e = eu
        .getSnapshot()
        .verses.findIndex((e) => e.number === Number(ea));
      e >= 0 && e !== eu.getSnapshot().vIdx && eu.loadVerseAudio(e, !1);
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
      let text = drillHint(ez.mode);
      if (!text) {
        (eSetHint(""), (eHintFor.current = null));
        eHintTimer.current && clearTimeout(eHintTimer.current);
        return;
      }
      if (eTools) return;
      if (eHintFor.current === ez.mode) return;
      eHintFor.current = ez.mode;
      eSetHint(text);
      eHintTimer.current && clearTimeout(eHintTimer.current);
      eHintTimer.current = setTimeout(() => eSetHint(""), DRILL_HINT_MS);
    }, [ez.mode, eTools]),
    useEffect(
      () => () => {
        eHintTimer.current && clearTimeout(eHintTimer.current);
      },
      [],
    ),
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
      (eQuietUi("phrase"), eA({ vIdx: e, pos: t }));
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
        _jsx(PlayerHead, {
          title: eHead,
          backLabel: $ ? $.split(" ")[0] : null,
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
                  onClick: () => Y.push("/home"),
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
        _jsx(PlayerHead, {
          title: eHead,
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
    ePage = playerPageKind(
      ez.style,
      ez.mode,
      !!(null === (t = ez.relay) || void 0 === t ? void 0 : t.active),
    ),
    eZ =
      "relay" === ePage
        ? _jsx(FocusRelayPage, { ...eX })
        : "masked" === ePage
          ? _jsx(FocusMaskedPage, { ...eX })
          : "word" === ePage
            ? _jsx(FocusWordPage, { ...eX })
            : "focus" === ePage
              ? _jsx(FocusVersePage, { ...eX })
              : _jsx(MushafPage, { ...eX });
  return _jsxs("main", {
    className: "shell player",
    id: "main",
    children: [
      _jsxs("div", {
        className: "player-chrome",
        children: [
          _jsx(PlayerHead, {
            title: eHead,
            backLabel: eList ? "Playlists" : $ ? $.split(" ")[0] : null,
            onBack: eList ? () => Y.push("/listen") : undefined,
            onSettings: () => {
              (eQuietUi("settings"), eSetTools(!0));
            },
            settingsOpen: eTools,
          }),
          "mushaf" === ez.style
            ? _jsx(MushafJobBar, { engine: eu, state: ez })
            : null,
          eHint
            ? _jsx("p", {
                className: "player-drill-hint",
                role: "status",
                children: eHint,
              })
            : null,
          eList
            ? _jsx(PlaylistBar, {
                title: eList.title,
                index: eStopN,
                total: eList.stops.length,
                plusOn: plusOn,
                nextLabel:
                  eStopN < eList.stops.length - 1
                    ? stopLabel(eList.stops[eStopN + 1], en)
                    : null,
              })
            : null,
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
                    "word" === ez.mode ? "Word Reps" : "Loop",
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
                "word" === ez.mode ? "Word Reps" : "Loop",
              ],
            }),
          ],
        }),
      _jsx(MushafFollowButton, { engine: eu, style: ez.style }),
      _jsx(PlayerFoot, {
        engine: eu,
        state: ez,
        repeatOpen: eRepeat,
        setRepeatOpen: eSetRepeat,
        transOpen: eDock,
        setTransOpen: eSetDock,
        onOccupy: eQuietUi,
      }),
      eTools &&
        _jsx(PlayerSettingsSheet, {
          engine: eu,
          state: ez,
          verseNumber:
            (ez.verses[ez.vIdx] && ez.verses[ez.vIdx].number) || V,
          qariName: ed(
            null !== (b = ez.reciterId) && void 0 !== b ? b : eM,
          ),
          onClose: () => eSetTools(!1),
          onOpenReciter: () => {
            (eQuietUi("reciter"), ej(!0));
          },
          onPickMode: (e) => {
            (eHintFor.current = null);
            eSetTools(!1);
            if ("verse" === e) {
              eu.setMode("verse");
              return;
            }
            if ("relay" === e) {
              let order = [
                {
                  kind: "qari",
                  reciterId: null != ez.reciterId ? ez.reciterId : eM,
                },
                { kind: "you" },
              ];
              let from = (ez.verses[0] && ez.verses[0].number) || V;
              let to =
                (ez.verses[ez.verses.length - 1] &&
                  ez.verses[ez.verses.length - 1].number) ||
                D;
              eu.beginRelay(order, from, to, 2);
              return;
            }
            eu.setMode(e);
          },
          onLocate: (ch, verse) => {
            let count =
                (en.find((item) => item.id === ch) &&
                  en.find((item) => item.id === ch).verses_count) ||
                verse,
              idx = indexOfVerseInPassage(
                ez.verses,
                ch,
                z,
                V,
                D,
                verse,
              );
            if (idx >= 0) {
              (eu.loadVerseAudio(idx, !1),
                eSetTools(!1),
                scrollPlayerToVerse(idx));
              return;
            }
            let span = spanForVerse(verse, count),
              n = new URLSearchParams({
                from: String(span.from),
                to: String(span.to),
                at: String(verse),
              });
            (null != ez.reciterId && n.set("reciter", String(ez.reciterId)),
              "focus" === ez.style && n.set("style", "focus"),
              "verse" !== ez.mode && n.set("mode", ez.mode),
              (eF.current = !0),
              eSetTools(!1),
              Y.replace("/read/".concat(ch, "?").concat(n.toString())));
          },
          onTranslationId: (id) => {
            setStore(KEYS.translationId, id);
            fetchTranslation(z, id)
              .then((t) => eu.setVerseTranslations(t.byVerse, t.name))
              .catch(() => {});
          },
        }),
      ek &&
        eK &&
        _jsx(WordStudyPop, {
          word: eK,
          target: ek,
          loopCount: ez.loopCount,
          isWordRangeMode: "word" === ez.mode,
          mushaf: "mushaf" === ez.style,
          onSetCount: (e) => eu.setLoopCount(e),
          onPlayWord: () => {
            (eu.playWordClip(ek.vIdx, ek.pos), eN(null));
          },
          onPlayFromHere: () => {
            (eu.playFromHere(ek.vIdx, ek.pos), eN(null));
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
          onPin: () => {
            if ("word" !== eu.getSnapshot().mode) eu.setMode("word");
            if ("word" !== eu.getSnapshot().mode) return;
            (eu.setPendingLoopStart(ek.vIdx, ek.pos), eN(null));
          },
          onRepsCount: (n) => {
            if ("word" !== eu.getSnapshot().mode) eu.setMode("word");
            if ("word" !== eu.getSnapshot().mode) return;
            (eu.startWordDrill(ek.pos, ek.pos, n), eN(null));
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
            (eQuietUi("twin"), a && eE({ mark: a, vIdx: ek.vIdx }));
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
          return _jsx(PhraseSheet, {
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
          return _jsx(ConfusableSheet, {
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
            (eQuietUi("settings"),
              eu.setMode(s),
              "relay" === eu.getSnapshot().mode && eSetTools(!0));
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
        _jsx(RelaySheet, {
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


