import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      where: { userId: null },
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        type: true,
        plate: true,
        description: true,
        timestamp: true,
      },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('[api/events][GET]', error);
    return NextResponse.json({ error: 'Failed to fetch events.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const type = body.type?.toString().trim();
    const plate = body.plate?.toString().trim() || null;
    const description = body.description?.toString().trim() || null;

    if (!type) {
      return NextResponse.json({ error: 'Event name is required.' }, { status: 400 });
    }

    const event = await prisma.event.create({
      data: {
        type,
        plate: plate ?? undefined,
        description: description ?? undefined,
      },
      select: {
        id: true,
        type: true,
        plate: true,
        description: true,
        timestamp: true,
      },
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    console.error('[api/events][POST]', error);
    return NextResponse.json({ error: 'Failed to create event.' }, { status: 500 });
  }
}
