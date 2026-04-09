import nodemailer from 'nodemailer';
import { buildLoginMailTemplate } from './mailtemplate.js';

type LoginMailParams = {
  to: string;
  name?: string | null;
  role?: string;
};

export async function sendLoginMail({ to, name, role }: LoginMailParams) {
  const email = process.env.EMAIL;
  const password = process.env.EMAILPASSWORD;
  const fromAddress = process.env.MAIL_FROM_ADDRESS || email;
  const fromName = process.env.MAIL_FROM_NAME || 'ZeroCrush Events';

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
