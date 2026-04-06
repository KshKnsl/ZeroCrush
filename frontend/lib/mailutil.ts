import fs from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';

type LoginMailParams = {
  to: string;
  name?: string | null;
  role?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function sendLoginMail({ to, name, role }: LoginMailParams) {
  const email = process.env.EMAIL;
  const password = process.env.EMAILPASSWORD;
  const fromAddress = process.env.MAIL_FROM_ADDRESS || email;
  const fromName = process.env.MAIL_FROM_NAME || 'ZeroCrush Events';

  const template = await fs.readFile(path.join(process.cwd(), 'public', 'mailtemplate.html'), 'utf8');
  const now = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });

  const replacements: Record<string, string> = {
    '{{name}}': escapeHtml(name?.trim() || 'User'),
    '{{email}}': escapeHtml(to),
    '{{role}}': escapeHtml(role || 'N/A'),
    '{{time}}': escapeHtml(now),
    '{{app}}': escapeHtml(fromName),
  };

  const html = Object.entries(replacements).reduce((content, [key, value]) => {
    return content.replaceAll(key, value);
  }, template);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: email, pass: password },
  });

  await transporter.sendMail({
    from: `${fromName} <${fromAddress}>`,
    to,
    subject: `${fromName} login alert`,
    html,
  });
}
