import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id: rawId } = await context.params;
    const eventId = Number(rawId);

    if (!Number.isFinite(eventId) || eventId <= 0) {
      return NextResponse.json({ error: 'Valid eventId is required.' }, { status: 400 });
    }

    const registrations = await prisma.registration.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        attendeeName: true,
        attendeeEmail: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      attendees: registrations.map((registration) => ({
        id: registration.id,
        name: registration.attendeeName,
        email: registration.attendeeEmail,
        registeredAt: registration.createdAt,
      })),
      totalRegistered: await prisma.registration.count({ where: { eventId } }),
    });
  } catch (error) {
    console.error('[api/events/[id]/attendees][GET]', error);
    return NextResponse.json({ error: 'Failed to fetch attendees.' }, { status: 500 });
  }
}
