import { PLUS_NAME } from "./brand.ts";
import { SALAAM } from "./greeting.ts";

export function plusSalaamLine(plus: boolean) {
  return plus ? `${SALAAM} · Plus` : SALAAM;
}

export function listenLeadCopy(plus: boolean) {
  return plus
    ? `${PLUS_NAME} is on. Play a list.`
    : `Occasion lists for Friday, night, morning, and the rest. Playing a list is ${PLUS_NAME}. Reading stays free on Menu.`;
}

export function occasionHintCopy(plus: boolean, _reciterName?: string) {
  return plus ? "Play a list" : `${PLUS_NAME} extra`;
}

export function playlistsLocked(plus: boolean) {
  return !plus;
}

export function playlistsLockedPitch() {
  return {
    title: `Playlists are ${PLUS_NAME}`,
    body: `Eight occasion lists — Friday, night, morning, and the rest. Play is ${PLUS_NAME}.`,
    cta: "See plans",
  };
}

export function plusOnLabel() {
  return `${PLUS_NAME} is on`;
}

export function playlistBarTitle(title: string, plus: boolean) {
  const name = (title || "").trim() || "List";
  return plus ? `Plus · ${name}` : name;
}
