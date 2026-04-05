import nodemailer from "nodemailer";
import mailTemplate from "@/public/mailTemplate.json";

type MailTemplateKey = "verification" | "entry_success";

interface MailTemplateRecord {
  subject: string;
  text: string;
  html: string;
}

interface MailTemplateSchema {
  templates: Record<MailTemplateKey, MailTemplateRecord>;
}

const templates = (mailTemplate as MailTemplateSchema).templates;

function getMailCredentials() {
  const user = process.env.EMAIL ?? process.env.SMTP_USER ?? "";
  const pass =
    process.env.EMAILPASSWORD ??
    process.env.EMAIL_PASSWORD ??
    "";

  if (!user || !pass) {
    throw new Error(
      "Mail credentials are missing. Set EMAIL and EMAILPASSWORD in environment variables."
    );
  }

  return { user, pass };
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface SendVerificationParams {
  to: string;
  name: string;
  eventType: string;
  eventDescription?: string | null;
  code: string;
}

interface SendEntrySuccessParams {
  to: string;
  name: string;
  eventType: string;
  verifiedAt: Date;
  gateNumber?: number | null;
}

function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    return values[key] ?? "";
  });
}

function getTemplate(key: MailTemplateKey): MailTemplateRecord {
  const template = templates[key];

  if (!template) {
    throw new Error(`Missing mail template: ${key}`);
  }

  return template;
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
  const { user, pass } = getMailCredentials();
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });

  const displayName = name || to;
  const qrData = encodeURIComponent(`${to}|${code}`);
  const fromName = process.env.MAIL_FROM_NAME || "ZeroCrush Events";
  const fromAddress = process.env.MAIL_FROM_ADDRESS || user;
  const template = getTemplate("verification");

  const variables = {
    to,
    name: displayName,
    eventType,
    eventDescription: eventDescription ?? "",
    code,
    qrData,
    fromName,
    fromAddress,
  };

  await transporter.sendMail({
    from: `${fromName} <${fromAddress}>`,
    to,
    subject: renderTemplate(template.subject, variables),
    text: renderTemplate(template.text, variables).trim(),
    html: renderTemplate(template.html, variables).trim(),
  });
}

export async function sendEntrySuccessEmail({
  to,
  name,
  eventType,
  verifiedAt,
  gateNumber,
}: SendEntrySuccessParams): Promise<void> {
  const { user, pass } = getMailCredentials();
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });

  const displayName = name || to;
  const fromName = process.env.MAIL_FROM_NAME || "ZeroCrush Events";
  const fromAddress = process.env.MAIL_FROM_ADDRESS || user;
  const verifiedTime = verifiedAt.toLocaleString("en-US", { hour12: false });
  const template = getTemplate("entry_success");

  const variables = {
    to,
    name: displayName,
    eventType,
    verifiedAt: verifiedAt.toISOString(),
    verifiedTime,
    gateNumber: gateNumber ? String(gateNumber) : "N/A",
    fromName,
    fromAddress,
  };

  await transporter.sendMail({
    from: `${fromName} <${fromAddress}>`,
    to,
    subject: renderTemplate(template.subject, variables),
    text: renderTemplate(template.text, variables).trim(),
    html: renderTemplate(template.html, variables).trim(),
  });
}