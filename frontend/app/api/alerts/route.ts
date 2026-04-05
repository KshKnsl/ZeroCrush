import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import prisma from '@/lib/prisma';

type IncidentType = 'VIOLENCE' | 'RESTRICTED_ZONE' | 'ABNORMAL' | 'MANUAL';

function mapIncidentType(rawType: string): IncidentType {
  const t = rawType.toLowerCase();
  if (t.includes('violence') || t.includes('fight')) return 'VIOLENCE';
  if (t.includes('restrict') || t.includes('zone')) return 'RESTRICTED_ZONE';
  if (t.includes('abnormal') || t.includes('stampede')) return 'ABNORMAL';
  return 'MANUAL';
}

export async function POST(r: Request) {
  try {
    const b = await r.json();
    
    // Log incident in the DB
    try {
      await prisma.incident.create({
        data: {
          type: mapIncidentType(b.type || ''),
          description: b.message || 'Automated AI pipeline alert',
          source: 'webhook',
          status: 'OPEN',
        }
      });
    } catch (dbErr) {
      console.error('Failed to log incident to Prisma:', dbErr);
    }

    const u = process.env.EMAIL || process.env.SMTP_USER || "";
    const p = process.env.EMAILPASSWORD || process.env.EMAIL_PASSWORD || "";
    if(!u || !p) return NextResponse.json({ e: 1 }, { status: 500 });
    const t = nodemailer.createTransport({ service: "gmail", auth: { user: u, pass: p } });
    await t.sendMail({
      from: process.env.MAIL_FROM_ADDRESS || u,
      to: b.email || u,
      subject: `Alert: ${b.type}`,
      text: b.message,
    });
    return NextResponse.json({ ok: 1 });
  } catch (e) {
    return NextResponse.json({ e: 1 }, { status: 500 });
  }
}
