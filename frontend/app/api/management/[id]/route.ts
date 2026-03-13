import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizeManagementTabs } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const accountId = Number(params.id);
    const body = await request.json();
    const allowedTabs = normalizeManagementTabs(body.allowedTabs);

    if (!Number.isFinite(accountId) || accountId <= 0) {
      return NextResponse.json({ error: 'Invalid account id.' }, { status: 400 });
    }

    if (allowedTabs.length === 0) {
      return NextResponse.json({ error: 'Select at least one dashboard tab.' }, { status: 400 });
    }

    const account = await prisma.managementAccount.update({
      where: { id: accountId },
      data: { allowedTabs },
      select: {
        id: true,
        loginId: true,
        password: true,
        allowedTabs: true,
        createdAt: true,
        eventId: true,
      },
    });

    return NextResponse.json({ success: true, account });
  } catch (error) {
    console.error('[api/management/:id][PATCH]', error);
    return NextResponse.json({ error: 'Failed to update account access.' }, { status: 500 });
  }
}
