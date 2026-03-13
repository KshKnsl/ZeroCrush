import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const eventId = Number(body.eventId);
    const loginId = body.loginId?.toString().trim();
    const password = body.password?.toString().trim();

    if (!Number.isFinite(eventId) || eventId <= 0 || !loginId || !password) {
      return NextResponse.json({ error: 'eventId, loginId, and password are required.' }, { status: 400 });
    }

    const account = await prisma.managementAccount.findUnique({
      where: { eventId_loginId: { eventId, loginId } },
      select: {
        id: true,
        loginId: true,
        password: true,
        allowedTabs: true,
        eventId: true,
        event: {
          select: {
            id: true,
            type: true,
          },
        },
      },
    });

    if (!account || account.password !== password) {
      return NextResponse.json({ error: 'Invalid management credentials for this event.' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        loginId: account.loginId,
        allowedTabs: account.allowedTabs,
        eventId: account.eventId,
        eventName: account.event.type,
      },
    });
  } catch (error) {
    console.error('[api/auth/management][POST]', error);
    return NextResponse.json({ error: 'Failed to authenticate management account.' }, { status: 500 });
  }
}
