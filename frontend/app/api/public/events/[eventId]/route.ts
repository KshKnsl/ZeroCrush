import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const id = parseInt((await params).eventId, 10);
    if (!id) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const event = await prisma.event.findUnique({
      where: { id },
      include: { _count: { select: { registrations: true } } }
    });

    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const checkedInCount = await prisma.registration.count({
      where: { eventId: event.id, checkedIn: true },
    });

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        location: event.location,
        date: event.date,
        capacity: event.capacity,
        registrationsCount: event._count.registrations,
        checkedInCount,
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
