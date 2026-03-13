import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/events/verify
// Body: { email: string; code: string }
//
// Looks up the most recent unverified Event row for this user that matches
// the code, marks it verified, and returns the event details.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email?.toString().trim().toLowerCase();
    const code  = body.code?.toString().trim().toUpperCase();
    const rawGateNumber = body.gateNumber;
    const gateNumber = rawGateNumber === undefined || rawGateNumber === null || rawGateNumber === ''
      ? null
      : Number(rawGateNumber);

    if (!email || !code) {
      return NextResponse.json(
        { error: "email and code are required." },
        { status: 400 }
      );
    }

    if (gateNumber !== null && (!Number.isFinite(gateNumber) || gateNumber <= 0)) {
      return NextResponse.json({ error: 'gateNumber must be a positive number.' }, { status: 400 });
    }

    // Find the user
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json(
        { error: "No registration found for this email." },
        { status: 404 }
      );
    }

    // Find a matching unverified event for this user
    const event = await prisma.event.findFirst({
      where: {
        userId:           user.id,
        verificationCode: code,
        verified:         false,
      },
      orderBy: { timestamp: "desc" },
    });

    if (!event) {
      // Give a specific message if already verified vs. wrong code
      const alreadyVerified = await prisma.event.findFirst({
        where: {
          userId:           user.id,
          verificationCode: code,
          verified:         true,
        },
      });

      if (alreadyVerified) {
        return NextResponse.json(
          {
            error: "This code has already been used.",
            verifiedAt: alreadyVerified.verifiedAt,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Invalid code. Please check and try again." },
        { status: 401 }
      );
    }

    // Mark as verified
    const verified = await prisma.event.update({
      where: { id: event.id },
      data:  { verified: true, verifiedAt: new Date() },
    });

    return NextResponse.json({
      success:    true,
      message:    `Welcome, ${user.name || user.email}!`,
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email,
      },
      event: {
        id:          verified.id,
        type:        verified.type,
        description: verified.description,
        plate:       verified.plate,
        verifiedAt:  verified.verifiedAt,
        gateNumber,
      },
    });
  } catch (err) {
    console.error("[events/verify]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}