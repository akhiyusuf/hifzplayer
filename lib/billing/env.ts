export function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY || "";
}

export function stripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || "";
}

export function paystackSecretKey() {
  return process.env.PAYSTACK_SECRET_KEY || "";
}

export function paystackPlanCode(planId: "monthly" | "annual") {
  const key = planId === "monthly" ? "PAYSTACK_PLAN_MONTHLY" : "PAYSTACK_PLAN_ANNUAL";
  return process.env[key] || "";
}

export function billingSigningSecret() {
  return (
    process.env.BILLING_SIGNING_SECRET || stripeSecretKey() || paystackSecretKey() || ""
  );
}

export function processorsReady() {
  return {
    stripe: Boolean(stripeSecretKey()),
    paystack: Boolean(paystackSecretKey()),
  };
}

export function appUrl(request: Request) {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return env;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}
