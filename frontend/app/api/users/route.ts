import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getRequestAuth } from '@/lib/server-auth';

function getUserIdFromQuery(request: NextRequest): number | null {
  const id = Number(request.nextUrl.searchParams.get('id'));
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function validateAdminDeletion(role: string, userId: number): Promise<void> {
  if (role === 'ADMIN') {
    const count = await prisma.user.count({
      where: { role: 'ADMIN', id: { not: userId } },
    });
    if (count === 0) throw new Error('At least one admin must remain');
  }
}

export const GET = async (request: NextRequest) => {
  try {
    const auth = await getRequestAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const auth = await getRequestAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, email, password, role } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return NextResponse.json({ error: 'Email exists' }, { status: 400 });

    const user = await prisma.user.create({
      data: { name: name?.trim() || null, email: email.toLowerCase(), password, role },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const PATCH = async (request: NextRequest) => {
  try {
    const auth = await getRequestAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const targetUserId = getUserIdFromQuery(request);
    if (!targetUserId || auth.userId === targetUserId) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { name, password, role } = await request.json();
    const updates: Record<string, any> = {};

    if (typeof name === 'string') updates.name = name.trim() || null;
    if (typeof password === 'string' && password) updates.password = password;
    if (role) {
      await validateAdminDeletion(user.role, targetUserId);
      updates.role = role;
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: updates,
    });
    return NextResponse.json({ user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const DELETE = async (request: NextRequest) => {
  try {
    const auth = await getRequestAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const targetUserId = getUserIdFromQuery(request);
    if (!targetUserId || auth.userId === targetUserId) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await validateAdminDeletion(user.role, targetUserId);
    await prisma.user.delete({ where: { id: targetUserId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
