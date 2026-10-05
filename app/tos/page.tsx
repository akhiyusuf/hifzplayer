import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { googleSignInEnabled } from "@/lib/auth/config";
import { APP_NAME, CONTACT_EMAIL, PLUS_NAME } from "@/lib/brand";
import { backHref, legalPeerHref } from "@/lib/nav";

export const metadata: Metadata = { title: `Terms — ${APP_NAME}` };

export default async function TermsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const googleOn = googleSignInEnabled();
  return (
    <main className="shell" id="main">
      <nav className="page-nav">
        <Link className="icon-btn sm tap" href={backHref(from)} aria-label="Back">
          <Icon name="chevron-left" size={19} />
        </Link>
        <h1>Terms</h1>
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
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-muted)" }}>
          Effective date: 5 October 2026
        </p>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--text-primary)" }}>
          These terms are the agreement for using {APP_NAME}. Quran reading stays free. An account and{" "}
          {PLUS_NAME} are optional. If you read here, create an account, or pay for Plus, you agree to these
          terms and to the <Link href={legalPeerHref("privacy", from)}>privacy policy</Link>.
        </p>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>The service</h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-secondary)" }}>
            {APP_NAME} is a web app for reading and practising the Quran. We try to keep it available, but we do
            not promise that it will always be up, fast, or free of mistakes. A feature can change, pause, or
            stop. Reading the mushaf stays free either way. {PLUS_NAME} is an optional paid layer on top.
          </p>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>Accounts</h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-secondary)" }}>
            You can read without an account. Sign in with email and a password. A code by email confirms a new
            account or resets a password.
            {googleOn ? " You can also continue with Google while that option is turned on." : ""} Keep the
            password to yourself. An account is for one person — do not share a paid login so other people can
            use {PLUS_NAME} without paying.
          </p>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>Bot checks</h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-secondary)" }}>
            Password sign-in and sign-up use Cloudflare Turnstile. It checks that a person is at the form, not a
            script. That check runs with Cloudflare.
          </p>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>Payments</h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-secondary)" }}>
            Optional {PLUS_NAME} checkout is handled by Paystack (Nigeria and West Africa) or Stripe (other
            regions), chosen from your location. Card numbers go to those providers, not to {APP_NAME}. The price
            and what you are buying are shown before you pay. If a payment fails, is disputed, or is charged back,
            we turn Plus off on the account that received it. Paystack and Stripe keep the payment record and send
            their own receipts.
          </p>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>
            Quran text and audio
          </h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-secondary)" }}>
            Quran text, translations, and recitation come from third parties, including the Quran Foundation
            (quran.com). {APP_NAME} does not own that content, and we do not control it when their servers are
            slow or a reciter is missing. Their terms apply to that material.
          </p>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>Acceptable use</h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-secondary)" }}>
            Use {APP_NAME} for your own reading and practice. Do not abuse it. That means no scraping or automated
            downloading, no attempts to break, overload, or probe the app, and no sharing of a Plus account so
            someone else can skip paying. Do not use the app to harm other people.
          </p>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>Ending access</h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-secondary)" }}>
            You can stop using {APP_NAME} whenever you like. To close an account, write to{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--action-primary)" }}>
              {CONTACT_EMAIL}
            </a>
            . We may suspend or close an account, or turn Plus off, if these terms are broken or if we need to
            protect the app and other readers.
          </p>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>
            Limits on liability
          </h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-secondary)" }}>
            {APP_NAME} is offered as it is, for reading and practice. We are not a teacher, and the page is not a
            religious ruling. We are not liable for reading progress that lives only on your device, for audio or
            text that fails because a third party is down, or for indirect loss. If the law where you live does
            not allow a limit like that, that law is what applies.
          </p>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>
            Changes and contact
          </h2>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-secondary)" }}>
            If these terms change, this page will say so, with a new effective date. If you keep using {APP_NAME}{" "}
            after that, you accept the update. How we handle your data is on the{" "}
            <Link href={legalPeerHref("privacy", from)}>privacy page</Link>. Questions:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--action-primary)" }}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
        <Link
          href={legalPeerHref("privacy", from)}
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
          Privacy
        </Link>
      </div>
    </main>
  );
}
