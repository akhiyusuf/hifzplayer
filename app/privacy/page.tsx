import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { LegalArticle, LegalSection } from "@/components/legal-article";
import { APP_NAME, CONTACT_EMAIL, PLUS_NAME } from "@/lib/brand";
import { PRIVACY_VERSION } from "@/lib/legal";

export const metadata: Metadata = { title: `Privacy — ${APP_NAME}` };

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  return (
    <LegalArticle title="Privacy" from={from} updated="13 September 2026">
      <p>
        Quran reading in {APP_NAME} stays free. Reading position, recents, streak, reciter, colour theme, night
        theme, settings, and whether you have seen the welcome stay on your device. If you sign in, Clerk holds
        your account (name and email). If you buy {PLUS_NAME} while signed in, Plus is stored on that account so it
        follows you to another browser. Without an account, Plus stays in a cookie on this browser only. Using an
        account or paying for Plus also means you agree to this policy and to the{" "}
        <Link href="/terms?from=privacy">usage policy</Link>.
      </p>
      <p className="legal-meta">Version {PRIVACY_VERSION}</p>

      <LegalSection title="What stays on your device">
        <p>
          Your reading position, recent passages, day streak, chosen reciter, colour theme, night theme, settings,
          and a note that you have seen the welcome screen are saved in your browser’s local storage. They never
          leave your device, and we cannot see them. Clearing your browser data removes them. Colour and night stay
          on this browser; they are not gated by {PLUS_NAME}. Clearing reading history does not show the welcome
          again.
        </p>
      </LegalSection>
      <LegalSection title="What the app requests from the internet">
        <p>
          Quran text, translations, and recitation audio are fetched from the Quran Foundation (quran.com). Those
          requests go directly from your browser to their servers and are governed by their privacy policy. We add
          no identifiers to them. API content is cached on your device for at most seven days, in line with the
          Quran Foundation developer terms.
        </p>
      </LegalSection>
      <LegalSection title="Study annotations">
        <p>
          Recurring-phrase and near-twin markings are coming next. They are not shown in the player yet. See{" "}
          <Link href="/roadmap?from=privacy">what&apos;s coming</Link>.
        </p>
      </LegalSection>
      <LegalSection title="Cookies and tracking">
        <p>
          No advertising or fingerprinting. After a {PLUS_NAME} payment, this site sets one httpOnly cookie so we
          can remember that the plan is active. If you are signed in, Plus is also stored on your Clerk account.
          The cookie is not used to track you across other sites. Sign-in pages and account details are not
          indexed. If you agree to the usage and privacy policies, we store those policy versions and the time on
          your Clerk account — not a picture of a signature, and not in billing logs.
        </p>
      </LegalSection>
      <LegalSection title="Payments">
        <p>
          Optional {PLUS_NAME} checkout is handled by Paystack (Nigeria and West Africa) or Stripe (other
          regions), chosen from your location — not a picker. Card numbers go to those providers, not to{" "}
          {APP_NAME}. We receive the email on the receipt, the plan you chose, and a payment reference so we can
          confirm the charge. After Plus is granted we send one confirmation email to that address (via Resend) so
          you know the subscription actually turned on. If you gift Plus, we ask for the recipient&apos;s email
          only after you pay, then we email that address so they can sign up (Google or email) and receive Plus.
          Paystack and Stripe still send their own receipts. Those payment fields stay on the server; the app never
          shows payment refs. Your Clerk account ID is shown only to you on the account page so you can quote it if
          something goes wrong. We log payment confirmation and renewal events (plan, processor, success or
          failure, and that same account ID — never your email) so a paid subscription can be fulfilled and later
          invoices keep Plus on. If you dispute or charge back a Plus payment, we turn Plus off on the signed-in
          account. Paystack and Stripe dashboards are the payment ledger. Their privacy policies apply to the
          checkout pages. Sign-in is handled by Clerk.
        </p>
      </LegalSection>
      <LegalSection title="Analytics">
        <p>
          Vercel Web Analytics records page views so we can see how many people open {APP_NAME}. It does not use
          advertising cookies. When you create an account or sign in, we log the Clerk account ID (not your email)
          so a broken grant or a failed renewal can be found in the same place. Those logs are for fixing problems,
          not for ads.
        </p>
      </LegalSection>
      <LegalSection title="Changes and contact">
        <p>
          If this policy ever changes — for example, if error reporting is added — this page will say so plainly,
          including what is collected and why, and the version above will change. Questions:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>
      <Link href="/credits" className="legal-credits">
        <Icon name="shield-check" size={14} />
        Data sources & attributions
      </Link>
    </LegalArticle>
  );
}
