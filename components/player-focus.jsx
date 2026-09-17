"use client";

import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { FocusStage } from "@/components/focus-stage";
import { Icon } from "@/components/icon";
import { FocusLines, MushafVerse, MushafVerseActive } from "@/components/player-verse";
import { useAppData } from "@/lib/app-data";
import { emptyWordPick, wantsTranslation, relayRoundLabel, relayTurnName } from "@/lib/player-chrome";
import { usePlus } from "@/lib/plus";

export function FocusVersePage(e) {
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
    progress:
      s.verses.length > 1
        ? {
            now: s.vIdx + 1,
            max: s.verses.length,
            label: "Verse",
          }
        : undefined,
    gloss: wantsTranslation() ? u || i.translation || null : null,
    children: _jsx(FocusLines, {
      verse: i,
      vIdx: s.vIdx,
      curWord: s.curWord,
      pendingW: s.pendingLoopStart ? s.pendingLoopStart.w : 0,
      onTap: a,
      onHold: n,
    }),
  });
}
export function FocusMaskedPage(e) {
  let { engine: t, state: s, annFor: a } = e,
    n = s.verses[s.vIdx];
  if (!n) return null;
  let i = t.maskStateFor(n),
    l = n.words.length,
    c = i.maxRev >= l;
  return _jsx(FocusStage, {
    title: "Revealed ".concat(i.maxRev, " of ", l),
    meta: n.key,
    hint: undefined,
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
    children: _jsx(MushafVerse, {
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
      breakWaqf: !0,
    }),
  });
}
export function FocusRelayPage(e) {
  let { engine: t, state: s, annFor: a } = e,
    { reciterName: n } = useAppData(),
    l = s.relay;
  if (!l) return null;
  let d = l.turns[l.idx],
    c = s.verses[s.vIdx];
  if (!d || !c) return null;
  let h = "you" === d.kind,
    u = l.turns.length - l.idx,
    p = relayRoundLabel(l.round, l.rounds);
  return _jsx(FocusStage, {
    title: p,
    meta: h
      ? "Your turn \xb7 ".concat(u, " left")
      : "".concat(u, " ", 1 === u ? "turn" : "turns", " left"),
    hint: h
      ? "Recite aloud — the reciter plays muted to pace you"
      : l.waitingTap
        ? "Tap play to begin"
        : undefined,
    extra: _jsx("ol", {
      className: "relay-queue",
      "aria-label": "Turn order",
      children: l.turns.map((e, t) => {
        let s = t < l.idx,
          a = t === l.idx,
          i = relayTurnName("you" === e.kind ? "you" : "qari", n(e.reciterId));
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
                _jsx("span", {
                  className: "turn-text",
                  children: _jsx("b", { children: i }),
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
    children: _jsx(MushafVerseActive, {
      engine: t,
      verse: c,
      vIdx: s.vIdx,
      taj: s.taj,
      done: !1,
      rangeStart: 0,
      rangeEnd: 0,
      pendingPos: 0,
      revealUpTo: 0,
      masked: !1,
      interactive: !1,
      annotations: a(c.number),
      breakWaqf: !0,
    }),
  });
}
export function FocusWordPage(e) {
  let { engine: t, state: i, onWordTap: l } = e,
    { plus: plusOn, askPlus: ask } = usePlus(),
    h = i.verses[i.vIdx];
  if (!h) return null;
  let pick = i.wordPick || emptyWordPick(),
    m = i.curWord || i.wordStep.w || 1,
    w = h.words.find((e) => e.pos === m) || h.words[0],
    y = w
      ? [w.tr, w.gloss].filter(Boolean).join(" \xb7 ")
      : "";
  return _jsx(FocusStage, {
    title: w ? w.ar : "Word Reps",
    meta: h.key,
    hint: undefined,
    gloss: wantsTranslation() ? y || null : null,
    children: _jsx(FocusLines, {
      verse: h,
      vIdx: i.vIdx,
      curWord: m,
      pendingW: pick.start && !pick.end ? pick.start : 0,
      onTap: l,
      wordRep: {
        open: pick.open,
        start: pick.start,
        end: pick.end,
        count: pick.count,
        plusOn,
        nudge: !!pick.nudge,
        onPin: (pos) => t.pinWordRep(pos),
        onCount: (n) => t.setWordRepCount(n),
        onAskPlus: () => ask("repeats"),
        onClose: () => t.closeWordRep(),
        onDismiss: () => t.dismissWordRep(),
      },
    }),
  });
}

