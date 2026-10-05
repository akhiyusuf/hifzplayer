import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { APP_NAME, CONTACT_EMAIL, PLUS_NAME } from "@/lib/brand";
import { backHref, legalPeerHref } from "@/lib/nav";

export const metadata: Metadata = { title: `Privacy — ${APP_NAME}` };

const sectionTitle = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 15,
  margin: 0,
} as const;

const subTitle = {
  ...sectionTitle,
  fontWeight: 600,
  fontSize: 14,
  marginTop: 8,
} as const;

const body = {
  fontSize: 13.5,
  lineHeight: 1.55,
  color: "var(--text-secondary)",
} as const;

const list = {
  ...body,
  margin: 0,
  paddingLeft: 18,
  display: "flex",
  flexDirection: "column",
  gap: 6,
} as const;

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
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--text-muted)" }}>
          Effective date: 5 October 2026
        </p>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--text-primary)" }}>
          {APP_NAME} is a Quran reading and memorisation practice app at diras.app. Reading stays free. An
          account and {PLUS_NAME} are optional. This page says what we collect, why, who else handles it, how
          long we keep it, and how to ask us to delete it. The rules for using the app are on the{" "}
          <Link href={legalPeerHref("tos", from)}>terms</Link>.
        </p>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={sectionTitle}>Data we collect</h2>
          <p style={body}>
            You can read without an account. If you sign in or pay, we collect only what that step needs:
          </p>
          <ul style={list}>
            <li>Name and email, when you create an account or sign in with Google.</li>
            <li>
              A password hash, if you choose email and a password. We never store the password itself. A one-time
              code for confirming a new account or resetting a password is emailed and kept only as a hash.
            </li>
            <li>
              A Google account id, if you use Google sign-in. Google shares your name and verified email for
              that login. We do not keep the Google access token, and we do not ask Google for anything else.
            </li>
            <li>A session cookie, so the browser stays signed in. The matching session is stored as a hash.</li>
            <li>
              {PLUS_NAME} entitlement: whether Plus is on, the plan, the region, the processor (Stripe,
              Paystack, or a free trial), and when it ends.
            </li>
            <li>
              Payment references from Stripe or Paystack: the email on the receipt, the plan, and a payment or
              subscription reference so we can confirm the charge. Card numbers go to those providers, not to{" "}
              {APP_NAME}.
            </li>
            <li>
              A Cloudflare Turnstile challenge token, on password sign-in, sign-up, email code requests, and
              password reset, so we can check that a person is there. We do not store the token after the check.
            </li>
            <li>
              Device-local preferences: reading position, recent passages, day streak, reciter, colour theme,
              night theme, settings, and whether you have seen the welcome. These stay in this browser.
            </li>
          </ul>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={sectionTitle}>Why we use it</h2>
          <ul style={list}>
            <li>
              To run the account: sign you in, show your name, confirm a new email, and send a password reset
              when you ask.
            </li>
            <li>To remember {PLUS_NAME} on that account, including a gift you buy for someone else.</li>
            <li>To confirm a payment, send one Plus or account email, and turn Plus off if a charge is disputed.</li>
            <li>To block scripted sign-ups with the Turnstile check.</li>
            <li>To keep your reading place and display choices on this device, without sending them to us.</li>
          </ul>
          <p style={body}>
            We do not use this data for advertising. We do not sell it. We do not use it to build a profile of
            you across other sites. Google sign-in is only for account login. {APP_NAME} does not use Google
            APIs to create or distribute images of any kind.
          </p>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={sectionTitle}>Google user data</h2>
          <p style={body}>
            Sign in with Google is optional. This section comprehensively discloses how {APP_NAME} accesses, uses,
            stores, or shares Google user data, including the data protection mechanisms for that data.
          </p>
          <h3 style={subTitle}>What Google user data we access</h3>
          <p style={body}>
            When you use Sign in with Google, we receive your Google account id, name, and verified email. Those
            are the profile and email scopes only. We do not access Gmail, Drive, Calendar, Photos, Contacts, or
            any other Google product data.
          </p>
          <h3 style={subTitle}>How we use Google user data</h3>
          <p style={body}>
            We use Google user data only to create or sign into your {APP_NAME} account and to show your name in
            the app. We do not use Google user data for advertising, sale, profiling across sites, credit, or
            training AI/ML models. We do not use Google Workspace APIs to develop, improve, or train
            non-personalized AI/ML models. Google sign-in is authentication only.
          </p>
          <h3 style={subTitle}>How we store Google user data</h3>
          <p style={body}>
            Google user data (name, verified email, and Google account id) is stored in our Neon database used by
            the {APP_NAME} account service. We do not keep the Google access token. We retain that Google user
            data while the account exists. To delete it, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--action-primary)" }}>
              {CONTACT_EMAIL}
            </a>{" "}
            from the verified email on the account and say you want the account deleted.
          </p>
          <h3 style={subTitle}>With whom we share, transfer, or disclose Google user data</h3>
          <p style={body}>
            We do not sell Google user data. We do not transfer or disclose Google user data to third parties for
            advertising or unrelated purposes. Account storage is in our Neon database on Cloudflare-hosted
            infrastructure. Payment processors never receive Google tokens. We do not keep the Google access
            token.
          </p>
          <h3 style={subTitle}>Data protection mechanisms for Google user data</h3>
          <p style={body}>
            We use encryption in transit (HTTPS) to protect your information. Google user data (name, verified
            email, and Google account id) is stored with industry-standard protections. The data protection
            mechanisms include encryption in transit (HTTPS), hashed sessions, and access limited to running the
            account. Security procedures are in place to protect the confidentiality of your data.
          </p>
          <p style={body}>
            {APP_NAME} does not use Google APIs to create or distribute AI-generated non-consensual intimate
            imagery. Google sign-in is only for account login.
          </p>
          <p style={body}>
            To delete Google user data on a Google-linked account, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--action-primary)" }}>
              {CONTACT_EMAIL}
            </a>{" "}
            from the address on the account — the verified email we received from Google — and say you want the
            account deleted. We then delete the Google account id, name, and email stored for that account. The
            same path is under Deletion and contact.
          </p>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={sectionTitle}>What stays on your device</h2>
          <p style={body}>
            Your reading position, recent passages, day streak, chosen reciter, colour theme, night theme,
            settings, and a note that you have seen the welcome screen are saved in your browser’s local
            storage. They never leave your device, and we cannot see them. Clearing your browser data removes
            them. Colour and night stay on this browser; they are not gated by {PLUS_NAME}. Clearing reading
            history does not show the welcome again. API content is cached on your device for at most seven
            days, in line with the Quran Foundation developer terms.
          </p>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={sectionTitle}>Who else handles data</h2>
          <p style={body}>We do not give your account to advertisers. These services see only their own job:</p>
          <ul style={list}>
            <li>
              Quran Foundation (quran.com) — Quran text, translations, and recitation audio. Those requests go
              directly from your browser to their servers. We add no account id or email to them. Their privacy
              policy applies.
            </li>
            <li>
              Cloudflare — serves {APP_NAME}, and runs the Turnstile human check on password forms. Turnstile
              may set a cookie on Cloudflare’s challenge domain while you complete that check.
            </li>
            <li>Neon — the database that holds accounts, sessions, and Plus.</li>
            <li>
              Resend — sends the account email, the one-time code, and the note that Plus turned on. On
              Cloudflare, the same message may go through MailChannels instead. Either way it is one
              transactional email, not a mailing list.
            </li>
            <li>
              Stripe or Paystack — checkout. Nigeria and West Africa use Paystack; other regions use Stripe,
              chosen from your location. Their privacy policies apply to the card form. Their dashboards are
              the payment ledger.
            </li>
          </ul>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={sectionTitle}>Cookies</h2>
          <p style={body}>
            No advertising and no fingerprinting. Sign-in sets one httpOnly session cookie. After {PLUS_NAME}{" "}
            is granted, this site sets one httpOnly cookie so this browser can remember that the plan is active.
            If you are signed in, Plus is also stored on your account. A short httpOnly cookie is set only while
            a Google sign-in is in progress, then cleared. Those cookies are not used to track you across other
            sites. Sign-in pages and account details are not indexed. If the site is served by Vercel, Vercel
            Web Analytics may count a page view. That count is not tied to your name or email and is not used
            for ads. On Cloudflare that counter is off.
          </p>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={sectionTitle}>Payments and gifts</h2>
          <p style={body}>
            If you gift Plus, you sign in first, choose how many people, and paste their emails. We check who
            already has a {APP_NAME} account — they do not need one yet. After you pay, Plus is granted to those
            emails, not to you. Someone without an account gets a note to sign in with that same address. If
            they already have Plus, extra time stacks on top. Buying for yourself puts Plus on the signed-in
            account. Paystack and Stripe still send their own receipts. The app never shows payment references.
            Your account ID is shown only to you on the account page so you can quote it if something goes
            wrong. We log payment confirmation and renewal events (plan, processor, success or failure, and that
            same account ID — never your email) so a paid subscription can be fulfilled. If you dispute or
            charge back a Plus payment, we turn Plus off on the account that received it.
          </p>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={sectionTitle}>How long we keep it</h2>
          <ul style={list}>
            <li>Device-local preferences stay until you clear this browser’s data for the site.</li>
            <li>The session lasts 30 days, or until you sign out. Signing out deletes that session.</li>
            <li>The Google sign-in cookie lasts about 10 minutes. The Google access token is not kept.</li>
            <li>A one-time code expires after 10 minutes. Once it is used, that code is deleted.</li>
            <li>The Turnstile token is not kept after Cloudflare answers the check.</li>
            <li>
              Name, email, the Google account id if you signed in with Google, Plus entitlement, and payment
              references stay while the account exists, including after a plan ends, so we can match a receipt
              or a dispute. They are deleted when you ask us to delete the account. Stripe and Paystack keep
              their own copy of the charge under their policies.
            </li>
          </ul>
        </section>
        <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={sectionTitle}>Deletion and contact</h2>
          <p style={body}>
            To ask us to delete your account, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--action-primary)" }}>
              {CONTACT_EMAIL}
            </a>{" "}
            from the address on the account, and say you want it deleted. We delete the account and the
            sessions, Plus record, and gifts tied to it. If you signed in with Google, that same email deletes
            the Google user data we stored: your Google account id, name, and verified email. We cannot clear
            preferences stored only on your device
            — clearing the browser’s site data does that. We also cannot delete the payment record held by
            Stripe or Paystack. The same address is where to ask a question about this policy. If this policy
            changes, this page will say so plainly, including what is collected and why.
          </p>
        </section>
        <Link
          href={legalPeerHref("tos", from)}
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
          Terms
        </Link>
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
