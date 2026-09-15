import { PLUS_NAME } from "./brand.ts";
import { SALAAM } from "./greeting.ts";

export function plusSalaamLine(plus: boolean) {
  return plus ? `${SALAAM} · Plus` : SALAAM;
}

export function listenLeadCopy(plus: boolean) {
  return plus
    ? `${PLUS_NAME} is on. Play a list.`
    : `Occasion lists for Friday, night, morning, and the rest. Reading stays on Read. Playing a list is ${PLUS_NAME}.`;
}

export function occasionHintCopy(plus: boolean, _reciterName?: string) {
  return plus ? "Play a list" : `Look around · play is ${PLUS_NAME}`;
}

/** Soft strip under Focus View — look around free; play asks for Plus. */
export function focusAuraCopy(plus: boolean) {
  return plus ? null : `Look around free · play is ${PLUS_NAME}`;
}

/** Focus verse hint while looking around without Plus. */
export function focusLookAroundHint(plus: boolean) {
  return plus
    ? "Tap a word for Word Reps — practise stays on this page"
    : `Look around free. Play, Word Reps, Masked, and Relay are ${PLUS_NAME}.`;
}

export function plusOnLabel() {
  return `${PLUS_NAME} is on`;
}

export function playlistBarTitle(title: string, plus: boolean) {
  const name = (title || "").trim() || "List";
  return plus ? `Plus · ${name}` : name;
}
