import { APP_NAME, CONTACT_EMAIL, PLUS_NAME } from "../brand.ts";
import { isPaidPlanId, PLANS, quote, type PlanId, type Processor, type RegionId } from "../billing/plans.ts";
import { renderEmailHtml } from "./template.ts";

export type PlusWelcomeInput = {
  planId: PlanId;
  regionId: RegionId;
  processor: Processor;
  until: string | null;
};

export function plusWelcomeSubject() {
  return `${PLUS_NAME} is active`;
}

export function plusWelcomeText(input: PlusWelcomeInput) {
  if (input.planId === "trial" || input.processor === "trial") {
    const until = input.until
      ? `Your free trial is active until ${new Date(input.until).toLocaleDateString("en-GB", { dateStyle: "long" })}.`
      : "Your free trial is active for one day.";
    return [
      `Assalamu alaikum — your ${PLUS_NAME} free trial is on.`,
      "",
      until,
      "No card was charged. When the day ends, Quran reading and Word Reps, Masked, and Relay stay free; the memorization planner and playlists need a paid plan.",
      "",
      "Unlocked for the trial:",
      "• Memorization planner",
      "• Occasion lists",
      "",
      `Need help? Reply to this email or write to ${CONTACT_EMAIL}.`,
    ].join("\n");
  }

  const plan = PLANS.find((p) => p.id === input.planId);
  const priced = isPaidPlanId(input.planId) ? quote(input.regionId, input.planId) : null;
  const processor = input.processor === "paystack" ? "Paystack" : "Stripe";
  const until =
    input.planId === "lifetime"
      ? "This is a lifetime plan."
      : input.until
        ? `This ${plan?.name.toLowerCase() || input.planId} plan is active until ${new Date(input.until).toLocaleDateString("en-GB", { dateStyle: "long" })}.`
        : `This ${plan?.name.toLowerCase() || input.planId} plan is active.`;

  return [
    `Assalamu alaikum — ${PLUS_NAME} is on.`,
    "",
    `Thank you for supporting ${APP_NAME}. Your ${plan?.name || input.planId} plan (${priced?.label || "paid"}, billed through ${processor}) is confirmed.`,
    until,
    "",
    "Unlocked now:",
    "• Memorization planner",
    "• Occasion lists",
    "",
    "Quran reading, audio, translation, tajweed, verse Repeat, Word Reps, Masked, Relay, and word repeats stay free either way.",
    "",
    `Paystack or Stripe also send their own payment receipt. This note is from ${APP_NAME}, so you know Plus actually turned on.`,
    "",
    `Need help? Reply to this email or write to ${CONTACT_EMAIL}.`,
  ].join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function plusWelcomeHtml(input: PlusWelcomeInput) {
  const isTrial = input.planId === "trial" || input.processor === "trial";
  const plan = PLANS.find((p) => p.id === input.planId);
  const priced = isPaidPlanId(input.planId) ? quote(input.regionId, input.planId) : null;
  const processor = input.processor === "paystack" ? "Paystack" : "Stripe";
  const until = isTrial
    ? input.until
      ? `Your free trial is active until ${new Date(input.until).toLocaleDateString("en-GB", { dateStyle: "long" })}.`
      : "Your free trial is active for one day."
    : input.planId === "lifetime"
      ? "This is a lifetime plan."
      : input.until
        ? `This ${plan?.name.toLowerCase() || input.planId} plan is active until ${new Date(input.until).toLocaleDateString("en-GB", { dateStyle: "long" })}.`
        : `This ${plan?.name.toLowerCase() || input.planId} plan is active.`;

  const intro = isTrial
    ? `Assalamu alaikum — your ${PLUS_NAME} free trial is on. ${until} No card was charged.`
    : `Assalamu alaikum — ${PLUS_NAME} is on. Thank you for supporting ${APP_NAME}. Your ${escapeHtml(plan?.name || input.planId)} plan (${escapeHtml(priced?.label || "paid")}, billed through ${escapeHtml(processor)}) is confirmed. ${escapeHtml(until)}`;

  return renderEmailHtml({
    preheader: `${PLUS_NAME} is active`,
    heading: isTrial ? "Your free trial is on" : `${PLUS_NAME} is active`,
    bodyHtml: `<p style="margin:0 0 16px">${intro}</p><p style="margin:0 0 8px"><strong>Unlocked now:</strong></p><p style="margin:0 0 4px">• Memorization planner</p><p style="margin:0 0 16px">• Occasion lists</p><p style="margin:0;font-size:14px;color:#66645E">Quran reading, audio, translation, tajweed, verse Repeat, Word Reps, Masked, Relay, and word repeats stay free either way.</p>`,
    cta: { label: "Open Diras", url: "https://diras.app/home" },
  });
}
