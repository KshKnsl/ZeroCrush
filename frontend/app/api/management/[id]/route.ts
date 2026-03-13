import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { normalizeVenueRole } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const accountId = Number(params.id);
    const body = await request.json();
    const role = normalizeVenueRole(body.role);

    if (!Number.isFinite(accountId) || accountId <= 0) {
      return NextResponse.json({ error: 'Invalid account id.' }, { status: 400 });
    }

    const account = await prisma.managementAccount.update({
      where: { id: accountId },
      data: { role },
      select: {
        id: true,
        loginId: true,
        password: true,
        role: true,
        createdAt: true,
        eventId: true,
      },
    });

    return NextResponse.json({ success: true, account });
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
