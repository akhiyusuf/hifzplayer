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
    body: `Browse the lists below. Play is ${PLUS_NAME}. Reading stays free on Menu.`,
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

export function plannerLocked(plus: boolean) {
  return !plus;
}

export function plannerLockedPitch() {
  return {
    title: `Memorization planner is ${PLUS_NAME}`,
    body: `Pick a surah, a few ayahs a day, and get New / Review / Revision cards. Reading stays free.`,
    cta: "See plans",
  };
}

export function practiceLeadCopy(plus: boolean) {
  return plus
    ? `${PLUS_NAME} is on. Your plan for today.`
    : `A daily New / Review / Revision plan for your hifz. The planner is ${PLUS_NAME}. Reading stays free on Menu.`;
}
