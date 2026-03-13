import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAILPASSWORD,
  },
});

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
  const qrData      = encodeURIComponent(`${to}|${code}`);
  const fromName    = process.env.MAIL_FROM_NAME || "ZeroCrush Events";
  const fromAddress = process.env.MAIL_FROM_ADDRESS || process.env.EMAIL;

  await transporter.sendMail({
    from:    `${fromName} <${fromAddress}>`,
    to,
    subject: `Your QR token for ${eventType}`,

    text: `
Hi ${displayName},

You're registered for: ${eventType}
${eventDescription ? `\n${eventDescription}\n` : ""}
Your QR token verification code is:

  ${code}

Show this QR token at the event entrance to be verified.

See you there!
    `.trim(),

    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:30px 36px;">
              <p style="margin:0;color:#cbd5e1;font-size:11px;letter-spacing:2px;text-transform:uppercase;">ZeroCrush Token Issuer</p>
              <h1 style="margin:8px 0 0;color:#f8fafc;font-size:22px;font-weight:700;line-height:1.25;">${eventType}</h1>
              ${eventDescription ? `<p style="margin:10px 0 0;color:#94a3b8;font-size:13px;line-height:1.5;">${eventDescription}</p>` : ""}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:34px 36px;">
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.65;">
                Hi <strong style="color:#0f172a;">${displayName}</strong>, your token is issued for this event.
                Present the token below at the entrance to check in.
              </p>

              <!-- Code + QR block -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background:#f8fafc;border:1.5px dashed #84cc16;border-radius:12px;padding:28px 20px;">
                    <p style="margin:0 0 16px;color:#64748b;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Your QR Token</p>
                    <img
                      src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${qrData}&bgcolor=f8fafc&color=0f172a&margin=4"
                      alt="QR Code"
                      width="160"
                      height="160"
                      style="border-radius:8px;display:block;margin:0 auto 16px;"
                    />
                    <p style="margin:0;color:#0f172a;font-size:32px;font-weight:800;letter-spacing:10px;font-family:'Courier New',monospace;">${code}</p>
                    <p style="margin:8px 0 0;color:#64748b;font-size:11px;">Scan QR or enter code manually at the gate</p>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;color:#64748b;font-size:12px;line-height:1.6;text-align:center;">
                Keep this code safe. It is unique to you and required for entry.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 36px;">
              <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">
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
}