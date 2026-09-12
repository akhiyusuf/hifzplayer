import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { APP_NAME, CONTACT_EMAIL, PLUS_NAME } from "@/lib/brand";
import { backHref } from "@/lib/nav";

export const metadata: Metadata = { title: `Privacy — ${APP_NAME}` };

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  return (
    <main className="shell" id="main">
      <nav className="page-nav">
        <Link className="icon-btn sm tap" href={backHref(from)} aria-label="Back">
          <Icon name="chevron-left" size={19} />
        </Link>
        <h1>Privacy</h1>
      </nav>
      <div
        style={{
          flex: 1,
          padding: "16px 20px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          maxWidth: 640,
        }}
      >
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--text-primary)" }}>
          Quran reading in {APP_NAME} stays free. Reading position, recents, streak, reciter, colour theme, night
          theme, settings, and whether you have seen the welcome stay on your device. If you sign in, Clerk holds
          your account (name and email). If you buy {PLUS_NAME}{" "}
          while signed in, Plus is stored on that account so it follows you to another browser. Without an
          account, Plus stays in a cookie on this browser only.
        </p>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>
            What stays on your device
          </h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-secondary)" }}>
            Your reading position, recent passages, day streak, chosen reciter, colour theme, night theme, settings,
            and a note that you have seen the welcome screen are saved in your browser’s local storage. They never
            leave your device, and we cannot see them. Clearing your browser data removes them. Colour and night stay
            on this browser; they are not gated by {PLUS_NAME}. Clearing reading history does not show the welcome
            again.
          </p>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>
            What the app requests from the internet
          </h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-secondary)" }}>
            Quran text, translations, and recitation audio are fetched from the Quran Foundation (quran.com). Those
            requests go directly from your browser to their servers and are governed by their privacy policy. We add
            no identifiers to them. API content is cached on your device for at most seven days, in line with the
            Quran Foundation developer terms.
          </p>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>Study annotations</h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-secondary)" }}>
            Recurring-phrase and near-twin markings are coming soon. They are not shown in the player yet.
          </p>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>
            Cookies and tracking
          </h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-secondary)" }}>
            No advertising or fingerprinting. After a {PLUS_NAME} payment, this site sets one httpOnly cookie so we
            can remember that the plan is active. If you are signed in, Plus is also stored on your Clerk account.
            The cookie is not used to track you across other sites. Sign-in pages and account details are not
            indexed.
          </p>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>Payments</h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-secondary)" }}>
            Optional {PLUS_NAME} checkout is handled by Paystack (Nigeria and West Africa) or Stripe (other
            regions), chosen from your location — not a picker. Card numbers go to those providers, not to{" "}
            {APP_NAME}. We receive the email on the receipt, the plan you chose, and a payment reference so we can
            confirm the charge. After Plus is granted we send one confirmation email to that address (via Resend)
            so you know the subscription actually turned on. Paystack and Stripe still send their own receipts.
            Those payment fields stay on the server; the app never shows payment refs or account ids in the page.
            We log payment confirmation events (plan, processor, success or failure) so a paid subscription can be
            fulfilled even if the checkout page does not load. If you dispute or charge back a Plus payment, we turn
            Plus off on the signed-in account. Paystack and Stripe dashboards are the payment
            ledger. Their privacy policies apply to the checkout pages. Sign-in is handled by Clerk.
          </p>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>Changes and contact</h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-secondary)" }}>
            If this policy ever changes — for example, if error reporting is added — this page will say so plainly,
            including what is collected and why. Questions:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--action-primary)" }}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
        <Link
          href="/credits"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12.5,
            color: "var(--text-muted)",
            textDecoration: "none",
          }}
        >
          <Icon name="shield-check" size={14} />
          Data sources & attributions
        </Link>
      </div>
    </main>
  );
}
