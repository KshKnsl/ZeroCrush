import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Types ─────────────────────────────────────────────────────────────────────
interface SendVerificationParams {
  to: string;
  name: string;
  eventType: string;
  eventDescription?: string | null;
  code: string;
}

// ── Generate a random 6-char alphanumeric code ────────────────────────────────
export function generateVerificationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

// ── Send verification email ───────────────────────────────────────────────────
export async function sendVerificationEmail({
  to,
  name,
  eventType,
  eventDescription,
  code,
}: SendVerificationParams): Promise<void> {
  const displayName = name || to;
  const fromName    = process.env.MAIL_FROM_NAME || "Events Team";
  const fromAddress = process.env.MAIL_FROM_ADDRESS || "onboarding@resend.dev";
  const qrData      = encodeURIComponent(`${to}|${code}`);

  const { error } = await resend.emails.send({
    from:    `${fromName} <${fromAddress}>`,
    to,
    subject: `Your entry code for ${eventType}`,

    text: `
Hi ${displayName},

You're registered for: ${eventType}
${eventDescription ? `\n${eventDescription}\n` : ""}
Your entry verification code is:

  ${code}

Show this code at the event entrance to be verified.

See you there!
    `.trim(),

    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'DM Sans',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#fffdf7;border-radius:16px;border:1px solid #e8e0d0;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#2a2218;padding:32px 40px;">
              <p style="margin:0;color:#c8b89a;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Event Registration</p>
              <h1 style="margin:8px 0 0;color:#f5f0e8;font-size:22px;font-weight:600;">${eventType}</h1>
              ${eventDescription ? `<p style="margin:8px 0 0;color:#a09080;font-size:13px;">${eventDescription}</p>` : ""}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 24px;color:#6a5d4d;font-size:15px;line-height:1.6;">
                Hi <strong style="color:#2a2218;">${displayName}</strong>, you're confirmed for this event.
                Present the code below at the entrance to check in.
              </p>

              <!-- Code + QR block -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background:#f3ede1;border:1.5px dashed #c8b89a;border-radius:12px;padding:28px 20px;">
                    <p style="margin:0 0 16px;color:#9a8d7c;font-size:11px;letter-spacing:3px;text-transform:uppercase;">Your Entry Code</p>
                    <img
                      src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${qrData}&bgcolor=f3ede1&color=2a2218&margin=4"
                      alt="QR Code"
                      width="160"
                      height="160"
                      style="border-radius:8px;display:block;margin:0 auto 16px;"
                    />
                    <p style="margin:0;color:#2a2218;font-size:32px;font-weight:700;letter-spacing:10px;font-family:'Courier New',monospace;">${code}</p>
                    <p style="margin:8px 0 0;color:#9a8d7c;font-size:11px;">Scan QR or enter code manually at the gate</p>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;color:#b8ac9c;font-size:12px;line-height:1.6;text-align:center;">
                Keep this code safe. It is unique to you and required for entry.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f5ed;border-top:1px solid #e8e0d0;padding:20px 40px;">
              <p style="margin:0;color:#b8ac9c;font-size:11px;text-align:center;">
                If you didn't register for this event, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });

  if (error) throw new Error(error.message);
}