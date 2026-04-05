import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEntrySuccessEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const RESCAN_GRACE_MS = 30 * 1000;
    const body = await req.json();
    const token = body.token?.toString().trim().toUpperCase();
    const rawGateNumber = body.gateNumber;
    const gateNumber = rawGateNumber === undefined || rawGateNumber === null || rawGateNumber === ''
      ? null
      : Number(rawGateNumber);

    if (!token) {
      return NextResponse.json({ error: 'token is required.' }, { status: 400 });
    }

    if (gateNumber !== null && (!Number.isFinite(gateNumber) || gateNumber <= 0)) {
      return NextResponse.json({ error: 'gateNumber must be a positive number.' }, { status: 400 });
    }

    const registration = await prisma.registration.findUnique({
      where: { token },
      include: { event: true },
    });

    if (!registration) {
      return NextResponse.json({ error: 'Invalid token. Please check and try again.' }, { status: 401 });
    }

    if (registration.checkedIn) {
      const checkedInAtMs = registration.checkedInAt ? new Date(registration.checkedInAt).getTime() : 0;
      const withinGraceWindow = checkedInAtMs > 0 && Date.now() - checkedInAtMs <= RESCAN_GRACE_MS;

      if (withinGraceWindow) {
        return NextResponse.json({
          success: true,
          message: `Re-scan accepted for ${registration.attendeeName}.`,
          registration: {
            id: registration.id,
            attendeeName: registration.attendeeName,
            attendeeEmail: registration.attendeeEmail,
            token: registration.token,
            checkedInAt: registration.checkedInAt,
          },
          event: {
            id: registration.event.id,
            name: registration.event.name,
            description: registration.event.description,
            location: registration.event.location,
            checkedInAt: registration.checkedInAt,
            gateNumber,
          },
          duplicate: true,
        });
      }

      return NextResponse.json(
        { error: 'This token has already been used.', checkedInAt: registration.checkedInAt },
        { status: 409 }
      );
    }

    const checkedIn = await prisma.registration.update({
      where: { id: registration.id },
      data: { checkedIn: true, checkedInAt: new Date() },
    });

    sendEntrySuccessEmail({
      to: checkedIn.attendeeEmail,
      name: checkedIn.attendeeName,
      eventType: registration.event.name,
      verifiedAt: checkedIn.checkedInAt ?? new Date(),
      gateNumber,
    }).catch((mailErr) => {
      console.error(`[qrtokens/verify] success mail failed for ${checkedIn.attendeeEmail}:`, mailErr);
    });

    return NextResponse.json({
      success: true,
      message: `Welcome, ${checkedIn.attendeeName}!`,
      registration: {
        id: checkedIn.id,
        attendeeName: checkedIn.attendeeName,
        attendeeEmail: checkedIn.attendeeEmail,
        token: checkedIn.token,
        checkedInAt: checkedIn.checkedInAt,
      },
      event: {
        id: registration.event.id,
        name: registration.event.name,
        description: registration.event.description,
        location: registration.event.location,
        checkedInAt: checkedIn.checkedInAt,
        gateNumber,
      },
    });
  } catch (err) {
    console.error('[qrtokens/verify]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}