import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getRequestAuth } from '@/lib/server-auth';
import type { Prisma } from '@prisma/client';

function parseDateValue(value: unknown, fieldName: string): Date {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return date;
}

function parseNumberValue(value: unknown, fieldName: string): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return number;
}

function normalizeSessionData(body: Record<string, unknown>): Prisma.SessionCreateInput {
  return {
    ...body,
    startTime: parseDateValue(body.startTime, 'startTime'),
    endTime: parseDateValue(body.endTime, 'endTime'),
    videoFps: parseNumberValue(body.videoFps, 'videoFps'),
    processedFrameSize: parseNumberValue(body.processedFrameSize, 'processedFrameSize'),
    trackMaxAge: parseNumberValue(body.trackMaxAge, 'trackMaxAge'),
  } as Prisma.SessionCreateInput;
}

function parseSessionId(request: NextRequest): string | null {
  return request.nextUrl.searchParams.get('id');
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }
    const id = parseSessionId(request);
    if (id) 
    {
      const session = await prisma.session.findUnique({ where: { id } });
      if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(session);
    }

    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      items: sessions,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sessions', details: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const session = await prisma.session.create({ data: normalizeSessionData(body) });

    return NextResponse.json({ success: true, session }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid ')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to save session', details: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getRequestAuth(request);
    const id = parseSessionId(request);
    if (!auth || !id) {
      return NextResponse.json({ error: 'Authentication required or id missing' }, { status: 401 });
    }
    await prisma.session.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete session', details: String(error) }, { status: 500 });
  }
}
