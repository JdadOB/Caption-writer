import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM || "Creator Dashboard <onboarding@resend.dev>";
const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

const resend = apiKey ? new Resend(apiKey) : null;

type EmailPayload = {
  to: string;
  subject: string;
  heading: string;
  message: string;
  ctaLabel?: string;
  ctaPath?: string;
};

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!resend) return;
  const ctaHref = payload.ctaPath ? `${baseUrl}${payload.ctaPath}` : null;
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f5f9ff;border-radius:12px;">
      <h1 style="color:#0b1f3a;font-size:20px;margin:0 0 12px;">${escapeHtml(payload.heading)}</h1>
      <p style="color:#3b4a66;font-size:15px;line-height:1.5;margin:0 0 18px;">${escapeHtml(payload.message)}</p>
      ${
        ctaHref
          ? `<a href="${ctaHref}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;">${escapeHtml(payload.ctaLabel || "Open")}</a>`
          : ""
      }
      <p style="color:#7c8aa1;font-size:12px;margin-top:24px;">Caption Writer · Creator Dashboard</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      html,
    });
  } catch (err) {
    console.error("Failed to send email", err);
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
