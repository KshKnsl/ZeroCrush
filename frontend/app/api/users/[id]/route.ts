import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { canManageUsers, type UserRole } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

function getCallerRole(request: NextRequest): UserRole | null {
  const role = request.headers.get('x-user-role');
  if (role === 'ADMIN' || role === 'OPERATOR' || role === 'VIEWER') {
    return role;
  }
  return null;
}

function getCallerId(request: NextRequest): number | null {
  const raw = request.headers.get('x-user-id');
  const id = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(id) ? id : null;
}

async function countOtherAdmins(excludeUserId: number) {
  return prisma.user.count({
    where: { role: 'ADMIN', id: { not: excludeUserId } },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = getCallerRole(request);
    if (!canManageUsers(role ?? undefined)) {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }

    const callerId = getCallerId(request);
    const targetId = Number((await params).id);
    if (!Number.isFinite(targetId) || targetId <= 0) {
      return NextResponse.json({ error: 'Invalid user id.' }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, name: true, email: true, password: true, role: true, createdAt: true },
    });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (callerId !== null && callerId === targetId) {
      return NextResponse.json({ error: 'You cannot modify your own account with this action.' }, { status: 400 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.name === 'string') {
      updates.name = body.name.trim() || null;
    }

    if (typeof body.password === 'string' && body.password.trim()) {
      updates.password = hashPassword(body.password.trim());
    }

    if (typeof body.role === 'string') {
      if (!['ADMIN', 'OPERATOR', 'VIEWER'].includes(body.role)) {
        return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
      }

      if (currentUser.role === 'ADMIN' && body.role !== 'ADMIN') {
        const remainingAdmins = await countOtherAdmins(targetId);
        if (remainingAdmins === 0) {
          return NextResponse.json({ error: 'At least one admin account must remain.' }, { status: 400 });
        }
      }

      updates.role = body.role;
    }

    const user = await prisma.user.update({
      where: { id: targetId },
      data: updates,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = getCallerRole(request);
    if (!canManageUsers(role ?? undefined)) {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }

    const callerId = getCallerId(request);
    const pId = parseInt((await params).id, 10);
    if (!pId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    if (callerId !== null && callerId === pId) {
      return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id: pId },
      select: { id: true, name: true, email: true, password: true, role: true, createdAt: true },
    });
    if (!target) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (target.role === 'ADMIN') {
      const remainingAdmins = await countOtherAdmins(pId);
      if (remainingAdmins === 0) {
        return NextResponse.json({ error: 'At least one admin account must remain.' }, { status: 400 });
      }
    }

    await prisma.user.delete({
      where: { id: pId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
