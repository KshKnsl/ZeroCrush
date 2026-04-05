import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { canManageEvents, type UserRole } from '@/lib/auth';

function getCallerRole(request: NextRequest): UserRole | null {
  const role = request.headers.get('x-user-role');
  if (role === 'ADMIN' || role === 'OPERATOR' || role === 'VIEWER') {
    return role;
  }
  return null;
}

export async function GET() {
  try {
    const rawEvents = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { registrations: true } },
      },
    });

    const events = rawEvents.map((event) => ({
      id: event.id,
      name: event.name,
      description: event.description,
      location: event.location,
      date: event.date,
      capacity: event.capacity,
      createdAt: event.createdAt,
      registrationsCount: event._count.registrations,
    }));

    return NextResponse.json({ events });
  } catch (error) {
    console.error('[api/events][GET]', error);
    return NextResponse.json({ error: 'Failed to fetch events.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = getCallerRole(request);
    if (!canManageEvents(role ?? undefined)) {
      return NextResponse.json({ error: 'Operator or admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const name = body.name?.toString().trim();
    const location = body.location?.toString().trim() || null;
    const description = body.description?.toString().trim() || null;
    const capacity = body.capacity ? parseInt(body.capacity, 10) : 0;
    const date = body.date ? new Date(body.date) : new Date(Date.now() + 86400000);

    if (!name) {
      return NextResponse.json({ error: 'Event name is required.' }, { status: 400 });
    }

    const eventRecord = await prisma.event.create({
      data: {
        name,
        location,
        description,
        capacity,
        date,
      },
      include: {
        _count: { select: { registrations: true } },
      },
    });

    return NextResponse.json({
      event: {
        id: eventRecord.id,
        name: eventRecord.name,
        description: eventRecord.description,
        location: eventRecord.location,
        date: eventRecord.date,
        capacity: eventRecord.capacity,
        createdAt: eventRecord.createdAt,
        registrationsCount: eventRecord._count.registrations,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[api/events][POST]', error);
    return NextResponse.json({ error: 'Failed to create event.' }, { status: 500 });
  }
}
