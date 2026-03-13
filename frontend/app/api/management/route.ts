import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { normalizeVenueRole, parseGateNumberFromAllowedTabs, withGateAssignment } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const eventId = Number(request.nextUrl.searchParams.get('eventId'));
    if (!Number.isFinite(eventId) || eventId <= 0) {
      return NextResponse.json({ error: 'Valid eventId is required.' }, { status: 400 });
    }

    const accounts = await prisma.managementAccount.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        loginId: true,
        password: true,
        role: true,
        allowedTabs: true,
        createdAt: true,
        eventId: true,
      },
    });

    return NextResponse.json({
      accounts: accounts.map((account) => ({
        ...account,
        gateNumber: parseGateNumberFromAllowedTabs(account.allowedTabs),
      })),
    });
  } catch (error) {
    console.error('[api/management][GET]', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      return NextResponse.json(
        { error: 'Database schema is outdated. Run migrations to create ManagementAccount table.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Failed to fetch management accounts.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const eventId = Number(body.eventId);
    const loginId = body.loginId?.toString().trim();
    const password = body.password?.toString().trim();
    const role = normalizeVenueRole(body.role);
    const rawGateNumber = body.gateNumber;
    const gateNumber = rawGateNumber === null || rawGateNumber === undefined || rawGateNumber === ''
      ? null
      : Number(rawGateNumber);

    if (!Number.isFinite(eventId) || eventId <= 0) {
      return NextResponse.json({ error: 'Valid eventId is required.' }, { status: 400 });
    }

    if (!loginId || !password) {
      return NextResponse.json({ error: 'Management ID and password are required.' }, { status: 400 });
    }

    if (gateNumber !== null && (!Number.isFinite(gateNumber) || gateNumber <= 0)) {
      return NextResponse.json({ error: 'gateNumber must be a positive number.' }, { status: 400 });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    const existing = await prisma.managementAccount.findUnique({
      where: { eventId_loginId: { eventId, loginId } },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: 'That management ID already exists for this event.' }, { status: 409 });
    }

    const account = await prisma.managementAccount.create({
      data: {
        eventId,
        loginId,
        password,
        role,
        allowedTabs: withGateAssignment([], gateNumber),
      },
      select: {
        id: true,
        loginId: true,
        password: true,
        role: true,
        allowedTabs: true,
        createdAt: true,
        eventId: true,
      },
    });

    return NextResponse.json({
      success: true,
      account: {
        ...account,
        gateNumber: parseGateNumberFromAllowedTabs(account.allowedTabs),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[api/management][POST]', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      return NextResponse.json(
        { error: 'Database schema is outdated. Run migrations to create ManagementAccount table.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: 'Failed to create management account.' }, { status: 500 });
  }
}
