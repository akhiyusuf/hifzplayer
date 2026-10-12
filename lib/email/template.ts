import { APP_NAME, CONTACT_EMAIL } from "../brand.ts";

/**
 * Shared HTML email template for Diras transactional emails.
 *
 * Brand (see /workspace/diras-brand/email/email-branding.md):
 * - PNG lockup at https://diras.app/email/ (Gmail/Outlook do not render SVG well)
 * - Body #FAF8F3, text #1A1712, links #1A1712 underlined
 * - Buttons #FF7A33 with #1A1712 text (never cream/white on orange)
 * - Font stack Inter, Arial, Helvetica, sans-serif
 * - Optional dark-mode logo swap via prefers-color-scheme
 *
 * Table-based + inline styles for Outlook.
 */

const LOGO_LIGHT = "https://diras.app/email/lockup-email-light-bg.png";
const LOGO_DARK = "https://diras.app/email/lockup-email-dark-bg.png";

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
            `<tr><td dir="ltr" style="color:#1A1712;font-size:17px;text-align:center;padding:0 24px 12px;line-height:1.4;font-family:Inter,Arial,Helvetica,sans-serif"><span style="font-weight:700;letter-spacing:-0.02em">${escapeHtml(f.bold)} </span><span style="letter-spacing:-0.01em">${escapeHtml(f.rest)}</span></td></tr>`,
        )
        .join("")
    : "";

  const ctaHtml = cta
    ? `<tr><td align="center" style="padding:0 24px 20px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#FF7A33" style="border-radius:8px;background-color:#FF7A33"><a href="${escapeAttr(cta.url)}" target="_blank" rel="noopener" style="display:inline-block;padding:13px 24px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;color:#1A1712;text-decoration:none;border-radius:8px">${escapeHtml(cta.label)}</a></td></tr></table></td></tr>`
    : "";

  const featuresDivider = featuresHtml
    ? `<tr><td style="padding:0 24px 16px"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="height:1px;line-height:1px;font-size:0;background-color:#E4DDD0">&nbsp;</td></tr></table></td></tr>`
    : "";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta http-equiv="Content-Type" content="text/html;charset=UTF-8"/>
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no"/>
<meta name="x-apple-disable-message-reformatting"/>
<meta name="color-scheme" content="light dark"/>
<meta name="supported-color-schemes" content="light dark"/>
<title>${escapeHtml(APP_NAME)}</title>
<style>
  body{margin:0;padding:0}
  table{mso-table-lspace:0;mso-table-rspace:0}
  a[x-apple-data-detectors]{color:inherit!important;text-decoration:inherit!important}
  .logo-dark{display:none!important;max-height:0;overflow:hidden}
  @media (prefers-color-scheme:dark){
    .logo-light{display:none!important}
    .logo-dark{display:block!important;max-height:none!important;overflow:visible!important}
  }
  @media (max-width:599px){
    .ecw{width:100%!important;min-width:0!important}
  }
</style>
<!--[if mso]>
<style>body,table,td,a,span,p{font-family:Arial,Helvetica,sans-serif!important}</style>
<![endif]-->
</head>
<body style="width:100%;-webkit-text-size-adjust:100%;text-size-adjust:100%;background-color:#FAF8F3;margin:0;padding:0;font-family:Inter,Arial,Helvetica,sans-serif">
<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#FAF8F3" style="background-color:#FAF8F3">
<tbody>
<tr><td style="background-color:#FAF8F3">
<!-- Header lockup on cream -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAF8F3">
  <tr>
    <td align="center" style="padding:28px 16px 20px 16px">
      <a href="https://diras.app" style="text-decoration:none">
        <img class="logo-light" src="${LOGO_LIGHT}" width="160" height="48" alt="${escapeAttr(APP_NAME)}" style="display:block;width:160px;height:48px;border:0;outline:none;text-decoration:none"/>
        <!--[if !mso]><!-->
        <img class="logo-dark" src="${LOGO_DARK}" width="160" height="48" alt="${escapeAttr(APP_NAME)}" style="display:none;width:160px;height:48px;border:0;outline:none;text-decoration:none"/>
        <!--<![endif]-->
      </a>
    </td>
  </tr>
</table>
<!-- Content card -->
<table align="center" width="600" border="0" cellpadding="0" cellspacing="0" role="presentation" class="ecw" style="max-width:600px;margin:0 auto;background-color:#FFFFFF;width:600px;min-width:600px">
<tbody>
<tr><td style="vertical-align:top">${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#FFFFFF">${escapeHtml(preheader)}</div>` : ""}</td></tr>
<tr><td style="vertical-align:top;padding:0">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="font-family:Inter,Arial,Helvetica,sans-serif">
<tbody>
${featuresHtml}${featuresDivider}
<tr><td dir="ltr" style="font-family:Inter,Arial,Helvetica,sans-serif;color:#1A1712;font-size:26px;font-weight:700;letter-spacing:-0.03em;text-align:center;padding:24px 24px 16px;line-height:1.15">${escapeHtml(heading)}</td></tr>
<tr><td dir="ltr" style="color:#1A1712;font-size:17px;line-height:1.5;text-align:center;padding:0 24px 20px;font-family:Inter,Arial,Helvetica,sans-serif">${bodyHtml}</td></tr>
${ctaHtml}
<tr><td style="padding:0 24px 28px">&nbsp;</td></tr>
</tbody>
</table>
</td></tr>
<!-- Footer -->
<tr><td style="vertical-align:top">
<table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" style="width:100%;background-color:#1A1712">
<tbody>
<tr><td style="text-align:left;padding:28px 32px">
<table border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:522px;margin:0 auto">
<tbody>
<tr><td dir="ltr" style="font-family:Inter,Arial,Helvetica,sans-serif;color:#FAF8F3;font-size:18px;font-weight:700;letter-spacing:-0.01em;text-align:left;padding:0 0 12px;line-height:1.2">Need help?</td></tr>
<tr><td dir="ltr" style="color:#FAF8F3;font-size:15px;line-height:1.5;text-align:left;padding:0 0 12px;font-family:Inter,Arial,Helvetica,sans-serif"><span>Reply to this email or write to </span><a href="mailto:${escapeAttr(CONTACT_EMAIL)}" style="color:#FAF8F3;font-weight:700;text-decoration:underline">${escapeHtml(CONTACT_EMAIL)}</a><span>.</span></td></tr>
<tr><td dir="ltr" style="color:#8A8175;font-size:13px;line-height:1.4;text-align:left;padding-top:4px;font-family:Inter,Arial,Helvetica,sans-serif"><span>This is an automated email from ${escapeHtml(APP_NAME)}. No reply is expected.</span></td></tr>
</tbody>
</table>
</td></tr>
</tbody>
</table>
</td></tr>
</tbody>
</table>
</td></tr>
</tbody>
</table>
</body>
</html>`;
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
