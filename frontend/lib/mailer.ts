import 'server-only';
import nodemailer from 'nodemailer';
import { buildLoginMailTemplate } from './mailtemplate.js';

export async function sendLoginMail({ to, name, role }: { to: string; name?: string | null; role?: string }) {
  const email = process.env.EMAIL;
  const password = process.env.EMAILPASSWORD;
  const fromName = process.env.MAIL_FROM_NAME;
  const fromAddress = process.env.MAIL_FROM_ADDRESS;

  const now = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });

  const html = buildLoginMailTemplate({
    app: fromName,
    name: name?.trim() || 'User',
    email: to,
    role: role || 'N/A',
    time: now,
  });

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
