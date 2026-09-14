import type { Metadata } from "next";
import Link from "next/link";
import { LegalArticle, LegalSection } from "@/components/legal-article";
import { APP_NAME, CONTACT_EMAIL, PLUS_NAME } from "@/lib/brand";
import { TERMS_VERSION } from "@/lib/legal";

export const metadata: Metadata = { title: `Usage — ${APP_NAME}` };

export default async function TermsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  return (
    <LegalArticle title="Usage" from={from} updated="13 September 2026">
      <p>
        These are the rules for using {APP_NAME}. Quran reading stays free. An account, {PLUS_NAME}, gifts, and
        moving Plus between browsers are optional. If you create an account, buy or gift Plus, you agree to this
        usage policy and to the{" "}
        <Link href="/privacy?from=terms">privacy policy</Link>. We record the policy versions and the time you
        agreed. That is the “signature.”
      </p>
      <p className="legal-meta">Version {TERMS_VERSION}</p>

      <LegalSection title="What Diras is">
        <p>
          {APP_NAME} is a Quran reading and study player. The mushaf, recitation audio, and translation come from
          the Quran Foundation (quran.com). We do not own the Quran. Play on the page, Repeat of this verse, and a
          verse range stay free. {PLUS_NAME} unlocks Focus play (Word Reps, Masked, Relay), playing occasion lists,
          and extra word repeats.
        </p>
      </LegalSection>

      <LegalSection title="Accounts">
        <p>
          You may read without an account. If you sign in, you must use an email you control. Do not create
          accounts to hide a stolen payment, to harass someone with gifts, or to dodge a revoked plan. We may close
          an account that is used to attack {APP_NAME} or to abuse payments.
        </p>
      </LegalSection>

      <LegalSection title="Payments, gifts, and chargebacks">
        <p>
          {PLUS_NAME} is paid through Paystack or Stripe. Card numbers go to them, not to us. If you gift Plus, you
          are the buyer. After you pay you name one recipient email. That person must sign up or sign in with that
          same address. Do not buy Plus with a payment method you are not allowed to use. Do not pay and then
          reverse the payment to keep Plus. A dispute or chargeback turns Plus off on the account that received it.
          We keep payment logs without your email or card number so we can match a grant to an account id.
        </p>
      </LegalSection>

      <LegalSection title="What you must not do">
        <p>
          Do not try to take Plus without paying, share a paid session as if it were yours to sell, or interfere
          with other people’s reading. Do not probe, overload, or break the billing, sign-in, or gift flows. Do not
          use {APP_NAME} to send spam, to impersonate us, or to collect other people’s emails through gifts. Quran
          reading on your own device is fine. Automated scraping that harms the service is not.
        </p>
      </LegalSection>

      <LegalSection title="No warranty">
        <p>
          {APP_NAME} is offered as-is, for study. Recitation, timing, translation, and tajweed colouring can be
          wrong. We are not a mufti, a school, or a substitute for a teacher. If the app is down, slow, or loses a
          local setting, we will try to fix it, but we do not promise uninterrupted service.
        </p>
      </LegalSection>

      <LegalSection title="If something goes wrong">
        <p>
          To the extent the law allows, {APP_NAME} is not liable for lost data on your device, a payment dispute
          handled by Paystack or Stripe, or study outcomes. If a court still finds we owe you money, that amount
          will not exceed what you paid us for {PLUS_NAME} in the twelve months before the claim, or nothing if you
          only used the free mushaf. This does not limit liability that the law says we cannot limit.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          If these rules change in a way that matters, this page will say so and the version at the top will
          change. We may ask you to agree again before you use an account or pay. Quran reading stays open either
          way.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          . Quote the account id on the account page if the mail is about Plus.
        </p>
      </LegalSection>
    </LegalArticle>
  );
}
