import { APP_NAME, CONTACT_EMAIL, PLUS_NAME } from "../brand.ts";
import { PLANS, quote, type PlanId, type Processor, type RegionId } from "../billing/plans.ts";

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
  const plan = PLANS.find((p) => p.id === input.planId);
  const priced = quote(input.regionId, input.planId);
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
    `Thank you for supporting ${APP_NAME}. Your ${plan?.name || input.planId} plan (${priced.label}, billed through ${processor}) is confirmed.`,
    until,
    "",
    "Unlocked now:",
    "• 3×, 5×, 10× and unlimited repeats",
    "• Relay with more than one qari",
    "",
    "Quran reading, audio, translation, tajweed, Focus practice, masked recall, and relay with one qari stay free either way.",
    "",
    `Paystack or Stripe also send their own payment receipt. This note is from ${APP_NAME}, so you know Plus actually turned on.`,
    "",
    `Questions: ${CONTACT_EMAIL}`,
  ].join("\n");
}

export function plusWelcomeHtml(input: PlusWelcomeInput) {
  const text = plusWelcomeText(input);
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = escaped.split("\n\n").map((block) => {
    const html = block.replace(/\n/g, "<br/>");
    return `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#242019">${html}</p>`;
  });
  return `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#faf8f3;font-family:Inter,system-ui,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:24px;background:#fff;border:1px solid #e4ddd0;border-radius:12px">
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#242019">${PLUS_NAME}</p>
    ${paragraphs.join("\n    ")}
  </div>
</body>
</html>`;
}
