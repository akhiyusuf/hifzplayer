import { APP_NAME, CONTACT_EMAIL } from "../brand.ts";

/**
 * Shared HTML email template for Diras transactional emails.
 *
 * Design based on the FinBank template, adapted to Diras's brand:
 * - Font: Inter (body) + Bricolage Grotesque (headings) — loaded via Google Fonts
 *   for email clients that support web fonts; falls back to system sans-serif.
 * - Colors: Forge orange (#e8590c) primary, cream (#faf8f3) background,
 *   charcoal text. Matches the in-app palette.
 * - Layout: 600px centered container, white card, dark footer with support prompt.
 *
 * Email clients don't support external CSS classes reliably, so all styles
 * are inline. The template is table-based for Outlook compatibility.
 */

export type EmailTemplateOpts = {
  /** Preheader text (shows in inbox preview, hidden in body). */
  preheader?: string;
  /** Main heading (e.g. "Your account is ready"). */
  heading: string;
  /** Body content as HTML string (paragraphs, lists, etc.). */
  bodyHtml: string;
  /** Optional CTA button. */
  cta?: { label: string; url: string };
  /** Optional list of feature lines (bold + regular). */
  features?: { bold: string; rest: string }[];
};

export function renderEmailHtml(opts: EmailTemplateOpts): string {
  const { preheader, heading, bodyHtml, cta, features } = opts;

  const featuresHtml = features
    ? features
        .map(
          (f) =>
            `<tr><td dir="ltr" style="color:#242019;font-size:17px;text-align:center;padding:0 24px 12px;line-height:1.4"><span style="font-weight:700;letter-spacing:-0.02em">${escapeHtml(f.bold)} </span><span style="letter-spacing:-0.01em">${escapeHtml(f.rest)}</span></td></tr>`,
        )
        .join("")
    : "";

  const ctaHtml = cta
    ? `<tr><td style="padding:0 24px 16px"><table cellpadding="0" cellspacing="0" border="0" style="width:100%"><tbody><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:200px"><tbody><tr><td style="width:100%"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;max-width:100%;border-collapse:separate;border-spacing:0"><tbody><tr><td bgcolor="#e8590c" style="background-color:#e8590c;border-radius:100px"><a href="${escapeAttr(cta.url)}" target="_blank" rel="noopener" style="color:#ffffff;text-decoration:none;display:block;padding:14px 8px;text-align:center;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:17px;font-weight:700;line-height:1.4"><span style="color:#ffffff">${escapeHtml(cta.label)}</span></a></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr>`
    : "";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta http-equiv="Content-Type" content="text/html;charset=UTF-8"><meta name="format-detection" content="telephone=no,date=no,address=no,email=no"><meta name="x-apple-disable-message-reformatting"><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><style>body{margin:0;padding:0}table{mso-table-lspace:0;mso-table-rspace:0}p,span,h1,h2,h3,h4,h5,h6{margin:0;padding:0}p{line-height:inherit}a[x-apple-data-detectors]{color:inherit!important;text-decoration:inherit!important}img+div{display:none}@media(max-width:599px){.ecw{width:100%!important;min-width:0!important}}</style></head><body style="width:100%;-webkit-text-size-adjust:100%;text-size-adjust:100%;background-color:#faf8f3;margin:0;padding:0;font-family:'Inter',Helvetica,Arial,sans-serif"><table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#faf8f3" style="background-color:#faf8f3"><tbody><tr><td style="background-color:#faf8f3"><table align="center" width="600" border="0" cellpadding="0" cellspacing="0" role="presentation" class="ecw" style="max-width:600px;margin:0 auto;background-color:#ffffff;width:600px;min-width:600px"><tbody><tr><td style="vertical-align:top">${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff">${escapeHtml(preheader)}</div>` : ""}</td></tr><tr><td style="vertical-align:top;padding:0"><table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="font-family:'Inter',Helvetica,Arial,sans-serif"><tbody><tr><td style="padding:28px 24px 20px"><table border="0" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:552px;margin:0 auto"><tbody><tr><td style="text-align:center;vertical-align:middle"><span style="font-family:'Bricolage Grotesque','Inter',sans-serif;font-size:28px;font-weight:700;letter-spacing:-0.04em;color:#242019">${escapeHtml(APP_NAME)}</span></td></tr></tbody></table></td></tr><tr><td style="padding:0 24px 16px"><table cellpadding="0" cellspacing="0" border="0" style="width:100%"><tbody><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:552px"><tbody><tr><td style="width:100%;height:1px;line-height:1px;font-size:0;background-color:#e4ddd0">&nbsp;</td></tr></tbody></table></td></tr></tbody></table></td></tr>${featuresHtml}${featuresHtml ? '<tr><td style="padding:0 24px 16px"><table cellpadding="0" cellspacing="0" border="0" style="width:100%"><tbody><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:552px"><tbody><tr><td style="width:100%;height:1px;line-height:1px;font-size:0;background-color:#e4ddd0">&nbsp;</td></tr></tbody></table></td></tr></tbody></table></td></tr>' : ""}<tr><td dir="ltr" style="font-family:'Bricolage Grotesque','Inter',sans-serif;color:#242019;font-size:28px;font-weight:700;letter-spacing:-0.04em;text-align:center;padding:8px 24px 16px;line-height:1.1">${escapeHtml(heading)}</td></tr><tr><td dir="ltr" style="color:#242019;font-size:17px;line-height:1.5;text-align:center;padding:0 24px 20px;font-family:'Inter',Helvetica,Arial,sans-serif">${bodyHtml}</td></tr>${ctaHtml}<tr><td style="padding:0 24px 24px">&nbsp;</td></tr></tbody></table></td></tr><tr><td style="vertical-align:top"><table border="0" cellpadding="0" cellspacing="0" align="center" style="width:100%;background-color:#242019"><tbody><tr><td style="text-align:center;padding:28px 32px"><table border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:522px;margin:0 auto"><tbody><tr><td style="padding:0"><table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="font-family:'Inter',Helvetica,Arial,sans-serif"><tbody><tr><td dir="ltr" style="font-family:'Bricolage Grotesque','Inter',sans-serif;color:#faf8f3;font-size:22px;font-weight:700;letter-spacing:-0.01em;text-align:left;padding:0 0 14px;line-height:1.2">Need help?</td></tr><tr><td dir="ltr" style="color:#faf8f3;font-size:16px;line-height:1.5;text-align:left;padding:0 0 14px"><span>Reply to this email or write to </span><a href="mailto:${escapeAttr(CONTACT_EMAIL)}" style="color:#faf8f3;font-weight:700;text-decoration:underline">${escapeHtml(CONTACT_EMAIL)}</a><span>.</span></td></tr><tr><td dir="ltr" style="color:#8a8175;font-size:13px;line-height:1.4;text-align:left;padding-top:8px"><span>This is an automated email from ${escapeHtml(APP_NAME)}. No reply is expected.</span></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
