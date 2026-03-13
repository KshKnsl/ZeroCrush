import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { normalizeVenueRole, parseGateNumberFromAllowedTabs, withGateAssignment } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const accountId = Number(params.id);
    const body = await request.json();
    const role = normalizeVenueRole(body.role);
    const rawGateNumber = body.gateNumber;
    const gateNumber = rawGateNumber === null || rawGateNumber === undefined || rawGateNumber === ''
      ? null
      : Number(rawGateNumber);

    if (!Number.isFinite(accountId) || accountId <= 0) {
      return NextResponse.json({ error: 'Invalid account id.' }, { status: 400 });
    }

    if (gateNumber !== null && (!Number.isFinite(gateNumber) || gateNumber <= 0)) {
      return NextResponse.json({ error: 'gateNumber must be a positive number.' }, { status: 400 });
    }

    const existing = await prisma.managementAccount.findUnique({
      where: { id: accountId },
      select: { allowedTabs: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Management account not found.' }, { status: 404 });
    }

    const account = await prisma.managementAccount.update({
      where: { id: accountId },
      data: {
        role,
        allowedTabs: withGateAssignment(existing.allowedTabs, gateNumber),
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
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      return NextResponse.json(
        { error: 'Database schema is outdated. Run migrations to create ManagementAccount table.' },
        { status: 503 },
      );
    }

    console.error('[api/management/:id][PATCH]', error);
    return NextResponse.json({ error: 'Failed to update account role.' }, { status: 500 });
  }
}
