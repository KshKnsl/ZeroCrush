import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ eventId: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { eventId: rawEventId } = await context.params;
    const eventId = Number(rawEventId);

    if (!Number.isFinite(eventId) || eventId <= 0) {
      return NextResponse.json({ error: 'Valid eventId is required.' }, { status: 400 });
    }

    const selectedEvent = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, type: true, plate: true, description: true },
    });

    if (!selectedEvent) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    const whereClause = {
      type: selectedEvent.type,
      plate: selectedEvent.plate,
      description: selectedEvent.description,
      userId: { not: null as number | null },
    };

    const [distinctUsers, attendeesRaw] = await Promise.all([
      prisma.event.findMany({
        where: whereClause,
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.event.findMany({
        where: whereClause,
        select: {
          userId: true,
          timestamp: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        distinct: ['userId'],
        orderBy: { timestamp: 'desc' },
        take: 10,
      }),
    ]);

    const attendees = attendeesRaw
      .map((row) => {
        if (!row.user || row.userId === null) return null;
        return {
          id: row.user.id,
          name: row.user.name,
          email: row.user.email,
          registeredAt: row.timestamp,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    return NextResponse.json({
      attendees,
      totalRegistered: distinctUsers.length,
    });
  } catch (error) {
    console.error('[api/events/[eventId]/attendees][GET]', error);
    return NextResponse.json({ error: 'Failed to fetch attendees.' }, { status: 500 });
  }
}
