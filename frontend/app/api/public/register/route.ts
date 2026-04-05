import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateVerificationCode, sendVerificationEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const { name, email, eventId } = await req.json();

    if (!name || !email || !eventId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id: parseInt(eventId, 10) },
      include: { _count: { select: { registrations: true } } }
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.capacity > 0 && event._count.registrations >= event.capacity) {
      return NextResponse.json({ error: "Event has reached maximum capacity" }, { status: 403 });
    }

    const existingReg = await prisma.registration.findFirst({
      where: { eventId: event.id, attendeeEmail: email.toLowerCase() }
    });

    if (existingReg) {
      return NextResponse.json({ error: "You are already registered for this event" }, { status: 400 });
    }

    let token = generateVerificationCode();
    while (await prisma.registration.findUnique({ where: { token } })) {
      token = generateVerificationCode();
    }

    await prisma.registration.create({
      data: {
        eventId: event.id,
        attendeeName: name,
        attendeeEmail: email.toLowerCase(),
        token,
      }
    });

    await sendVerificationEmail({
      to: email,
      name,
      eventType: event.name,
      eventDescription: event.description,
      code: token,
    });

    return NextResponse.json({ success: true, token });
  } catch (error) {
    console.error("[public/register]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
